import type { SupabaseClient } from '@supabase/supabase-js'
import { describe, expect, it, vi } from 'vitest'
import { authRefusal, createSupabaseSession } from './session'

/** Fake Supabase Auth: each method answers from a script and records its arguments. */
function fakeAuth(over: Record<string, unknown> = {}, session: unknown = null) {
  const calls: Record<string, unknown[]> = {}
  const record =
    (name: string, answer: unknown) =>
    async (...args: unknown[]) => {
      calls[name] = args
      if (answer instanceof Error) throw answer
      return answer
    }
  const auth = {
    getSession: async () => ({ data: { session }, error: null }),
    signInWithPassword: record('signInWithPassword', over.signInWithPassword ?? { data: {}, error: null }),
    signUp: record('signUp', over.signUp ?? { data: {}, error: null }),
    resend: record('resend', over.resend ?? { data: {}, error: null }),
    resetPasswordForEmail: record('resetPasswordForEmail', over.resetPasswordForEmail ?? { data: {}, error: null }),
    updateUser: record('updateUser', over.updateUser ?? { data: {}, error: null }),
    signOut: record('signOut', { error: null }),
    onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
  }
  const client = { auth, rpc: async () => ({ data: null, error: null }), from: () => ({}) } as unknown as SupabaseClient
  return { port: createSupabaseSession(client), calls, auth }
}

const err = (code: string, status = 400) => ({ data: {}, error: { code, status, message: code } })

describe('Supabase auth errors → what the screen may say', () => {
  it('maps codes without revealing which field was wrong or whether an account exists', () => {
    expect(authRefusal({ code: 'invalid_credentials', status: 400 })).toBe('invalid_credentials')
    expect(authRefusal({ code: 'email_not_confirmed', status: 400 })).toBe('email_not_confirmed')
    expect(authRefusal({ code: 'over_request_rate_limit', status: 429 })).toBe('rate_limited')
    expect(authRefusal({ code: 'anything', status: 429 })).toBe('rate_limited')
    expect(authRefusal({ code: 'weak_password', status: 422 })).toBe('weak_password')
    expect(authRefusal({ code: 'session_not_found', status: 403 })).toBe('invalid_link')
    expect(authRefusal({ code: 'unexpected_failure', status: 500 })).toBe('unavailable')
  })
})

describe('Supabase session adapter: auth', () => {
  it('a wrong password is refused; a thrown request is "unavailable", never a crash', async () => {
    expect(await fakeAuth({ signInWithPassword: err('invalid_credentials') }).port.signIn({ email: 'a@x.test', password: 'p' })).toEqual({
      kind: 'refused',
      reason: 'invalid_credentials',
    })
    expect(await fakeAuth({ signInWithPassword: new Error('offline') }).port.signIn({ email: 'a@x.test', password: 'p' })).toEqual({
      kind: 'refused',
      reason: 'unavailable',
    })
  })

  it('registers with the profile and consent data the server trigger reads, and a verify link back to the app', async () => {
    const f = fakeAuth()
    await f.port.register({ fullName: ' Demo Person ', email: ' p@x.test ', organisation: '', password: 'a long enough password', consentVersion: 'v1' })
    expect(f.calls.signUp?.[0]).toEqual({
      email: 'p@x.test',
      password: 'a long enough password',
      options: {
        data: { full_name: 'Demo Person', organisation: null, consent_version: 'v1' },
        emailRedirectTo: `${window.location.origin}/auth/sign-in?verified=1`,
      },
    })
  })

  it('an existing account looks like success (no enumeration); a weak password is refused', async () => {
    const input = { fullName: 'A', email: 'p@x.test', password: 'x'.repeat(12), consentVersion: 'v1' }
    expect(await fakeAuth({ signUp: err('user_already_exists', 422) }).port.register(input)).toEqual({ kind: 'ok', data: null })
    expect(await fakeAuth({ signUp: err('weak_password', 422) }).port.register(input)).toEqual({ kind: 'refused', reason: 'weak_password' })
  })

  it('a reset request is neutral, except for "slow down" and "unreachable"', async () => {
    expect(await fakeAuth({ resetPasswordForEmail: err('user_not_found', 404) }).port.requestPasswordReset('n@x.test')).toEqual({ kind: 'ok', data: null })
    expect(await fakeAuth({ resetPasswordForEmail: err('over_email_send_rate_limit', 429) }).port.requestPasswordReset('n@x.test')).toEqual({
      kind: 'refused',
      reason: 'rate_limited',
    })
    const f = fakeAuth()
    await f.port.requestPasswordReset('n@x.test')
    expect(f.calls.resetPasswordForEmail?.[1]).toEqual({ redirectTo: `${window.location.origin}/auth/reset` })
  })

  it('a new password needs the recovery session from the link', async () => {
    const without = fakeAuth()
    expect(await without.port.updatePassword('x'.repeat(12))).toEqual({ kind: 'refused', reason: 'invalid_link' })
    expect(without.calls.updateUser).toBeUndefined()
    const withSession = fakeAuth({}, { user: { id: 'u1' } })
    expect(await withSession.port.updatePassword('x'.repeat(12))).toEqual({ kind: 'ok', data: null })
  })

  it('signs out this browser only, even when the server cannot be reached', async () => {
    const f = fakeAuth()
    await f.port.signOut()
    expect(f.calls.signOut?.[0]).toEqual({ scope: 'local' })
  })

  it('reports auth changes outside the Supabase callback, and unsubscribes', async () => {
    const f = fakeAuth()
    const listener = vi.fn()
    const stop = f.port.onChange?.(listener)
    const callback = (f.auth.onAuthStateChange.mock.calls[0] as unknown as [(event: string) => void])[0]
    callback('SIGNED_OUT')
    callback('TOKEN_REFRESHED')
    expect(listener).not.toHaveBeenCalled()
    await new Promise((r) => setTimeout(r, 0))
    expect(listener).toHaveBeenCalledTimes(1)
    expect(listener).toHaveBeenCalledWith('signed_out')
    stop?.()
  })
})

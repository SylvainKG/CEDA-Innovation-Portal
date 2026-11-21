import type { AuthError, SupabaseClient } from '@supabase/supabase-js'
import { ApiError } from '../errors'
import type { SessionPort } from '../session'
import { ROLES, type AuthChange, type AuthOutcome, type AuthRefusal, type Role, type SessionUser } from '../types'

/**
 * Supabase session adapter. Identity comes from Supabase Auth; roles come from `my_access()` (contract §2),
 * which the server computes from `user_roles`. The roles only shape navigation: every permission is still
 * enforced by RLS and the RPC checks, so a tampered client gains nothing.
 *
 * Auth errors are reduced to what the screen may say (spec T02): never which of email or password was wrong,
 * and never whether an account exists. Supabase already hides existing accounts on sign-up when email
 * confirmation is on; `user_already_exists` is treated as success too, in case that setting changes.
 */
interface MyAccess {
  user_id: string
  is_demo: boolean
  roles: string[]
}

function isRole(value: unknown): value is Role {
  return typeof value === 'string' && (ROLES as readonly string[]).includes(value)
}

const ok = <T,>(data: T): AuthOutcome<T> => ({ kind: 'ok', data })
const no = (reason: AuthRefusal): AuthOutcome<never> => ({ kind: 'refused', reason })

/** Map a Supabase Auth error to a reason the screen may show. */
export function authRefusal(error: Pick<AuthError, 'code' | 'status'> | { code?: string; status?: number }): AuthRefusal {
  const code = error.code ?? ''
  if (error.status === 429 || code.startsWith('over_') || code === 'too_many_requests') return 'rate_limited'
  if (code === 'invalid_credentials') return 'invalid_credentials'
  if (code === 'email_not_confirmed') return 'email_not_confirmed'
  if (code === 'weak_password' || code === 'same_password') return 'weak_password'
  if (code === 'session_not_found' || code === 'otp_expired' || code === 'flow_state_expired' || error.status === 401)
    return 'invalid_link'
  return 'unavailable'
}

/**
 * For requests that must look the same whether or not the account exists (resend, password reset): only
 * "slow down" and a server or network failure are reported. Any other refusal, such as an unknown user,
 * reads as success, so the answer never reveals who has an account.
 */
function neutral(error: { code?: string; status?: number } | null): AuthOutcome {
  if (!error) return ok(null)
  if (authRefusal(error) === 'rate_limited') return no('rate_limited')
  if (!error.status || error.status >= 500) return no('unavailable')
  return ok(null)
}

/** Where Supabase's emails send people back to. Must be listed in the project's redirect allow-list. */
function appUrl(path: string): string | undefined {
  return typeof window === 'undefined' ? undefined : `${window.location.origin}${path}`
}

export function createSupabaseSession(client: SupabaseClient): SessionPort {
  async function getSession(): Promise<SessionUser | null> {
    const { data, error } = await client.auth.getSession()
    if (error) throw new ApiError('Could not read the session', error)
    const user = data.session?.user
    if (!user) return null

    const access = await client.rpc('my_access')
    if (access.error) throw new ApiError('Could not read your access', access.error)
    const info = access.data as MyAccess | null
    if (!info) return null

    // Own profile only (RLS); explicit columns, never `*`.
    const profile = await client.from('profiles').select('full_name').eq('id', user.id).maybeSingle()
    const fullName = (profile.data as { full_name?: string } | null)?.full_name?.trim()

    return {
      id: info.user_id,
      displayName: fullName || user.email || 'Signed in',
      roles: (info.roles ?? []).filter(isRole),
      isDemo: Boolean(info.is_demo),
    }
  }

  return {
    getSession,

    async signIn({ email, password }) {
      try {
        const { error } = await client.auth.signInWithPassword({ email: email.trim(), password })
        if (error) return no(authRefusal(error))
        const user = await getSession()
        return user ? ok(user) : no('unavailable')
      } catch {
        return no('unavailable')
      }
    },

    async register({ fullName, email, organisation, password, consentVersion }) {
      try {
        const { error } = await client.auth.signUp({
          email: email.trim(),
          password,
          options: {
            // Read by the server's handle_new_user trigger (migration 002); consent is kept only if this is the
            // current privacy notice version.
            data: { full_name: fullName.trim(), organisation: organisation?.trim() || null, consent_version: consentVersion },
            emailRedirectTo: appUrl('/auth/sign-in?verified=1'),
          },
        })
        if (error && error.code !== 'user_already_exists') return no(authRefusal(error))
        return ok(null)
      } catch {
        return no('unavailable')
      }
    },

    async resendVerification(email) {
      try {
        const { error } = await client.auth.resend({ type: 'signup', email: email.trim(), options: { emailRedirectTo: appUrl('/auth/sign-in?verified=1') } })
        return neutral(error)
      } catch {
        return no('unavailable')
      }
    },

    async requestPasswordReset(email) {
      try {
        const { error } = await client.auth.resetPasswordForEmail(email.trim(), { redirectTo: appUrl('/auth/reset') })
        return neutral(error)
      } catch {
        return no('unavailable')
      }
    },

    async updatePassword(password) {
      try {
        const session = await client.auth.getSession()
        if (!session.data.session) return no('invalid_link')
        const { error } = await client.auth.updateUser({ password })
        return error ? no(authRefusal(error)) : ok(null)
      } catch {
        return no('unavailable')
      }
    },

    async signOut() {
      // Local scope: signs out this browser even if the server cannot be reached.
      await client.auth.signOut({ scope: 'local' })
    },

    async getPrivacyNotice() {
      // Same choice as the server's current_notice_version('privacy'): the latest published one.
      const { data, error } = await client
        .from('content_pages')
        .select('title, body_md, version, is_sample')
        .eq('kind', 'privacy')
        .eq('status', 'published')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (error) throw new ApiError('Could not load the privacy notice', error)
      const row = data as { title: string; body_md: string; version: string | null; is_sample: boolean } | null
      if (!row?.version) throw new ApiError('No privacy notice is published')
      return { version: row.version, title: row.title, body_md: row.body_md, is_sample: row.is_sample }
    },

    onChange(listener) {
      const map: Record<string, AuthChange | undefined> = {
        SIGNED_IN: 'signed_in',
        SIGNED_OUT: 'signed_out',
        USER_UPDATED: 'user_updated',
        PASSWORD_RECOVERY: 'password_recovery',
      }
      const { data } = client.auth.onAuthStateChange((event) => {
        const change = map[event]
        // Run outside Supabase's callback: calling the client from inside it can deadlock (supabase-js docs).
        if (change) setTimeout(() => listener(change), 0)
      })
      return () => data.subscription.unsubscribe()
    },
  }
}

import type { SupabaseClient } from '@supabase/supabase-js'
import { describe, expect, it } from 'vitest'
import { createSupabaseAdmin } from './admin'

describe('Supabase admin adapter', () => {
  it('reads a refusal in the body ({ ok: false }) as refused, not as success', async () => {
    const answers: Record<string, { data: unknown; error: unknown }> = {
      grant_role: { data: { ok: false, code: 'FORBIDDEN', message: "You can't grant a role to yourself. Ask another administrator." }, error: null },
      revoke_role: { data: { ok: true, user_role_id: 'ur1' }, error: null },
    }
    const rpcs: { fn: string; args: unknown }[] = []
    const client = { rpc: async (fn: string, args: unknown) => (rpcs.push({ fn, args }), answers[fn]) } as unknown as SupabaseClient
    const port = createSupabaseAdmin(client)
    expect(await port.grantRole({ userId: 'me', roleKey: 'reviewer' })).toEqual({
      kind: 'refused',
      code: 'FORBIDDEN',
      message: "You can't grant a role to yourself. Ask another administrator.",
      fields: undefined,
    })
    expect(await port.revokeRole({ userId: 'u2', roleKey: 'reviewer', reason: 'Left the panel.' })).toEqual({ kind: 'ok', data: { user_role_id: 'ur1' } })
    expect(rpcs).toEqual([
      { fn: 'grant_role', args: { p_user_id: 'me', p_role_key: 'reviewer', p_reason: null } },
      { fn: 'revoke_role', args: { p_user_id: 'u2', p_role_key: 'reviewer', p_reason: 'Left the panel.' } },
    ])
  })

  it('maps invite-staff 403/422 to refusals and anything else to an unknown outcome', async () => {
    const respond = (status: number, body: unknown) => ({ data: null, error: { context: new Response(JSON.stringify(body), { status }) } })
    let next: unknown = respond(422, { message: 'Some details need attention.', fields: { email: 'Enter an email address' } })
    const client = { functions: { invoke: async () => next } } as unknown as SupabaseClient
    const port = createSupabaseAdmin(client)
    const input = { email: 'A@x.org', fullName: 'A', roleKey: 'reviewer' }
    expect(await port.invite(input)).toMatchObject({ kind: 'refused', code: 'VALIDATION', fields: { email: 'Enter an email address' } })
    next = respond(403, {})
    expect(await port.invite(input)).toMatchObject({ kind: 'refused', code: 'FORBIDDEN' })
    next = respond(503, {})
    expect(await port.invite(input)).toEqual({ kind: 'unknown', requestKey: 'invite:a@x.org:reviewer' })
  })
})

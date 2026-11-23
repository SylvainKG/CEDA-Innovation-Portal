import type { SupabaseClient } from '@supabase/supabase-js'
import type { AdminPort } from '../admin'
import { ApiError, fromRpcError, rpcError } from '../errors'
import { isActiveRole, type AdminUser, type ApiErrorCode, type Role, type RoleOption } from '../types'

interface ProfileRow {
  id: string
  full_name: string
  email: string | null
  organisation: string | null
  is_demo: boolean
  user_roles: { role_key: string; revoked_at: string | null }[] | null
}

/** `grant_role` / `revoke_role` refuse a self-change with a body `{ ok: false, code, message }` instead of an error. */
function bodyRefusal(data: unknown) {
  const d = data as { ok?: boolean; code?: ApiErrorCode; message?: string } | null
  return d && d.ok === false ? fromRpcError(rpcError(d.code ?? 'FORBIDDEN', d.message ?? "You can't change your own roles.")) : null
}

/** Supabase admin adapter (T12 users and roles). */
export function createSupabaseAdmin(client: SupabaseClient): AdminPort {
  return {
    async listRoles() {
      const { data, error } = await client.from('roles').select('key, label, requires_mfa').order('label')
      if (error) throw new ApiError('Could not load the roles', error)
      // Absorbed roles stay in the table for history but are not offered for granting (migration 017).
      return ((data ?? []) as RoleOption[]).filter((r) => isActiveRole(r.key as Role))
    },

    async listUsers() {
      const { data: auth } = await client.auth.getUser()
      const { data, error } = await client
        .from('profiles')
        .select('id, full_name, email, organisation, is_demo, user_roles!user_roles_user_id_fkey(role_key, revoked_at)')
        .order('full_name')
      if (error) throw new ApiError('Could not load the people', error)
      const rows = (data ?? []) as ProfileRow[]
      // RLS shows a non-manager only their own row: that is "not visible", not a list of one.
      if (rows.length <= 1 && rows.every((r) => r.id === auth.user?.id)) {
        const mine = rows[0]?.user_roles?.some((r) => r.role_key === 'admin' && !r.revoked_at)
        if (!mine) return null
      }
      return rows.map(
        (r): AdminUser => ({
          id: r.id,
          full_name: r.full_name,
          email: r.email,
          organisation: r.organisation,
          is_demo: r.is_demo,
          roles: (r.user_roles ?? []).filter((x) => !x.revoked_at).map((x) => x.role_key),
        }),
      )
    },

    async grantRole({ userId, roleKey, reason }) {
      const { data, error } = await client.rpc('grant_role', { p_user_id: userId, p_role_key: roleKey, p_reason: reason ?? null })
      if (error) return fromRpcError(error)
      return bodyRefusal(data) ?? { kind: 'ok', data: { already: Boolean((data as { already?: boolean }).already) } }
    },

    async revokeRole({ userId, roleKey, reason }) {
      const { data, error } = await client.rpc('revoke_role', { p_user_id: userId, p_role_key: roleKey, p_reason: reason })
      if (error) return fromRpcError(error)
      return bodyRefusal(data) ?? { kind: 'ok', data: { user_role_id: (data as { user_role_id: string }).user_role_id } }
    },

    async invite({ email, fullName, roleKey }) {
      const { data, error } = await client.functions.invoke('invite-staff', { body: { email, full_name: fullName, role_key: roleKey } })
      if (!error) return { kind: 'ok', data: data as { user_id: string; invited: boolean; already_had_role: boolean } }
      // FunctionsHttpError carries the response: 403 FORBIDDEN or 422 VALIDATION are definite refusals.
      const res = (error as { context?: Response }).context
      if (res && (res.status === 403 || res.status === 422)) {
        const body = (await res.json().catch(() => ({}))) as { code?: ApiErrorCode; message?: string; fields?: Record<string, string> }
        return fromRpcError(rpcError(res.status === 403 ? 'FORBIDDEN' : 'VALIDATION', body.message ?? 'The invitation was refused.', body.fields))
      }
      // Anything else (503, lost reply): unknown. Inviting again is safe (it finds the account; the grant is a no-op).
      return { kind: 'unknown', requestKey: `invite:${email.trim().toLowerCase()}:${roleKey}` }
    },
  }
}

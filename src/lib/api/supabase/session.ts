import type { SupabaseClient } from '@supabase/supabase-js'
import { ApiError } from '../errors'
import type { SessionPort } from '../session'
import { ROLES, type Role, type SessionUser } from '../types'

/**
 * Supabase session adapter. Identity comes from Supabase Auth; roles come from `my_access()` (contract §2),
 * which the server computes from `user_roles`. The roles only shape navigation: every permission is still
 * enforced by RLS and the RPC checks, so a tampered client gains nothing.
 */
interface MyAccess {
  user_id: string
  is_demo: boolean
  roles: string[]
}

function isRole(value: unknown): value is Role {
  return typeof value === 'string' && (ROLES as readonly string[]).includes(value)
}

export function createSupabaseSession(client: SupabaseClient): SessionPort {
  return {
    async getSession(): Promise<SessionUser | null> {
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
    },
  }
}

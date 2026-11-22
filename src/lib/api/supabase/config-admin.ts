import type { SupabaseClient } from '@supabase/supabase-js'
import type { ConfigAdminPort } from '../config-admin'
import { ApiError, fromRpcError } from '../errors'
import { isActiveRole, type AdminContentPage, type AdminRole, type PermissionOption, type Role } from '../types'

/** Supabase config admin adapter (T12 roles and content). */
export function createSupabaseConfigAdmin(client: SupabaseClient): ConfigAdminPort {
  return {
    async roleSetup() {
      const [roles, perms, grants] = await Promise.all([
        client.from('roles').select('key, label, is_system, requires_mfa').order('label'),
        client.from('permissions').select('key, description').order('key'),
        client.from('role_permissions').select('role_key, permission'),
      ])
      const error = roles.error ?? perms.error ?? grants.error
      if (error) throw new ApiError('Could not load roles and permissions', error)
      const byRole = new Map<string, string[]>()
      for (const g of (grants.data ?? []) as { role_key: string; permission: string }[]) byRole.set(g.role_key, [...(byRole.get(g.role_key) ?? []), g.permission])
      return {
        // Absorbed roles stay in the table for history but are hidden from the roles editor (migration 017).
        roles: ((roles.data ?? []) as Omit<AdminRole, 'permissions'>[])
          .filter((r) => isActiveRole(r.key as Role))
          .map((r) => ({ ...r, permissions: (byRole.get(r.key) ?? []).sort() })),
        permissions: (perms.data ?? []) as PermissionOption[],
      }
    },

    async createRole({ key, label, permissions, requiresMfa }) {
      const { data, error } = await client.rpc('create_role', { p_key: key, p_label: label, p_permissions: permissions, p_requires_mfa: requiresMfa })
      if (error) return fromRpcError(error)
      return { kind: 'ok', data: data as { key: string } }
    },

    async setRolePermissions(key, permissions) {
      const { data, error } = await client.rpc('set_role_permissions', { p_role_key: key, p_permissions: permissions })
      if (error) return fromRpcError(error)
      return { kind: 'ok', data: data as { key: string } }
    },

    async listContent() {
      const { data, error } = await client
        .from('content_pages')
        .select('slug, kind, title, body_md, version, position, is_sample, status')
        .order('kind')
        .order('position')
      if (error) throw new ApiError('Could not load the content', error)
      return (data ?? []) as AdminContentPage[]
    },

    async saveContent(i) {
      const { data, error } = await client.rpc('save_content_page', {
        p_slug: i.slug,
        p_kind: i.kind,
        p_title: i.title,
        p_body_md: i.bodyMd,
        p_status: i.status,
        p_position: i.position,
        p_is_sample: i.isSample,
        p_version: i.version,
      })
      if (error) return fromRpcError(error)
      return { kind: 'ok', data: data as { slug: string; status: 'draft' | 'published' } }
    },
  }
}

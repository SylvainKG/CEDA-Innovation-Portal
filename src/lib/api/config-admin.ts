import type { AdminContentKind, AdminContentPage, AdminRole, CommandOutcome, PermissionOption } from './types'

/**
 * Config admin port, T12 roles (ARC-01; role.manage) and content (HLP-01; config.manage).
 *
 * | Method              | Contract                                                                         |
 * |---------------------|----------------------------------------------------------------------------------|
 * | roleSetup           | read `roles`, `permissions`, `role_permissions`                                  |
 * | createRole          | RPC `create_role(p_key, p_label, p_permissions, p_requires_mfa)`                 |
 * | setRolePermissions  | RPC `set_role_permissions`; built-in roles are refused (INVALID_STATE)           |
 * | listContent         | read `content_pages` (RLS: config.manage also sees drafts)                       |
 * | saveContent         | RPC `save_content_page`; privacy/declaration need a version, and a new one when   |
 * |                     | the wording changes, so earlier consents stay traceable                          |
 */
export interface ConfigAdminPort {
  roleSetup(): Promise<{ roles: AdminRole[]; permissions: PermissionOption[] }>
  createRole(input: { key: string; label: string; permissions: string[]; requiresMfa: boolean }): Promise<CommandOutcome<{ key: string }>>
  setRolePermissions(key: string, permissions: string[]): Promise<CommandOutcome<{ key: string }>>
  listContent(): Promise<AdminContentPage[]>
  saveContent(input: {
    slug: string
    kind: AdminContentKind
    title: string
    bodyMd: string
    status: 'draft' | 'published'
    position: number
    isSample: boolean
    version: string | null
  }): Promise<CommandOutcome<{ slug: string; status: 'draft' | 'published' }>>
}

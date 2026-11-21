import type { AdminUser, CommandOutcome, RoleOption } from './types'

/**
 * Admin port, T12 users and roles (IAM-01, ARC-01).
 *
 * | Method      | Contract                                                                              |
 * |-------------|---------------------------------------------------------------------------------------|
 * | listRoles   | read `roles` (key, label, requires_mfa)                                               |
 * | listUsers   | read `profiles` with active `user_roles` (RLS: role.manage sees everyone)             |
 * | grantRole   | RPC `grant_role`; granting a role already held is `already: true`, so a retry is safe |
 * | revokeRole  | RPC `revoke_role` (reason required); nobody may change their own roles              |
 * | invite      | Edge Function `invite-staff` { email, full_name, role_key }; finds an existing account |
 *
 * `listUsers` returns `null` when the person may not manage roles.
 */
export interface AdminPort {
  listRoles(): Promise<RoleOption[]>
  listUsers(): Promise<AdminUser[] | null>
  grantRole(input: { userId: string; roleKey: string; reason?: string }): Promise<CommandOutcome<{ already: boolean }>>
  revokeRole(input: { userId: string; roleKey: string; reason: string }): Promise<CommandOutcome<{ user_role_id: string }>>
  invite(input: { email: string; fullName: string; roleKey: string }): Promise<CommandOutcome<{ user_id: string; invited: boolean; already_had_role: boolean }>>
}

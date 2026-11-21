import type { AuthChange, AuthOutcome, PrivacyNotice, RegisterInput, Role, SessionUser } from './types'

/**
 * Session port. UI code depends on this interface only, so the mock adapter can be swapped for
 * Supabase Auth without changing screens (blueprint §7.3, evidence skill architecture mapping).
 *
 * Auth methods never reveal whether an account exists: registering an email that already has an account,
 * and asking to reset a password for an unknown email, both look like success (spec T02).
 */
export interface SessionPort {
  getSession(): Promise<SessionUser | null>
  signIn(input: { email: string; password: string }): Promise<AuthOutcome<SessionUser>>
  /** Success means "check your email": the account is usable only after the address is verified. */
  register(input: RegisterInput): Promise<AuthOutcome>
  resendVerification(email: string): Promise<AuthOutcome>
  requestPasswordReset(email: string): Promise<AuthOutcome>
  /** Sets a new password in the recovery session opened by the reset link. */
  updatePassword(password: string): Promise<AuthOutcome>
  signOut(): Promise<void>
  getPrivacyNotice(): Promise<PrivacyNotice>
  /** Notifies of sign-in, sign-out and similar changes made outside the app's own calls (other tab, link). */
  onChange?(listener: (change: AuthChange) => void): () => void
  /** Mock mode only: switch the demo identity to preview another role's navigation. */
  switchDemoRole?(role: Role | null): Promise<SessionUser | null>
}

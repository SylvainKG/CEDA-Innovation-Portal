import type { CommandOutcome } from './types'

/** Where the signed-in person stands on two-step sign-in (D-07; `my_access().mfa_required`). */
export interface MfaStatus {
  /** A staff role is held, and its permissions are withheld until a second step. */
  required: boolean
  /** A seeded demo account holding a staff role, let through without a second step (D-07 flag). */
  demoExempt: boolean
  /** An authenticator app is already set up. */
  enrolled: boolean
}

export interface MfaEnrolment {
  factorId: string
  /** Image of the QR code (a data URL) to scan with an authenticator app. */
  qrCode: string
  /** The same secret, to type in by hand. */
  secret: string
}

/**
 * Two-step sign-in port, T02 MFA (D-07, IAM-02).
 *
 * | Method   | Contract                                                                                  |
 * |----------|-------------------------------------------------------------------------------------------|
 * | status   | RPC `my_access()` (mfa_required, is_demo, roles) + Supabase Auth `mfa.listFactors`        |
 * | enrol    | Supabase Auth `mfa.enroll({ factorType: 'totp' })`                                       |
 * | verify   | Supabase Auth `mfa.challengeAndVerify`; the session becomes aal2, which the server checks |
 *
 * The server withholds staff permissions until the session is aal2 (`private.mfa_satisfied`), so this screen is
 * only the way through; it is not the control.
 */
export interface MfaPort {
  status(): Promise<MfaStatus | null>
  enrol(): Promise<MfaEnrolment>
  verify(input: { factorId?: string; code: string }): Promise<CommandOutcome<{ verified: true }>>
}

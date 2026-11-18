import type { AuthRefusal } from '@/lib/api/types'

/** Spec T02 asks for at least 12 characters. The server's Auth setting is 10 (supabase/config.toml), raised with Stacey. */
export const PASSWORD_MIN = 12

/** Spec T02: the resend link is rate-limited ("You can resend in 60 s"). */
export const RESEND_WAIT_S = 60

/** What each refusal says. Never which of email or password was wrong, nor whether an account exists. */
export const REFUSAL_TEXT: Record<AuthRefusal, string> = {
  invalid_credentials: 'Email or password is incorrect.',
  email_not_confirmed: 'Verify your email address first. Open the link we sent when you registered.',
  rate_limited: 'Too many attempts. Try again in 5 minutes.',
  weak_password: `Choose a stronger password: at least ${PASSWORD_MIN} characters, and not one you use elsewhere.`,
  invalid_link: 'This link has expired or was already used. Ask for a new one.',
  unavailable: "We couldn't reach the service. Check your connection and try again.",
}

export function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
}

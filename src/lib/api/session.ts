import type { Role, SessionUser } from './types'

/**
 * Session port. UI code depends on this interface only, so the mock adapter can be swapped for
 * Supabase Auth without changing screens (blueprint §7.3, evidence skill architecture mapping).
 */
export interface SessionPort {
  getSession(): Promise<SessionUser | null>
  /** Mock mode only: switch the demo identity to preview another role's navigation. */
  switchDemoRole?(role: Role | null): Promise<SessionUser | null>
}

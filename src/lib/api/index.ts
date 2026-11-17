import type { SessionPort } from './session'
import type { SubmissionPort } from './submission'
import { mockSession } from './mock/session'
import { mockSubmission } from './mock/submission'

/**
 * API composition root. The adapter is chosen once from configuration (VITE_API_MODE).
 * Only "mock" exists today; the "supabase" adapters are added when Stacey's contract and project exist.
 *
 * Fail fast (evidence skill; Sylvain's review of PR #6, finding 1):
 * - in development, an unset mode means "mock";
 * - in a production build, the mode must be set explicitly, so a staging or judging deploy can never
 *   silently publish the development-only mock session. Staging sets VITE_API_MODE=mock on purpose
 *   until the backend exists.
 */
export type ApiMode = 'mock' | 'supabase'

export function resolveApiMode(raw: string | undefined, isDev: boolean): ApiMode {
  const value = raw?.trim() || undefined
  if (value === undefined) {
    if (isDev) return 'mock'
    throw new Error('VITE_API_MODE is not set. Production builds must set it explicitly ("mock" for a demo build).')
  }
  if (value === 'mock') return 'mock'
  if (value === 'supabase') {
    throw new Error('VITE_API_MODE=supabase is not available yet: the backend adapters arrive with the API contract.')
  }
  throw new Error(`Unknown VITE_API_MODE "${value}". Use "mock".`)
}

export const apiMode: ApiMode = resolveApiMode(import.meta.env.VITE_API_MODE as string | undefined, import.meta.env.DEV)

export const api: { session: SessionPort; submission: SubmissionPort } = {
  session: mockSession,
  submission: mockSubmission,
}

export * from './types'
export { ApiError } from './errors'
export { clearSubmitKey, pendingSubmitKey, submitKeyFor } from './request-key'

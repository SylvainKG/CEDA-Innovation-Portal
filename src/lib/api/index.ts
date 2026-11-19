import type { ContentPort } from './content'
import type { SessionPort } from './session'
import type { SubmissionPort } from './submission'
import { mockContent } from './mock/content'
import { mockSession } from './mock/session'
import { mockSubmission } from './mock/submission'
import { createBrowserClient, readSupabaseConfig } from './supabase/client'
import { createSupabaseContent } from './supabase/content'
import { createSupabaseSession } from './supabase/session'
import { createSupabaseSubmission } from './supabase/submission'

/**
 * API composition root. The adapter is chosen once from configuration (VITE_API_MODE).
 * - "mock": typed in-memory adapters for development and the demo preview (no backend).
 * - "supabase": the real backend (Supabase Auth, RLS, RPCs). Needs VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.
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
  if (value === 'supabase') return 'supabase'
  throw new Error(`Unknown VITE_API_MODE "${value}". Use "mock" or "supabase".`)
}

export const apiMode: ApiMode = resolveApiMode(import.meta.env.VITE_API_MODE as string | undefined, import.meta.env.DEV)

function buildApi(mode: ApiMode): { session: SessionPort; submission: SubmissionPort; content: ContentPort } {
  if (mode === 'mock') return { session: mockSession, submission: mockSubmission, content: mockContent }
  // Fails fast at start-up when the URL or key is missing, rather than on the first request.
  const client = createBrowserClient(readSupabaseConfig(import.meta.env))
  return {
    session: createSupabaseSession(client),
    submission: createSupabaseSubmission(client),
    content: createSupabaseContent(client),
  }
}

export const api = buildApi(apiMode)

export * from './types'
export { ApiError } from './errors'
export { clearSubmitKey, pendingSubmitKey, submitKeyFor } from './request-key'

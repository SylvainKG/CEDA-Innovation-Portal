import type { AdminPort } from './admin'
import type { ChatPort } from './chat'
import type { CommitteePort } from './committee'
import type { MfaPort } from './mfa'
import type { VersionsPort } from './versions'
import type { ContentPort } from './content'
import type { FeedbackPort } from './feedback'
import type { OversightPort } from './oversight'
import type { ReviewPort } from './review'
import type { SessionPort } from './session'
import type { StaffPort } from './staff'
import type { SubmissionPort } from './submission'
import { mockAdmin } from './mock/admin'
import { mockChat } from './mock/chat'
import { mockCommittee } from './mock/committee'
import { mockMfa } from './mock/mfa'
import { mockVersions } from './mock/versions'
import { mockContent } from './mock/content'
import { mockFeedback } from './mock/feedback'
import { mockOversight } from './mock/oversight'
import { mockReview } from './mock/review'
import { mockSession } from './mock/session'
import { mockStaff } from './mock/staff'
import { mockSubmission } from './mock/submission'
import { createBrowserClient, readSupabaseConfig } from './supabase/client'
import { createSupabaseAdmin } from './supabase/admin'
import { createSupabaseChat } from './supabase/chat'
import { createSupabaseCommittee } from './supabase/committee'
import { createSupabaseMfa } from './supabase/mfa'
import { createSupabaseVersions } from './supabase/versions'
import { createSupabaseContent } from './supabase/content'
import { createSupabaseFeedback } from './supabase/feedback'
import { createSupabaseOversight } from './supabase/oversight'
import { createSupabaseReview } from './supabase/review'
import { createSupabaseSession } from './supabase/session'
import { createSupabaseStaff } from './supabase/staff'
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

function buildApi(mode: ApiMode): { session: SessionPort; submission: SubmissionPort; content: ContentPort; staff: StaffPort; review: ReviewPort; feedback: FeedbackPort; oversight: OversightPort; chat: ChatPort; admin: AdminPort; mfa: MfaPort; versions: VersionsPort; committee: CommitteePort } {
  if (mode === 'mock') return { session: mockSession, submission: mockSubmission, content: mockContent, staff: mockStaff, review: mockReview, feedback: mockFeedback, oversight: mockOversight, chat: mockChat, admin: mockAdmin, mfa: mockMfa, versions: mockVersions, committee: mockCommittee }
  // Fails fast at start-up when the URL or key is missing, rather than on the first request.
  const client = createBrowserClient(readSupabaseConfig(import.meta.env))
  return {
    session: createSupabaseSession(client),
    submission: createSupabaseSubmission(client),
    content: createSupabaseContent(client),
    staff: createSupabaseStaff(client),
    review: createSupabaseReview(client),
    feedback: createSupabaseFeedback(client),
    oversight: createSupabaseOversight(client),
    chat: createSupabaseChat(client),
    admin: createSupabaseAdmin(client),
    mfa: createSupabaseMfa(client),
    versions: createSupabaseVersions(client),
    committee: createSupabaseCommittee(client),
  }
}

export const api = buildApi(apiMode)

export * from './types'
export { ApiError } from './errors'
export { clearSubmitKey, pendingSubmitKey, submitKeyFor } from './request-key'

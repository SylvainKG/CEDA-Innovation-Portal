import type { SessionPort } from './session'
import { mockSession } from './mock/session'

/**
 * API composition root. The adapter is chosen once from configuration (VITE_API_MODE).
 * Only "mock" exists today; the "supabase" adapters are added when Stacey's contract and project exist.
 * Unknown values fail fast instead of silently falling back.
 */
export type ApiMode = 'mock' | 'supabase'

export function resolveApiMode(raw: string | undefined): ApiMode {
  const mode = raw ?? 'mock'
  if (mode === 'mock') return 'mock'
  if (mode === 'supabase') {
    throw new Error('VITE_API_MODE=supabase is not available yet: the backend adapters arrive with the API contract.')
  }
  throw new Error(`Unknown VITE_API_MODE "${mode}". Use "mock".`)
}

export const apiMode: ApiMode = resolveApiMode(import.meta.env.VITE_API_MODE as string | undefined)

export const api: { session: SessionPort } = {
  session: mockSession,
}

export * from './types'

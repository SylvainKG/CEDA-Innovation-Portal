import type { ApiErrorCode, CommandOutcome } from './types'

/**
 * Turning an RPC error into what the UI can act on (contract §1.1).
 *
 * - The stable code is in `message`. `hint` is plain text safe to show. `details` is a JSON string whose
 *   `fields` maps field key → message (document keys are `doc:<key>`).
 * - A known code is a definite refusal: nothing changed on the server.
 * - Anything else on a command that carries a request key (timeout, lost reply, 5xx, unexpected body) is an
 *   UNKNOWN outcome, never "failed": the server may have applied it. The UI keeps the same key and checks
 *   (evidence skill principles 2 and 7; contract §1.1 "Unknown outcome").
 * - Without a request key there is nothing to reconcile, so the error is thrown for the page's error state.
 */
export interface RpcErrorBody {
  code?: string
  message?: string
  hint?: string | null
  details?: string | null
}

const KNOWN_CODES: readonly ApiErrorCode[] = [
  'FORBIDDEN',
  'INVALID_STATE',
  'VALIDATION',
  'CASE_NOT_APPROVED',
  'CHALLENGE_CLOSED',
  'REQUEST_CONFLICT',
  'IMMUTABLE',
]

export class ApiError extends Error {
  constructor(message: string, readonly body?: unknown) {
    super(message)
    this.name = 'ApiError'
  }
}

export function parseFieldErrors(details: string | null | undefined): Record<string, string> | undefined {
  if (!details) return undefined
  try {
    const parsed: unknown = JSON.parse(details)
    if (!parsed || typeof parsed !== 'object' || !('fields' in parsed)) return undefined
    const fields = (parsed as { fields: unknown }).fields
    if (!fields || typeof fields !== 'object') return undefined
    const out: Record<string, string> = {}
    for (const [key, value] of Object.entries(fields)) if (typeof value === 'string') out[key] = value
    return Object.keys(out).length > 0 ? out : undefined
  } catch {
    return undefined
  }
}

function isKnownCode(value: unknown): value is ApiErrorCode {
  return typeof value === 'string' && (KNOWN_CODES as readonly string[]).includes(value)
}

/** Map an RPC error to a refusal, or to an unknown outcome when a request key is in play. */
export function fromRpcError(error: unknown, requestKey?: string): CommandOutcome<never> {
  const body = (error && typeof error === 'object' ? error : {}) as RpcErrorBody
  if (isKnownCode(body.message)) {
    return {
      kind: 'refused',
      code: body.message,
      message: body.hint ?? undefined,
      fields: parseFieldErrors(body.details),
    }
  }
  if (requestKey) return { kind: 'unknown', requestKey }
  throw new ApiError(typeof body.message === 'string' && body.message ? body.message : 'Unexpected server error', error)
}

/** Build the error body the server would send. Used by the mock adapter so it fails exactly like the real one. */
export function rpcError(code: ApiErrorCode, hint: string, fields?: Record<string, string>): RpcErrorBody {
  return { code: 'PT4xx', message: code, hint, details: fields ? JSON.stringify({ fields }) : null }
}

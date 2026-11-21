/**
 * Submit request keys (contract §4.1 rule 1, BCR-001 B3).
 *
 * The key is generated once, when the applicant first presses Submit idea, and kept (in local storage too)
 * until a receipt arrives. A retry, a reload or a second tab reuses it, so the server can replay the original
 * receipt instead of creating a second submission. Only a new action gets a new key.
 */
const PREFIX = 'ceda.submit.key.'

const memory = new Map<string, string>()

export function newRequestId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  // Fallback for old browsers: RFC 4122 v4 from getRandomValues.
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x40
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

function read(proposalId: string): string | undefined {
  try {
    return window.localStorage.getItem(PREFIX + proposalId) ?? memory.get(proposalId)
  } catch {
    return memory.get(proposalId)
  }
}

/** The pending key for this draft's submission, if a submit was started and has no receipt yet. */
export function pendingSubmitKey(proposalId: string): string | undefined {
  return read(proposalId)
}

/** The key to send now: the pending one if any, otherwise a new one that is stored before the request goes out. */
export function submitKeyFor(proposalId: string): string {
  const existing = read(proposalId)
  if (existing) return existing
  const key = newRequestId()
  memory.set(proposalId, key)
  try {
    window.localStorage.setItem(PREFIX + proposalId, key)
  } catch {
    // Storage unavailable (private mode): the key lasts for this page only.
  }
  return key
}

/** Forget every pending key held in memory (local storage is cleared by `clearDeviceData`). */
export function clearAllSubmitKeys(): void {
  memory.clear()
}

/** Forget the key once a receipt (original or replayed) has been shown. */
export function clearSubmitKey(proposalId: string): void {
  memory.delete(proposalId)
  try {
    window.localStorage.removeItem(PREFIX + proposalId)
  } catch {
    // Nothing to clear.
  }
}

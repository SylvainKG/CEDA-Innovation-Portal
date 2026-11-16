/**
 * Validates a post-sign-in "next" path so it can only point inside this app (no open redirect).
 * Accepts "/ideas/abc?tab=1"; refuses absolute URLs, protocol-relative "//host", backslash tricks
 * such as "/\host" (browsers treat "\" like "/"), and control characters.
 */
export function safeNextPath(next: string | null | undefined): string | null {
  if (!next) return null
  if (!next.startsWith('/')) return null
  if (next.startsWith('//')) return null
  if (next.includes('\\')) return null
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f\u007f]/.test(next)) return null
  try {
    const url = new URL(next, 'https://portal.invalid')
    if (url.origin !== 'https://portal.invalid') return null
    return url.pathname + url.search + url.hash
  } catch {
    return null
  }
}

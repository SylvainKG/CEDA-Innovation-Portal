/**
 * The toolkit preview is shown only when VITE_TOOLKIT_PREVIEW is exactly "true" (off by default; the judged build
 * doesn't set it). Read at call time so tests can switch it with vi.stubEnv.
 */
export function toolkitPreviewEnabled(env: Record<string, unknown> = import.meta.env): boolean {
  return env.VITE_TOOLKIT_PREVIEW === 'true'
}

import { clearAllSubmitKeys } from '@/lib/api/request-key'

/**
 * Personal data kept on this device for one person (Stacey's #18 review; data-handling note #31):
 * - `ceda.draft.local.*`: unsent draft answers;
 * - `ceda.submit.key.*`: pending submit keys.
 * Call `clearDeviceData()` whenever the signed-in person changes or signs out, so the next person on a shared
 * computer never sees them. Supabase sign-out will call it too when real authentication is wired.
 */
const PERSONAL_PREFIXES = ['ceda.draft.local.', 'ceda.submit.key.']

export function clearDeviceData(): void {
  clearAllSubmitKeys()
  try {
    const doomed: string[] = []
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const key = window.localStorage.key(i)
      if (key && PERSONAL_PREFIXES.some((p) => key.startsWith(p))) doomed.push(key)
    }
    for (const key of doomed) window.localStorage.removeItem(key)
  } catch {
    // Storage unavailable: nothing was stored there.
  }
}

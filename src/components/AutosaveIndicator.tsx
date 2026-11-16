import type { ReactNode } from 'react'
import { AlertCircle, CheckCircle2, HardDrive, Loader2 } from 'lucide-react'

/**
 * Draft save state, kept honest (spec §7 T04; evidence skill principle 12):
 * - `saved`: the server confirmed the save at `at`;
 * - `local`: kept on this device only, not sent (offline or the server is unreachable);
 * - `retrying`: a save failed and will be retried; the work is still on the device.
 */
export type AutosaveState =
  | { kind: 'idle' }
  | { kind: 'saving' }
  | { kind: 'saved'; at: string }
  | { kind: 'local' }
  | { kind: 'retrying' }

function timeCAT(iso: string): string {
  return new Intl.DateTimeFormat('en-GB', { timeZone: 'Africa/Gaborone', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(iso))
}

export function AutosaveIndicator({ state }: { state: AutosaveState }) {
  let content: ReactNode = null
  switch (state.kind) {
    case 'idle':
      return null
    case 'saving':
      content = (
        <>
          <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> Saving…
        </>
      )
      break
    case 'saved':
      content = (
        <>
          <CheckCircle2 aria-hidden className="h-4 w-4 text-success" /> Saved {timeCAT(state.at)}
        </>
      )
      break
    case 'local':
      content = (
        <>
          <HardDrive aria-hidden className="h-4 w-4 text-warning" /> Saved on this device, not sent
        </>
      )
      break
    case 'retrying':
      content = (
        <>
          <AlertCircle aria-hidden className="h-4 w-4 text-warning" /> Couldn't save. Retrying…
        </>
      )
      break
  }
  return (
    <span role="status" className="inline-flex items-center gap-1 text-sm text-ink-muted">
      {content}
    </span>
  )
}

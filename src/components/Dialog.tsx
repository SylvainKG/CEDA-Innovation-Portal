import * as RadixDialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import type { ReactNode } from 'react'
import { Button, type ButtonVariant } from './Button'

export interface DialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Names the action and the case, e.g. "Publish decision for CEDA-2026-0009". */
  title: string
  /** Short statement of what will happen (spec §7 T10). */
  consequence: string
  /** Primary button label stating the result, e.g. "Publish to applicant". */
  primaryLabel: string
  primaryVariant?: ButtonVariant
  onPrimary: () => void
  /** While the action runs: the primary button shows a spinner and repeat clicks are blocked. */
  busy?: boolean
  /** Workflow actions show the audit note (spec §7 T10). */
  audited?: boolean
  children?: ReactNode
}

/**
 * Action dialog (spec §5, §7 T10) built on Radix Dialog: focus trap, Esc to close, focus returned on close.
 * Full screen on mobile, centred card from 768 px.
 */
export function Dialog({
  open,
  onOpenChange,
  title,
  consequence,
  primaryLabel,
  primaryVariant = 'primary',
  onPrimary,
  busy = false,
  audited = false,
  children,
}: DialogProps) {
  return (
    <RadixDialog.Root open={open} onOpenChange={(next) => (!busy ? onOpenChange(next) : undefined)}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="fixed inset-0 bg-black/40" />
        <RadixDialog.Content className="fixed inset-0 flex flex-col bg-surface-card p-6 shadow-2 md:inset-auto md:left-1/2 md:top-1/2 md:w-full md:max-w-[560px] md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-md">
          <div className="flex items-start justify-between gap-4">
            <RadixDialog.Title className="text-h3 font-semibold">{title}</RadixDialog.Title>
            <RadixDialog.Close asChild>
              <button
                type="button"
                aria-label="Close"
                disabled={busy}
                className="inline-flex min-h-touch min-w-touch items-center justify-center rounded-md hover:bg-surface-sunken"
              >
                <X aria-hidden className="h-5 w-5" />
              </button>
            </RadixDialog.Close>
          </div>
          <RadixDialog.Description className="mt-2 text-ink">{consequence}</RadixDialog.Description>
          {children ? <div className="mt-4 flex flex-col gap-4">{children}</div> : null}
          {audited ? <p className="mt-4 text-sm text-ink-muted">This action is recorded in the audit log.</p> : null}
          <div className="mt-auto flex flex-col-reverse gap-3 pt-6 md:mt-6 md:flex-row md:justify-end">
            <RadixDialog.Close asChild>
              <Button variant="secondary" disabled={busy}>
                Cancel
              </Button>
            </RadixDialog.Close>
            <Button variant={primaryVariant} loading={busy} onClick={onPrimary}>
              {primaryLabel}
            </Button>
          </div>
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  )
}

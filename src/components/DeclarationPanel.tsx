import { useId, useState, type ReactNode } from 'react'
import { AlertCircle } from 'lucide-react'
import { Button } from './Button'
import { SampleLabel } from './DemoBadge'
import { TextField } from './TextField'

interface CommonProps {
  /** Declaration text. Placeholder wording until CEDA supplies the real terms (blueprint D-22). */
  terms: ReactNode
  /** True while the wording is still the placeholder; shows a Sample label. */
  sampleWording?: boolean
  error?: string
}

export interface ApplicantDeclarationProps extends CommonProps {
  kind: 'applicant'
  accepted: boolean
  onAcceptedChange: (accepted: boolean) => void
}

export interface ReviewerDeclarationProps extends CommonProps {
  kind: 'reviewer'
  /** Called with the reviewer's choice. The server records it and opens or revokes access (D-19). */
  onDeclare: (choice: { hasConflict: false } | { hasConflict: true; reason: string }) => void
  busy?: boolean
}

export type DeclarationPanelProps = ApplicantDeclarationProps | ReviewerDeclarationProps

function Terms({ terms, sampleWording }: Pick<CommonProps, 'terms' | 'sampleWording'>) {
  return (
    <div className="flex flex-col gap-2">
      {sampleWording ? <SampleLabel /> : null}
      {/* Shown in full (no scroll box) so keyboard and screen-reader users can read every line. */}
      <div className="rounded-sm border border-line bg-surface-sunken p-3 text-sm">
        {terms}
      </div>
    </div>
  )
}

/**
 * Declarations (spec §5):
 * - applicant: confidentiality/IP declaration on the final submit step (D-22);
 * - reviewer: conflict-of-interest and confidentiality declaration before the proposal opens (D-19), with a conflict path.
 */
export function DeclarationPanel(props: DeclarationPanelProps) {
  const checkId = useId()
  const errorId = `${checkId}-error`
  const [conflictMode, setConflictMode] = useState(false)
  const [reason, setReason] = useState('')
  const [confirmed, setConfirmed] = useState(false)

  if (props.kind === 'applicant') {
    return (
      <fieldset className="flex flex-col gap-3">
        <legend className="text-h3 font-semibold">Declaration</legend>
        <Terms terms={props.terms} sampleWording={props.sampleWording} />
        <div className="flex items-start gap-3">
          <input
            id={checkId}
            type="checkbox"
            required
            checked={props.accepted}
            onChange={(e) => props.onAcceptedChange(e.target.checked)}
            aria-invalid={props.error ? true : undefined}
            aria-describedby={props.error ? errorId : undefined}
            className="mt-1 h-5 w-5 shrink-0"
          />
          <label htmlFor={checkId}>I have read and accept the declaration above.</label>
        </div>
        {props.error ? (
          <p id={errorId} className="flex items-center gap-1 text-sm text-error">
            <AlertCircle aria-hidden className="h-4 w-4" />
            {props.error}
          </p>
        ) : null}
      </fieldset>
    )
  }

  const { onDeclare, busy } = props
  return (
    <section aria-labelledby={`${checkId}-heading`} className="flex flex-col gap-4 rounded-md bg-surface-card p-4 shadow-1">
      <h2 id={`${checkId}-heading`} className="text-h3 font-semibold">
        Before you open this proposal
      </h2>
      <Terms terms={props.terms} sampleWording={props.sampleWording} />
      {!conflictMode ? (
        <>
          <div className="flex items-start gap-3">
            <input id={checkId} type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} className="mt-1 h-5 w-5 shrink-0" />
            <label htmlFor={checkId}>I have no conflict of interest and will keep this proposal confidential.</label>
          </div>
          <div className="flex flex-col gap-3 md:flex-row">
            <Button
              disabled={!confirmed}
              disabledReason="Confirm the declaration to continue."
              loading={busy}
              loadingLabel="Recording…"
              onClick={() => onDeclare({ hasConflict: false })}
            >
              Continue to proposal
            </Button>
            <Button variant="secondary" disabled={busy} onClick={() => setConflictMode(true)}>
              I have a conflict
            </Button>
          </div>
        </>
      ) : (
        <>
          <TextField
            label="Describe the conflict"
            help="An administrator will reassign the case. You will lose access to it."
            required
            multiline
            maxLength={500}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            error={props.error}
          />
          <div className="flex flex-col gap-3 md:flex-row">
            <Button
              variant="destructive"
              disabled={reason.trim().length === 0}
              disabledReason="Describe the conflict to withdraw."
              loading={busy}
              loadingLabel="Recording…"
              onClick={() => onDeclare({ hasConflict: true, reason: reason.trim() })}
            >
              Declare conflict and withdraw
            </Button>
            <Button variant="secondary" disabled={busy} onClick={() => setConflictMode(false)}>
              Back
            </Button>
          </div>
        </>
      )}
    </section>
  )
}

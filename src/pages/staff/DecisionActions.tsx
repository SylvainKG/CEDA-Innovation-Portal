import { useCallback, useId, useState } from 'react'
import { Banner, Dialog, TextField } from '@/components'
import { useCaseCommand } from '@/features/staff/queries'
import { api } from '@/lib/api'
import type { DecisionOutcome, StaffCase } from '@/lib/api/types'
import { activeDecision } from '@/features/staff/case-view'
import { formatDateTimeCAT } from '@/lib/format'
import { AWARD_MAX_MINOR, AWARD_MIN_MINOR, formatBWP, parseBWP } from '@/lib/money'

/**
 * Slice 5 (spec T08 Decision tab, T10 decision/publish/award/close; contract §4.5), built from the written spec
 * (BCR-003; design review pending). The adjudicator records (unpublished) and publishes; only the administrator
 * records the award (D-05); screening officers and adjudicators can close a case.
 */

const OUTCOME_LABEL: Record<DecisionOutcome, string> = { approved: 'Approved', not_approved: 'Not approved' }

function CommandBanner({ state, failed }: { state: ReturnType<typeof useCaseCommand>['state']; failed: string }) {
  if (state.kind === 'refused' && !state.fields)
    return <Banner kind="error">{state.code === 'INVALID_STATE' ? `${state.message ?? 'This case has moved on.'} Close this dialog to see its latest status.` : (state.message ?? failed)}</Banner>
  if (state.kind === 'refused' && state.message) return <Banner kind="error">{state.message}</Banner>
  if (state.kind === 'unconfirmed')
    return (
      <Banner kind="warning" title="Not confirmed yet">
        We couldn't confirm this was saved. Check your connection and try again.
      </Banner>
    )
  return null
}

export function DecisionTab({ c }: { c: StaffCase }) {
  const active = activeDecision(c)
  const earlier = c.decisions.filter((d) => d.superseded_at)
  return (
    <div className="flex max-w-form flex-col gap-4">
      {active ? (
        <section aria-labelledby="dec-h" className="flex flex-col gap-2 rounded-md bg-surface-card p-4 shadow-1">
          <h2 id="dec-h" className="text-h3 font-semibold">
            Decision: {OUTCOME_LABEL[active.outcome]}
          </h2>
          <p className="whitespace-pre-wrap break-words">{active.reason}</p>
          <p className="text-sm text-ink-muted">Recorded {formatDateTimeCAT(active.recorded_at)}</p>
          {active.published_at ? (
            <p className="text-sm font-semibold">Published to the applicant {formatDateTimeCAT(active.published_at)}</p>
          ) : (
            <Banner kind="info" title="Not published">
              The applicant can't see this decision yet.
              {active.on_current_version ? '' : ' It was recorded on an earlier version, so it can’t be published: record a new one.'}
            </Banner>
          )}
        </section>
      ) : (
        <p className="text-ink-muted">No decision has been recorded yet.</p>
      )}
      {c.award ? (
        <section aria-labelledby="award-h" className="flex flex-col gap-2 rounded-md bg-surface-card p-4 shadow-1">
          <h2 id="award-h" className="text-h3 font-semibold">
            Award: {formatBWP(c.award.amount_minor)}
          </h2>
          <p className="whitespace-pre-wrap break-words">{c.award.description}</p>
          <p className="text-sm text-ink-muted">Recorded {formatDateTimeCAT(c.award.recorded_at)}</p>
        </section>
      ) : null}
      {earlier.length ? (
        <details className="rounded-md bg-surface-card shadow-1">
          <summary className="min-h-touch cursor-pointer px-4 py-3 font-semibold">Earlier drafts ({earlier.length})</summary>
          <ul className="flex flex-col gap-3 px-4 pb-4">
            {earlier.map((d) => (
              <li key={d.id}>
                <p className="font-semibold">{OUTCOME_LABEL[d.outcome]}</p>
                <p className="whitespace-pre-wrap break-words">{d.reason}</p>
                <p className="text-sm text-ink-muted">
                  Recorded {formatDateTimeCAT(d.recorded_at)} · replaced {d.superseded_at ? formatDateTimeCAT(d.superseded_at) : ''}
                </p>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </div>
  )
}

type Open = (open: boolean) => void

export function RecordDecisionDialog({ c, open, onOpenChange, onDone }: { c: StaffCase; open: boolean; onOpenChange: Open; onDone: (outcome: DecisionOutcome) => void }) {
  const [outcome, setOutcome] = useState<DecisionOutcome | null>(null)
  const [reason, setReason] = useState('')
  const [errors, setErrors] = useState<{ outcome?: string; reason?: string }>({})
  const id = useId()
  const send = useCallback((input: { outcome: DecisionOutcome; reason: string }) => api.staff.recordDecision({ proposalId: c.id, ...input }), [c.id])
  const landed = useCallback(
    (fresh: StaffCase, input: { outcome: DecisionOutcome; reason: string }) => fresh.decisions.some((d) => !d.superseded_at && d.outcome === input.outcome && d.reason === input.reason),
    [],
  )
  const command = useCaseCommand(c.id, send, landed)

  async function submit() {
    const found: typeof errors = {}
    if (!outcome) found.outcome = 'Choose Approved or Not approved'
    if (!reason.trim()) found.reason = 'Give a reason'
    setErrors(found)
    if (!outcome || found.reason) return
    const final = await command.run({ outcome, reason: reason.trim() })
    if (final.kind === 'done') {
      command.reset()
      setOutcome(null)
      setReason('')
      onDone(outcome)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) command.reset()
        onOpenChange(next)
      }}
      title={`Record decision for ${c.reference}`}
      consequence="The applicant won't see this until you publish."
      primaryLabel="Save decision (not published)"
      onPrimary={() => void submit()}
      busy={command.state.kind === 'saving'}
      audited
    >
      <CommandBanner state={command.state} failed="The decision was not saved." />
      <p className="text-sm">Assessed version: Version {c.version?.version_no ?? 1} (current)</p>
      <fieldset className="flex flex-col gap-2" aria-describedby={errors.outcome ? `${id}-oerr` : undefined}>
        <legend className="font-semibold">
          Outcome <span className="text-sm font-normal text-ink-muted">Required</span>
        </legend>
        {(['approved', 'not_approved'] as const).map((o) => (
          <label key={o} className="flex min-h-touch items-center gap-3">
            <input type="radio" name={`${id}-o`} className="h-5 w-5" checked={outcome === o} onChange={() => setOutcome(o)} />
            {OUTCOME_LABEL[o]}
          </label>
        ))}
        {errors.outcome ? (
          <p id={`${id}-oerr`} className="text-sm text-error">
            {errors.outcome}
          </p>
        ) : null}
      </fieldset>
      <TextField
        multiline
        rows={4}
        id={`${id}-reason`}
        label="Reason"
        required
        maxLength={4000}
        help="The applicant sees this reason once the decision is published."
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        error={errors.reason ?? (command.state.kind === 'refused' ? command.state.fields?.reason : undefined)}
      />
    </Dialog>
  )
}

export function PublishDecisionDialog({ c, open, onOpenChange, onDone }: { c: StaffCase; open: boolean; onOpenChange: Open; onDone: () => void }) {
  const decision = activeDecision(c)
  const send = useCallback((input: { decisionId: string }) => api.staff.publishDecision(input), [])
  const landed = useCallback((fresh: StaffCase, input: { decisionId: string }) => Boolean(fresh.decisions.find((d) => d.id === input.decisionId)?.published_at), [])
  const command = useCaseCommand(c.id, send, landed)
  async function submit() {
    if (!decision) return
    const final = await command.run({ decisionId: decision.id })
    if (final.kind === 'done') {
      command.reset()
      onDone()
    }
  }
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) command.reset()
        onOpenChange(next)
      }}
      title={`Publish decision for ${c.reference}`}
      consequence="The applicant is notified now. This can't be unpublished."
      primaryLabel="Publish to applicant"
      onPrimary={() => void submit()}
      busy={command.state.kind === 'saving'}
      audited
    >
      <CommandBanner state={command.state} failed="The decision was not published." />
      {decision ? (
        <div className="flex flex-col gap-1 rounded-md border border-line p-3">
          <p className="font-semibold">{OUTCOME_LABEL[decision.outcome]}</p>
          <p className="whitespace-pre-wrap break-words">{decision.reason}</p>
        </div>
      ) : null}
    </Dialog>
  )
}

export function RecordAwardDialog({ c, open, onOpenChange, onDone }: { c: StaffCase; open: boolean; onOpenChange: Open; onDone: (amountMinor: number) => void }) {
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [errors, setErrors] = useState<{ amount?: string; description?: string }>({})
  const id = useId()
  const send = useCallback((input: { amountMinor: number; description: string }) => api.staff.recordAward({ proposalId: c.id, ...input }), [c.id])
  const landed = useCallback((fresh: StaffCase) => fresh.award !== null, [])
  const command = useCaseCommand(c.id, send, landed)

  async function submit() {
    const minor = parseBWP(amount)
    const found: typeof errors = {}
    if (minor === null) found.amount = 'Enter an amount in pula, like 250000 or 250,000.50'
    else if (minor < AWARD_MIN_MINOR || minor > AWARD_MAX_MINOR) found.amount = 'Enter an amount between BWP 0.01 and BWP 100,000,000'
    if (!description.trim()) found.description = 'Describe the award'
    setErrors(found)
    if (minor === null || found.amount || found.description) return
    const final = await command.run({ amountMinor: minor, description: description.trim() })
    if (final.kind === 'done') {
      command.reset()
      onDone(minor)
    }
  }

  const parsed = parseBWP(amount)
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) command.reset()
        onOpenChange(next)
      }}
      title={`Record award for ${c.reference}`}
      consequence="The award is recorded as a separate event from the approval, and the applicant is notified."
      primaryLabel="Record award"
      onPrimary={() => void submit()}
      busy={command.state.kind === 'saving'}
      audited
    >
      <CommandBanner state={command.state} failed="The award was not recorded." />
      <TextField
        id={`${id}-amount`}
        label="Amount (BWP)"
        required
        inputMode="decimal"
        help={parsed !== null ? `Recorded as ${formatBWP(parsed)}.` : 'In pula, for example 250000 or 250,000.50.'}
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        error={errors.amount ?? (command.state.kind === 'refused' ? command.state.fields?.amount : undefined)}
      />
      <TextField
        multiline
        rows={3}
        id={`${id}-desc`}
        label="Description"
        required
        maxLength={1000}
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        error={errors.description ?? (command.state.kind === 'refused' ? command.state.fields?.description : undefined)}
      />
    </Dialog>
  )
}

export function CloseCaseDialog({ c, open, onOpenChange, onDone }: { c: StaffCase; open: boolean; onOpenChange: Open; onDone: () => void }) {
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | undefined>()
  const id = useId()
  const send = useCallback((input: { reason: string }) => api.staff.closeCase({ proposalId: c.id, ...input }), [c.id])
  const landed = useCallback((fresh: StaffCase) => fresh.status === 'closed', [])
  const command = useCaseCommand(c.id, send, landed)
  async function submit() {
    if (!reason.trim()) {
      setError('Give a reason')
      return
    }
    setError(undefined)
    const final = await command.run({ reason: reason.trim() })
    if (final.kind === 'done') {
      command.reset()
      setReason('')
      onDone()
    }
  }
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) command.reset()
        onOpenChange(next)
      }}
      title={`Close ${c.reference}`}
      consequence="The case leaves active queues. The applicant is notified and sees the reason."
      primaryLabel="Close case"
      primaryVariant="destructive"
      onPrimary={() => void submit()}
      busy={command.state.kind === 'saving'}
      audited
    >
      <CommandBanner state={command.state} failed="The case was not closed." />
      <TextField
        multiline
        rows={3}
        id={`${id}-reason`}
        label="Reason"
        required
        maxLength={500}
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        error={error ?? (command.state.kind === 'refused' ? command.state.fields?.reason : undefined)}
      />
    </Dialog>
  )
}

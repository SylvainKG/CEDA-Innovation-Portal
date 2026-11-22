import { useCallback, useId, useState } from 'react'
import { Banner, Dialog, TextField } from '@/components'
import { useCaseCommand, useReviewers } from '@/features/staff/queries'
import { api } from '@/lib/api'
import type { CaseAssignment, StaffCase } from '@/lib/api/types'
import { RequiredTag } from '@/components/ErrorSummary'

/** Default due date: 14 days from today (contract §4.2 default), as YYYY-MM-DD in CAT. */
function defaultDueDate(now: Date = new Date()): string {
  return new Date(now.getTime() + 14 * 86_400_000).toLocaleDateString('en-CA', { timeZone: 'Africa/Gaborone' })
}
function tomorrow(now: Date = new Date()): string {
  return new Date(now.getTime() + 86_400_000).toLocaleDateString('en-CA', { timeZone: 'Africa/Gaborone' })
}
/** A due date means the end of the working day: 17:00 CAT (UTC+2) on that date. */
function dueAtFromDate(date: string): string {
  return `${date}T15:00:00.000Z`
}

function CommandBanner({ state, failed }: { state: ReturnType<typeof useCaseCommand>['state']; failed: string }) {
  if (state.kind === 'refused')
    return <Banner kind="error">{state.code === 'INVALID_STATE' ? 'This case has moved on. Close this dialog to see its latest status.' : (state.message ?? failed)}</Banner>
  if (state.kind === 'unconfirmed')
    return (
      <Banner kind="warning" title="Not confirmed yet">
        We couldn't confirm the change was saved. Check your connection and try again: repeating it can't apply it twice.
      </Banner>
    )
  return null
}

/**
 * T10 "Assign reviewers" (spec T10, REV-01): choose reviewers (with their current load) and a due date. Reviewers
 * already active on the case are shown and cannot be chosen again; the server also skips them, so a retry is safe.
 */
export function AssignReviewersDialog({
  c,
  open,
  onOpenChange,
  onDone,
}: {
  c: StaffCase
  open: boolean
  onOpenChange: (open: boolean) => void
  onDone: (names: string[]) => void
}) {
  const reviewers = useReviewers(open)
  const [chosen, setChosen] = useState<string[]>([])
  const [due, setDue] = useState(defaultDueDate)
  const [errors, setErrors] = useState<{ reviewers?: string; due?: string }>({})
  const ids = useId()
  const active = new Set(c.assignments.filter((a) => !a.revoked_at).map((a) => a.reviewer_id))

  const send = useCallback((input: { reviewerIds: string[]; dueAt: string }) => api.staff.assignReviewers({ proposalId: c.id, ...input }), [c.id])
  const landed = useCallback(
    (fresh: StaffCase, input: { reviewerIds: string[] }) => input.reviewerIds.every((r) => fresh.assignments.some((a) => a.reviewer_id === r && !a.revoked_at)),
    [],
  )
  const command = useCaseCommand(c.id, send, landed)

  async function submit() {
    const found: typeof errors = {}
    if (chosen.length === 0) found.reviewers = 'Choose at least one reviewer'
    if (!due) found.due = 'Choose a due date'
    else if (due < tomorrow()) found.due = 'The due date must be in the future'
    setErrors(found)
    if (found.reviewers || found.due) return
    const final = await command.run({ reviewerIds: chosen, dueAt: dueAtFromDate(due) })
    if (final.kind === 'done') {
      const names = chosen.map((id) => reviewers.data?.find((r) => r.id === id)?.name ?? 'Reviewer')
      command.reset()
      setChosen([])
      onDone(names)
    }
  }

  const serverFields = command.state.kind === 'refused' ? command.state.fields : undefined
  const n = chosen.length
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) command.reset()
        onOpenChange(next)
      }}
      title={`Assign reviewers to ${c.reference}`}
      consequence="Reviewers must declare conflicts before they can open the proposal."
      primaryLabel={n === 0 ? 'Assign reviewers' : `Assign ${n} ${n === 1 ? 'reviewer' : 'reviewers'}`}
      onPrimary={() => void submit()}
      busy={command.state.kind === 'saving'}
      audited
    >
      <CommandBanner state={command.state} failed="The reviewers were not assigned." />
      <fieldset className="flex flex-col gap-2" aria-describedby={errors.reviewers || serverFields?.reviewers ? `${ids}-rev-err` : undefined}>
        <legend className="font-semibold">
          Reviewers <RequiredTag />
        </legend>
        {reviewers.isPending ? (
          <p className="text-ink-muted">Loading reviewers…</p>
        ) : reviewers.isError ? (
          <p className="text-error">We couldn't load the reviewers. Close this dialog and try again.</p>
        ) : reviewers.data.length === 0 ? (
          <p className="text-ink-muted">No one holds the reviewer role yet. Grant it in Users & roles first.</p>
        ) : (
          reviewers.data.map((r) => {
            const already = active.has(r.id)
            return (
              <div key={r.id} className="flex min-h-touch items-center gap-3">
                <input
                  id={`${ids}-r-${r.id}`}
                  type="checkbox"
                  className="h-5 w-5"
                  checked={already || chosen.includes(r.id)}
                  disabled={already}
                  aria-describedby={`${ids}-load-${r.id}`}
                  onChange={(e) => setChosen((prev) => (e.target.checked ? [...prev, r.id] : prev.filter((x) => x !== r.id)))}
                />
                <span className="flex flex-col">
                  <label htmlFor={`${ids}-r-${r.id}`}>{r.name}</label>
                  <span id={`${ids}-load-${r.id}`} className="text-sm text-ink-muted">
                    {already ? 'Already assigned to this case' : `${r.active_assignments} active ${r.active_assignments === 1 ? 'review' : 'reviews'}`}
                  </span>
                </span>
              </div>
            )
          })
        )}
        {errors.reviewers || serverFields?.reviewers ? (
          <p id={`${ids}-rev-err`} className="text-sm text-error">
            {errors.reviewers ?? serverFields?.reviewers}
          </p>
        ) : null}
      </fieldset>
      <TextField
        id={`${ids}-due`}
        type="date"
        label="Due date"
        required
        min={tomorrow()}
        help="Reviews are due by 17:00 CAT on this date. The default is 14 days from today."
        value={due}
        onChange={(e) => setDue(e.target.value)}
        error={errors.due ?? serverFields?.due_at}
      />
    </Dialog>
  )
}

/** T10 "Remove reviewer": a required reason; scores already submitted are kept (contract §4.2). */
export function RemoveReviewerDialog({
  c,
  assignment,
  name,
  onOpenChange,
  onDone,
}: {
  c: StaffCase
  assignment: CaseAssignment | null
  name: string
  onOpenChange: (open: boolean) => void
  onDone: (name: string) => void
}) {
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | undefined>()
  const id = useId()
  const send = useCallback((input: { assignmentId: string; reason: string }) => api.staff.revokeAssignment(input), [])
  const landed = useCallback((fresh: StaffCase, input: { assignmentId: string }) => Boolean(fresh.assignments.find((a) => a.id === input.assignmentId)?.revoked_at), [])
  const command = useCaseCommand(c.id, send, landed)

  async function submit() {
    if (!assignment) return
    if (!reason.trim()) {
      setError('Give a reason')
      return
    }
    setError(undefined)
    const final = await command.run({ assignmentId: assignment.id, reason: reason.trim() })
    if (final.kind === 'done') {
      command.reset()
      setReason('')
      onDone(name)
    }
  }

  return (
    <Dialog
      open={assignment !== null}
      onOpenChange={(next) => {
        if (!next) command.reset()
        onOpenChange(next)
      }}
      title={`Remove ${name} from ${c.reference}`}
      consequence="The reviewer loses access to this case. Any scores they already submitted are kept."
      primaryLabel="Remove reviewer"
      primaryVariant="destructive"
      onPrimary={() => void submit()}
      busy={command.state.kind === 'saving'}
      audited
    >
      <CommandBanner state={command.state} failed="The reviewer was not removed." />
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

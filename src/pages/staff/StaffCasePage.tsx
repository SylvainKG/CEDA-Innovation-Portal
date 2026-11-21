import { useCallback, useId, useState } from 'react'
import { VersionCompare } from './VersionCompare'
import { Link, useParams } from 'react-router-dom'
import { Banner, Button, ButtonLink, Dialog, ReferencePill, StageTimeline, StatusBadge, TextField } from '@/components'
import { Tabs } from '@/components/Tabs'
import { ErrorState, LoadingState, NotFoundState } from '@/components/states/States'
import { stagesFor } from '@/features/ideas/idea-view'
import { activeDecision, eventLabel } from '@/features/staff/case-view'
import { useRecordScreening, useStaffCase } from '@/features/staff/queries'
import { AssignReviewersDialog, RemoveReviewerDialog } from './AssignmentDialogs'
import { NotesTab } from './NotesTab'
import { RequestFeedbackDialog } from './RequestFeedbackDialog'
import { FeedbackList } from '@/pages/feedback/FeedbackList'
import { useRoadmap } from '@/features/feedback/queries'
import { CloseCaseDialog, DecisionTab, PublishDecisionDialog, RecordAwardDialog, RecordDecisionDialog } from './DecisionActions'
import { formatBWP } from '@/lib/money'
import type { CaseAssignment, ScreeningResult, StaffCase } from '@/lib/api/types'
import { formatBytes, formatDateCAT, formatDateTimeCAT } from '@/lib/format'
import { useSession } from '@/lib/session'
import { RequiredTag } from '@/components/ErrorSummary'

/**
 * T08 staff case workspace (spec T08), built from the written spec (BCR-003; design review pending). Slice 2:
 * Proposal, Timeline and Reviewers tabs, and the screening action (T10). Notes, evaluations, feedback and
 * decision tabs arrive with their slices. Tabs and actions follow the reader's permissions; the server checks
 * them again on every read and action.
 */
export function StaffCasePage() {
  const { id } = useParams()
  const kase = useStaffCase(id)
  const { data: user } = useSession()
  const [screeningOpen, setScreeningOpen] = useState(false)
  const [assignOpen, setAssignOpen] = useState(false)
  const [removing, setRemoving] = useState<{ assignment: CaseAssignment; name: string } | null>(null)
  const [dialog, setDialog] = useState<'decide' | 'publish' | 'award' | 'close' | 'clarify' | 'revise' | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const onScreened = useCallback((result: ScreeningResult) => {
    setScreeningOpen(false)
    setNotice(
      result === 'eligible'
        ? 'Recorded as eligible. The case moved to evaluation.'
        : 'Recorded as not eligible. The case is closed and the applicant is notified.',
    )
  }, [])

  if (kase.isPending) return <LoadingState what="the case" />
  if (kase.isError) return <ErrorState level="h1" message="We couldn't load this case." onRetry={() => void kase.refetch()} />
  if (!kase.data) return <NotFoundState home="/staff" />
  const c = kase.data

  const canScreen = Boolean(user?.roles.includes('screening_officer'))
  // case.assign is the admin's permission (contract §2); the server checks it again.
  const canAssign = Boolean(user?.roles.includes('admin'))
  // scorecard.read_panel (contract §2): adjudicators and admins.
  const canPanel = Boolean(user?.roles.some((r) => r === 'adjudicator' || r === 'admin'))
  // case.note (contract §2): screening officers, reviewers, adjudicators and admins. Never applicants.
  const canNote = Boolean(user?.roles.some((r) => r === 'screening_officer' || r === 'reviewer' || r === 'adjudicator' || r === 'admin'))
  // decision.record / decision.publish: adjudicator. award.record: admin (D-05). case.close: screening officer, adjudicator.
  const canDecide = Boolean(user?.roles.includes('adjudicator'))
  const canAward = Boolean(user?.roles.includes('admin'))
  const canClose = Boolean(user?.roles.some((r) => r === 'screening_officer' || r === 'adjudicator')) && !['approved', 'awarded', 'draft', 'closed'].includes(c.status)
  // case.read_all holders see decisions, drafts included (contract §3).
  const canSeeDecision = Boolean(user?.roles.some((r) => r === 'screening_officer' || r === 'adjudicator' || r === 'admin'))
  // case.request_feedback + case.read_all (contract §2, §4.4): screening officers and adjudicators, while the case is being reviewed.
  const canAsk = Boolean(user?.roles.some((r) => r === 'screening_officer' || r === 'adjudicator')) && ['submitted', 'in_evaluation', 'in_adjudication'].includes(c.status)
  const closeDialog = (open: boolean) => setDialog(open ? dialog : null)
  const stages = stagesFor({
    status: c.status,
    stages: c.events
      .filter((e) => e.public_stage)
      .map((e) => ({ stage: e.public_stage!, at: e.at }))
      .filter((s, i, all) => all.findIndex((x) => x.stage === s.stage) === i),
  })
  const closedReason = c.status === 'closed' ? [...c.events].reverse().find((e) => e.to_status === 'closed')?.reason : undefined

  return (
    <div className="flex flex-col gap-6">
      <p>
        {canScreen ? (
          <Link to="/staff/queue/screening">← Screening queue</Link>
        ) : canAssign ? (
          <Link to="/staff/cases">← All cases</Link>
        ) : user?.roles.includes('adjudicator') ? (
          <Link to="/staff/queue/decision">← Ready for decision</Link>
        ) : (
          <Link to="/staff">← Staff home</Link>
        )}
      </p>

      <header className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <ReferencePill reference={c.reference} copyable />
          <StatusBadge status={c.status} audience="staff" context={{ decisionDrafted: Boolean(activeDecision(c) && !activeDecision(c)?.published_at) }} />
        </div>
        <h1 className="text-h1 font-semibold">{c.title}</h1>
        <p className="text-ink-muted">
          {c.challenge.title} · Submitted {formatDateTimeCAT(c.submitted_at)}
        </p>
        <StageTimeline stages={stages} compact />
        {closedReason ? <Banner kind="info" title="Closed">{closedReason}</Banner> : null}
        {notice ? <Banner kind="success">{notice}</Banner> : null}
        <PrimaryAction
          c={c}
          canScreen={canScreen}
          canAssign={canAssign}
          canPanel={canPanel}
          canDecide={canDecide}
          canAward={canAward}
          onScreen={() => setScreeningOpen(true)}
          onAssign={() => setAssignOpen(true)}
          onDialog={setDialog}
        />
        {canAsk || canClose ? (
          <div className="flex flex-wrap gap-2">
            {canAsk ? (
              <>
                <Button variant="secondary" size="sm" onClick={() => setDialog('clarify')}>
                  Request clarification
                </Button>
                <Button variant="secondary" size="sm" onClick={() => setDialog('revise')}>
                  Request revision
                </Button>
              </>
            ) : null}
            {canClose ? (
              <Button variant="secondary" size="sm" onClick={() => setDialog('close')}>
                Close case
              </Button>
            ) : null}
          </div>
        ) : null}
      </header>

      <Tabs
        label="Case sections"
        tabs={[
          { id: 'proposal', label: 'Proposal', content: <ProposalTab c={c} /> },
          { id: 'timeline', label: 'Timeline', content: <TimelineTab c={c} /> },
          ...((c.version?.version_no ?? 1) >= 2 ? [{ id: 'versions', label: 'Compare versions', content: <VersionCompare proposalId={c.id} schema={c.form_schema} /> }] : []),
          {
            id: 'reviewers',
            label: 'Reviewers',
            content: <ReviewersTab assignments={c.assignments} onRemove={canAssign ? (assignment, name) => setRemoving({ assignment, name }) : undefined} />,
          },
          ...(canSeeDecision ? [{ id: 'feedback', label: 'Feedback', content: <StaffFeedbackTab proposalId={c.id} /> }] : []),
          ...(canSeeDecision ? [{ id: 'decision', label: 'Decision', content: <DecisionTab c={c} /> }] : []),
          ...(canNote ? [{ id: 'notes', label: 'Internal notes', content: <NotesTab proposalId={c.id} /> }] : []),
        ]}
      />

      {canScreen ? (
        <ScreeningDialog
          c={c}
          open={screeningOpen}
          onOpenChange={setScreeningOpen}
          onDone={onScreened}
        />
      ) : null}
      {canDecide ? (
        <>
          <RecordDecisionDialog
            c={c}
            open={dialog === 'decide'}
            onOpenChange={closeDialog}
            onDone={(outcome) => {
              setDialog(null)
              setNotice(`Decision saved as ${outcome === 'approved' ? 'Approved' : 'Not approved'}. It is not published: the applicant can't see it yet.`)
            }}
          />
          <PublishDecisionDialog
            c={c}
            open={dialog === 'publish'}
            onOpenChange={closeDialog}
            onDone={() => {
              setDialog(null)
              setNotice('Decision published. The applicant is notified.')
            }}
          />
        </>
      ) : null}
      {canAward ? (
        <RecordAwardDialog
          c={c}
          open={dialog === 'award'}
          onOpenChange={closeDialog}
          onDone={(minor) => {
            setDialog(null)
            setNotice(`Award of ${formatBWP(minor)} recorded. The applicant is notified.`)
          }}
        />
      ) : null}
      {canClose || dialog === 'close' ? (
        <CloseCaseDialog
          c={c}
          open={dialog === 'close'}
          onOpenChange={closeDialog}
          onDone={() => {
            setDialog(null)
            setNotice('Case closed. The applicant is notified and sees the reason.')
          }}
        />
      ) : null}
      {canAsk || dialog === 'clarify' || dialog === 'revise' ? (
        <>
          <RequestFeedbackDialog
            c={c}
            kind="clarification"
            open={dialog === 'clarify'}
            onOpenChange={closeDialog}
            onDone={() => {
              setDialog(null)
              setNotice('Question sent. The case now waits on the applicant, who must reply in writing.')
            }}
          />
          <RequestFeedbackDialog
            c={c}
            kind="revision"
            open={dialog === 'revise'}
            onOpenChange={closeDialog}
            onDone={() => {
              setDialog(null)
              setNotice('Revision request sent. The case now waits on the applicant to submit a new version.')
            }}
          />
        </>
      ) : null}
      {canAssign ? (
        <>
          <AssignReviewersDialog
            c={c}
            open={assignOpen}
            onOpenChange={setAssignOpen}
            onDone={(names) => {
              setAssignOpen(false)
              setNotice(`Assigned ${names.join(' and ')}. Reviewers must declare conflicts before they can open the proposal.`)
            }}
          />
          <RemoveReviewerDialog
            c={c}
            assignment={removing?.assignment ?? null}
            name={removing?.name ?? 'reviewer'}
            onOpenChange={(open) => {
              if (!open) setRemoving(null)
            }}
            onDone={(name) => {
              setRemoving(null)
              setNotice(`Removed ${name} from this case. Their submitted scores are kept.`)
            }}
          />
        </>
      ) : null}
    </div>
  )
}

function StaffFeedbackTab({ proposalId }: { proposalId: string }) {
  const roadmap = useRoadmap(proposalId)
  if (roadmap.isPending) return <p className="text-ink-muted">Loading feedback…</p>
  if (roadmap.isError || !roadmap.data) return <p className="text-error">We couldn't load the feedback.</p>
  return <FeedbackList requests={roadmap.data} />
}

/** The single primary action for this role and state (spec T08 header). */
function PrimaryAction({
  c,
  canScreen,
  canAssign,
  canPanel,
  canDecide,
  canAward,
  onScreen,
  onAssign,
  onDialog,
}: {
  c: StaffCase
  canScreen: boolean
  canAssign: boolean
  canPanel: boolean
  canDecide: boolean
  canAward: boolean
  onScreen: () => void
  onAssign: () => void
  onDialog: (d: 'decide' | 'publish' | 'award') => void
}) {
  const decision = activeDecision(c)
  if (c.status === 'in_adjudication' && canDecide) {
    const publishable = decision && !decision.published_at && decision.on_current_version
    return (
      <div className="flex flex-wrap items-center gap-3">
        {publishable ? (
          <>
            <Button onClick={() => onDialog('publish')}>Publish decision</Button>
            <Button variant="secondary" onClick={() => onDialog('decide')}>
              Change decision
            </Button>
          </>
        ) : (
          <Button onClick={() => onDialog('decide')}>Record decision</Button>
        )}
        <ButtonLink to={`/staff/cases/${c.id}/panel`} variant="secondary">
          Open score panel
        </ButtonLink>
      </div>
    )
  }
  if (c.status === 'approved') {
    if (canAward && !c.award)
      return (
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={() => onDialog('award')}>Record award</Button>
          <span className="text-ink-muted">The approval is published.</span>
        </div>
      )
    return <p className="text-ink-muted">Approved and published. The administrator records the award.</p>
  }
  if (c.status === 'awarded' && c.award) return <p className="text-ink-muted">Awarded {formatBWP(c.award.amount_minor)}.</p>
  if (c.status === 'submitted') {
    if (!canScreen) return <p className="text-ink-muted">Waiting for a screening officer to record eligibility.</p>
    return (
      <div>
        <Button onClick={onScreen}>Record screening</Button>
      </div>
    )
  }
  if (c.status === 'in_adjudication' && canPanel) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <ButtonLink to={`/staff/cases/${c.id}/panel`}>Open score panel</ButtonLink>
        <span className="text-ink-muted">All reviews are in. The adjudicator records and publishes the decision.</span>
      </div>
    )
  }
  if (c.status === 'in_evaluation' && canAssign) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={onAssign}>Assign reviewers</Button>
        <span className="text-ink-muted">
          {c.active_reviewers === 0 ? 'No reviewers yet.' : `${c.active_reviewers} ${c.active_reviewers === 1 ? 'reviewer' : 'reviewers'} assigned.`}
        </span>
      </div>
    )
  }
  return null
}

function ProposalTab({ c }: { c: StaffCase }) {
  if (!c.version) return <p className="text-ink-muted">No submitted version is available.</p>
  const answers = c.version.data
  const docLabel = (key: string | null) => c.required_docs.find((d) => d.key === key)?.label
  return (
    <div className="flex max-w-form flex-col gap-6">
      <p className="text-sm text-ink-muted">
        Version {c.version.version_no} · submitted {formatDateTimeCAT(c.version.submitted_at)} · declaration {c.version.declaration_version}
      </p>
      {c.form_schema.sections.map((section) => (
        <section key={section.key} aria-labelledby={`sec-${section.key}`} className="flex flex-col gap-3 rounded-md bg-surface-card p-4 shadow-1">
          <h2 id={`sec-${section.key}`} className="text-h3 font-semibold">
            {section.title}
          </h2>
          <dl className="flex flex-col gap-3">
            {section.fields.map((f) => (
              <div key={f.key} className="flex flex-col gap-1">
                <dt className="text-sm font-semibold text-ink-muted">{f.label}</dt>
                <dd className="whitespace-pre-wrap break-words">{answers[f.key]?.trim() ? answers[f.key] : <span className="text-ink-muted">Not answered</span>}</dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
      <section aria-labelledby="sec-files" className="flex flex-col gap-3 rounded-md bg-surface-card p-4 shadow-1">
        <h2 id="sec-files" className="text-h3 font-semibold">
          Files
        </h2>
        {c.files.length === 0 ? (
          <p className="text-ink-muted">No files attached.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {c.files.map((f) => (
              <li key={f.id} className="flex flex-wrap justify-between gap-2">
                <span className="break-all">{f.filename}</span>
                <span className="text-sm text-ink-muted">
                  {docLabel(f.doc_key) ? `${docLabel(f.doc_key)} · ` : ''}
                  {formatBytes(f.size_bytes)}
                </span>
              </li>
            ))}
          </ul>
        )}
        <p className="text-sm text-ink-muted">Downloads open through a short-lived secure link; they arrive with the file viewer.</p>
      </section>
    </div>
  )
}

function TimelineTab({ c }: { c: StaffCase }) {
  const events = [...c.events].reverse()
  return (
    <ol className="flex max-w-form flex-col gap-3">
      {events.map((e, i) => (
        <li key={`${e.at}-${i}`} className="flex flex-col gap-1 rounded-md bg-surface-card p-4 shadow-1">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <span className="font-semibold">{eventLabel(e.to_status, e.from_status)}</span>
            <time dateTime={e.at} className="text-sm text-ink-muted">
              {formatDateTimeCAT(e.at)}
            </time>
          </div>
          {e.reason ? <p className="whitespace-pre-wrap break-words">{e.reason}</p> : null}
        </li>
      ))}
    </ol>
  )
}

function declarationText(a: CaseAssignment): string {
  if (a.revoked_at) return `Removed ${formatDateCAT(a.revoked_at)}`
  if (a.declared_at === null) return 'Declaration needed'
  return a.has_conflict ? 'Declared a conflict' : 'Declared: no conflict'
}

function ReviewersTab({ assignments, onRemove }: { assignments: CaseAssignment[]; onRemove?: (a: CaseAssignment, name: string) => void }) {
  if (assignments.length === 0) return <p className="text-ink-muted">No reviewers are assigned yet. An administrator assigns reviewers once the case is eligible.</p>
  return (
    <ul className="flex max-w-form flex-col gap-3">
      {assignments.map((a, i) => (
        <li key={a.id} className="flex flex-col gap-1 rounded-md bg-surface-card p-4 shadow-1">
          <span className="font-semibold">{a.reviewer_name ?? `Reviewer ${i + 1}`}</span>
          <span className="text-sm text-ink-muted">
            Assigned {formatDateCAT(a.assigned_at)}
            {a.due_at ? ` · due ${formatDateCAT(a.due_at)}` : ''}
          </span>
          <span>{declarationText(a)}</span>
          {onRemove && !a.revoked_at ? (
            <div>
              <Button variant="secondary" size="sm" onClick={() => onRemove(a, a.reviewer_name ?? `Reviewer ${i + 1}`)}>
                Remove reviewer
              </Button>
            </div>
          ) : null}
        </li>
      ))}
    </ul>
  )
}

/** T10 "Record screening": result and a required reason; server wording for refusals (contract §4.2). */
function ScreeningDialog({
  c,
  open,
  onOpenChange,
  onDone,
}: {
  c: StaffCase
  open: boolean
  onOpenChange: (open: boolean) => void
  onDone: (result: ScreeningResult) => void
}) {
  const screening = useRecordScreening(c.id)
  const [result, setResult] = useState<ScreeningResult | null>(null)
  const [reason, setReason] = useState('')
  const [errors, setErrors] = useState<{ result?: string; reason?: string }>({})
  const groupId = useId()

  async function submit() {
    const found: typeof errors = {}
    if (!result) found.result = 'Choose Eligible or Not eligible'
    if (!reason.trim()) found.reason = 'Give a reason'
    setErrors(found)
    if (!result || found.reason) return
    const final = await screening.record(result, reason.trim())
    if (final.kind === 'done') {
      screening.reset()
      setResult(null)
      setReason('')
      onDone(final.status === 'closed' ? 'ineligible' : 'eligible')
    }
  }

  const s = screening.state
  const serverFields = s.kind === 'refused' ? s.fields : undefined

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) screening.reset()
        onOpenChange(next)
      }}
      title={`Record screening for ${c.reference}`}
      consequence="Eligible cases move to evaluation. Not eligible closes the case and notifies the applicant."
      primaryLabel="Record result"
      onPrimary={() => void submit()}
      busy={s.kind === 'saving'}
      audited
    >
      {s.kind === 'refused' ? (
        <Banner kind="error">
          {s.code === 'INVALID_STATE' ? 'This case has moved on. Close this dialog to see its latest status.' : (s.message ?? 'The result was not recorded.')}
        </Banner>
      ) : null}
      {s.kind === 'unconfirmed' ? (
        <Banner kind="warning" title="Not confirmed yet">
          We couldn't confirm the result was saved. Check your connection and try again: repeating it can't record it twice.
        </Banner>
      ) : null}
      <fieldset className="flex flex-col gap-2" aria-describedby={errors.result || serverFields?.result ? `${groupId}-err` : undefined}>
        <legend className="font-semibold">
          Result <RequiredTag />
        </legend>
        {(
          [
            ['eligible', 'Eligible'],
            ['ineligible', 'Not eligible'],
          ] as const
        ).map(([value, label]) => (
          <label key={value} className="flex min-h-touch items-center gap-3">
            <input type="radio" name={`${groupId}-result`} value={value} checked={result === value} onChange={() => setResult(value)} className="h-5 w-5" />
            {label}
          </label>
        ))}
        {errors.result || serverFields?.result ? (
          <p id={`${groupId}-err`} className="text-sm text-error">
            {errors.result ?? serverFields?.result}
          </p>
        ) : null}
      </fieldset>
      <TextField
        multiline
        rows={4}
        id={`${groupId}-reason`}
        label="Reason"
        required
        maxLength={1000}
        help="If the case is not eligible, the applicant sees this reason."
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        error={errors.reason ?? serverFields?.reason}
      />
    </Dialog>
  )
}

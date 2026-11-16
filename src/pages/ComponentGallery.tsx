import { useState, type ReactNode } from 'react'
import { BarChart3, ClipboardCheck, Gavel, Send } from 'lucide-react'
import {
  AutosaveIndicator,
  Banner,
  Button,
  CompletenessMeter,
  DashboardCard,
  DataTable,
  DeclarationPanel,
  Dialog,
  EmptyState,
  ErrorState,
  FileUpload,
  ForbiddenState,
  IdeaCard,
  LoadingState,
  NotificationItem,
  ProgressIndicator,
  ReceiptCard,
  ReferencePill,
  Select,
  StageTimeline,
  StatusBadge,
  TextField,
  UnknownOutcomeBanner,
  type IdeaCardModel,
  type UploadState,
} from '@/components'
import type { CaseStatus } from '@/lib/api/types'

/**
 * Development-only component gallery, for visual review (Sandra) and buildability checks before
 * screens exist. Mock mode only; uses the fictional demo data from
 * docs/design/figma-handoff/prompts/dashboards.md §C. Not part of the product.
 */

const STATUSES: CaseStatus[] = ['draft', 'submitted', 'in_evaluation', 'action_required', 'in_adjudication', 'approved', 'not_approved', 'awarded', 'closed']

const IDEAS: IdeaCardModel[] = [
  {
    id: '0009',
    title: 'Smart canal gate controller',
    challenge: 'Water-Smart Agriculture Challenge 2026',
    reference: 'CEDA-2026-0009',
    status: 'submitted',
    updatedAt: '2026-11-15T08:20:00Z',
    stages: [{ stage: 'submission', state: 'current', at: '2026-11-15T08:20:00Z' }],
    primaryAction: { label: 'View idea', to: '/ideas/0009' },
  },
  {
    id: '0006',
    title: 'Rainwater harvesting tanks',
    challenge: 'Water-Smart Agriculture Challenge 2026',
    reference: 'CEDA-2026-0006',
    status: 'action_required',
    feedbackKind: 'revision',
    updatedAt: '2026-11-15T10:00:00Z',
    deadline: '2026-11-20T14:00:00Z',
    stages: [
      { stage: 'submission', state: 'done', at: '2026-11-11T09:00:00Z' },
      { stage: 'review', state: 'done', at: '2026-11-12T09:00:00Z' },
      { stage: 'feedback', state: 'current', at: '2026-11-15T10:00:00Z' },
    ],
    primaryAction: { label: 'Revise your idea', to: '/ideas/0006/revise' },
  },
  {
    id: 'draft-1',
    title: 'Solar-powered borehole sensor',
    challenge: 'Water-Smart Agriculture Challenge 2026',
    reference: null,
    status: 'draft',
    updatedAt: '2026-11-16T07:45:00Z',
    stages: [],
    primaryAction: { label: 'Continue draft', to: '/ideas/draft-1/edit' },
  },
]

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4 border-t border-line pt-6">
      <h2 className="text-h2 font-semibold">{title}</h2>
      {children}
    </section>
  )
}

export function ComponentGallery() {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [upload, setUpload] = useState<UploadState>({ kind: 'idle' })
  const [accepted, setAccepted] = useState(false)
  const [text, setText] = useState('')

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-h1 font-bold">Component gallery</h1>
        <Banner kind="demo" title="Development only">
          Shared components with fictional data, for design review. Not a product screen.
        </Banner>
      </header>

      <Section title="Buttons">
        <div className="flex flex-wrap gap-3">
          <Button icon={Send}>Submit idea</Button>
          <Button variant="secondary">Save draft</Button>
          <Button variant="tertiary">Edit</Button>
          <Button variant="destructive">Close case</Button>
          <Button loading loadingLabel="Submitting…">
            Submit idea
          </Button>
          <Button disabled disabledReason="Answer all 3 tasks to submit.">
            Submit Version 2
          </Button>
        </div>
      </Section>

      <Section title="Status badges (applicant / staff wording)">
        <div className="grid gap-3 md:grid-cols-2">
          {STATUSES.map((s) => (
            <div key={s} className="flex flex-wrap items-center gap-2">
              <StatusBadge status={s} audience="applicant" context={{ feedbackKind: 'revision' }} />
              <StatusBadge status={s} audience="staff" context={{ feedbackKind: 'revision', scores: { scored: 1, required: 2 }, closedReason: 'not eligible' }} />
            </div>
          ))}
        </div>
      </Section>

      <Section title="Reference and timeline">
        <ReferencePill reference="CEDA-2026-0009" copyable />
        <StageTimeline
          stages={[
            { stage: 'submission', state: 'done', at: '2026-11-11T09:00:00Z' },
            { stage: 'review', state: 'done', at: '2026-11-12T09:00:00Z' },
            { stage: 'feedback', state: 'done', at: '2026-11-15T10:00:00Z' },
            { stage: 'approval', state: 'current', at: '2026-11-19T09:00:00Z' },
            { stage: 'award', state: 'upcoming' },
          ]}
        />
      </Section>

      <Section title="Idea cards (T06 applicant)">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {IDEAS.map((idea) => (
            <IdeaCard key={idea.id} idea={idea} now={new Date('2026-11-15T12:00:00Z')} />
          ))}
        </div>
      </Section>

      <Section title="Banners">
        <Banner kind="action" title="Action required" action={<Button size="sm">Respond</Button>}>
          CEDA asked you to revise CEDA-2026-0006. Respond by 20 Nov 2026, 16:00 CAT (in 5 days).
        </Banner>
        <Banner kind="info">Chat is open Monday–Friday, 09:00–16:00 (Gaborone time).</Banner>
        <Banner kind="warning">Your session expires in 2 minutes. Save your work.</Banner>
        <Banner kind="error">We couldn't load your ideas.</Banner>
        <Banner kind="success">Your reply was sent.</Banner>
        <UnknownOutcomeBanner what="submission" onCheckStatus={() => undefined} />
      </Section>

      <Section title="Dashboard cards">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <DashboardCard icon={ClipboardCheck} label="Awaiting screening" value={2} definition="Submitted cases not yet screened" />
          <DashboardCard icon={Send} label="Submitted" value={9} definition="Cases submitted in the selected period" />
          <DashboardCard icon={Gavel} label="Ready for decision" value={1} definition="Cases with 2 of 2 scorecards" />
          <DashboardCard icon={BarChart3} label="Overdue tasks" value={1} definition="Screening waiting more than 2 days" />
        </div>
      </Section>

      <Section title="Data table (cards below 768 px)">
        <DataTable
          caption="Screening queue"
          columns={[
            { key: 'ref', header: 'Reference', primary: true, cell: (r: { ref: string; title: string; waiting: string }) => <span className="font-mono">{r.ref}</span> },
            { key: 'title', header: 'Title', cell: (r) => r.title },
            { key: 'waiting', header: 'Waiting', cell: (r) => r.waiting },
            { key: 'status', header: 'Status', cell: () => <StatusBadge status="submitted" audience="staff" /> },
          ]}
          rows={[
            { ref: 'CEDA-2026-0007', title: 'Livestock water point mapping', waiting: '2 days' },
            { ref: 'CEDA-2026-0009', title: 'Smart canal gate controller', waiting: 'Today' },
          ]}
          getRowKey={(r) => r.ref}
          empty={<EmptyState title="No cases are waiting for screening" />}
        />
      </Section>

      <Section title="Form controls">
        <div className="grid max-w-form gap-4">
          <AutosaveIndicator state={{ kind: 'saved', at: '2026-11-16T12:05:00Z' }} />
          <AutosaveIndicator state={{ kind: 'local' }} />
          <TextField label="Idea title" required maxLength={120} value={text} onChange={(e) => setText(e.target.value)} help="A short, plain-language name." />
          <TextField label="Problem statement" required multiline error="Add a problem statement to submit. Your draft is saved." value="" onChange={() => undefined} />
          <Select label="Challenge" required placeholder="Choose a challenge" options={[{ value: 'water', label: 'Water-Smart Agriculture Challenge 2026' }]} />
          <FileUpload
            label="Business plan"
            required
            accept={['.pdf', '.docx', '.xlsx', '.png', '.jpg']}
            maxSizeBytes={10 * 1024 * 1024}
            state={upload}
            onFileSelected={(f) => setUpload({ kind: 'uploaded', fileName: f.name, sizeBytes: f.size })}
            onFileRejected={(fileName, reason) => setUpload({ kind: 'rejected', fileName, reason })}
          />
          <ProgressIndicator label="Uploading plan.pdf" value={45} />
          <CompletenessMeter
            sections={[
              { id: 'about', label: 'About you', complete: true, href: '#about' },
              { id: 'overview', label: 'Idea overview', complete: true, href: '#overview' },
              { id: 'innovation', label: 'Innovation & feasibility', complete: false, href: '#innovation' },
              { id: 'impact', label: 'Impact', complete: false, href: '#impact' },
            ]}
          />
          <DeclarationPanel
            kind="applicant"
            sampleWording
            terms={<p>Sample wording: I confirm the idea is my own work and I agree that CEDA may use the information to assess it.</p>}
            accepted={accepted}
            onAcceptedChange={setAccepted}
          />
          <DeclarationPanel
            kind="reviewer"
            sampleWording
            terms={<p>Sample wording: I will keep this proposal confidential and declare any personal or financial interest.</p>}
            onDeclare={() => undefined}
          />
        </div>
      </Section>

      <Section title="Receipt (T05)">
        <ReceiptCard
          receipt={{
            reference: 'CEDA-2026-0009',
            version: 1,
            submittedAt: '2026-11-15T08:20:00Z',
            challenge: 'Water-Smart Agriculture Challenge 2026',
            formVersion: 'Form v1',
            files: [{ name: 'business-plan.pdf', sizeBytes: 1_250_000 }],
            declarationAccepted: true,
          }}
        />
      </Section>

      <Section title="Dialog and notifications">
        <Button onClick={() => setOpen(true)}>Open publish dialog</Button>
        <Dialog
          open={open}
          onOpenChange={setOpen}
          title="Publish decision for CEDA-2026-0004"
          consequence="The applicant is notified now. This can't be unpublished."
          primaryLabel="Publish to applicant"
          audited
          busy={busy}
          onPrimary={() => {
            setBusy(true)
            window.setTimeout(() => {
              setBusy(false)
              setOpen(false)
            }, 800)
          }}
        />
        <div className="max-w-form">
          <NotificationItem title="CEDA asked you to revise your idea" reference="CEDA-2026-0006" createdAt="2026-11-15T10:00:00Z" unread to="/ideas/0006" />
          <NotificationItem title="Your idea was submitted" reference="CEDA-2026-0009" createdAt="2026-11-15T08:20:00Z" unread={false} to="/ideas/0009" />
        </div>
      </Section>

      <Section title="States">
        <LoadingState what="your ideas" />
        <EmptyState title="You haven't started an idea yet">Open challenges are listed on the Challenges page.</EmptyState>
        <ErrorState message="We couldn't load your ideas." onRetry={() => undefined} />
        <ForbiddenState />
      </Section>
    </div>
  )
}

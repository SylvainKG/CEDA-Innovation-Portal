import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useRoutes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mockFeedback, mockFeedbackControls } from '@/lib/api/mock/feedback'
import { WATER_SMART_ID } from '@/lib/api/mock/fixtures'
import { mockReview, mockReviewControls } from '@/lib/api/mock/review'
import { mockSession } from '@/lib/api/mock/session'
import { mockStaff, mockStaffControls } from '@/lib/api/mock/staff'
import { mockSubmission, mockSubmissionControls } from '@/lib/api/mock/submission'
import type { DraftData, Role } from '@/lib/api/types'
import { routes } from '@/routes/router'

/** Multi-step journeys: allow more than Vitest's 5 s default under full-suite load. */
const JOURNEY = 20_000

const CASE_8 = '30000000-0000-4000-8000-000000000008' // Applicant A's seeded idea, in evaluation
const R1_ON_8 = '40000000-0000-4000-8000-000000080001'
const R2_ON_8 = '40000000-0000-4000-8000-000000080002'
const LONG = 'A clear reason that is long enough.'

const COMPLETE: DraftData = {
  applicant_name: 'Demo Applicant A',
  contact_email: 'applicant.a@example.test',
  title: 'Solar drip irrigation kit (DEMO)',
  summary: 'A low-cost drip kit.',
  sector: 'Crops',
  problem: 'Water is scarce.',
  solution: 'Solar drip.',
  impact: 'Less water.',
}

function renderAt(path: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  function App() {
    return useRoutes(routes)
  }
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <App />
      </MemoryRouter>
    </QueryClientProvider>,
  )
  return userEvent.setup()
}

const as = (role: Role | null) => mockSession.switchDemoRole?.(role)
const LOAD = { timeout: 5000 }

async function applicantSubmits(): Promise<string> {
  await as('applicant')
  const saved = await mockSubmission.saveDraft({ challengeId: WATER_SMART_ID, data: COMPLETE })
  if (saved.kind !== 'ok') throw new Error('save failed')
  const id = saved.data.proposal_id
  await mockSubmission.uploadAttachment({ proposalId: id, file: new File([new Uint8Array(100)], 'plan.pdf', { type: 'application/pdf' }), docKey: 'business_plan' })
  const sent = await mockSubmission.submitProposal({ proposalId: id, clientRequestId: crypto.randomUUID(), declarationVersion: 'sample-2026-11-v1' })
  if (sent.kind !== 'ok') throw new Error('submit failed')
  return id
}

/** Both reviewers score case 0008, which moves it to adjudication (quorum 2). */
async function reviewsIn() {
  mockReviewControls.submitAs(R2_ON_8, [4, 4, 4, 4])
  await as('reviewer')
  await mockReview.declare({ assignmentId: R1_ON_8, hasConflict: false, confidentialityAccepted: true })
  const items = ['1', '2', '3', '4'].map((n) => ({ criterion_id: `12000000-0000-4000-8000-00000000000${n}`, score: 4, reason: LONG }))
  const r = await mockReview.submitScorecard({ assignmentId: R1_ON_8, items, overallComment: '' })
  if (r.kind !== 'ok' || !r.data.quorum_reached) throw new Error('quorum not reached')
}

/** Screening asks for a revision on case 0008 and Applicant A submits version 2 with a changed problem statement. */
async function versionTwo() {
  await as('screening_officer')
  const asked = await mockFeedback.requestFeedback({ proposalId: CASE_8, kind: 'revision', message: 'Please strengthen the budget.', tasks: ['Add a line-item budget.'] })
  if (asked.kind !== 'ok') throw new Error('request failed')
  await as('applicant')
  const task = (await mockFeedback.getRoadmap(CASE_8))?.find((r) => r.kind === 'revision')?.tasks[0]
  const v1 = (await mockSubmission.getMyCase(CASE_8))?.version
  if (!task || !v1) throw new Error('no task or version')
  const sent = await mockSubmission.submitRevision({
    proposalId: CASE_8,
    clientRequestId: crypto.randomUUID(),
    data: { ...v1.data, problem: 'Revised problem statement (DEMO).' },
    changeNote: 'Added a line-item budget.',
    taskResponses: [{ task_id: task.task_id, status: 'addressed', explanation: 'Added a budget table.' }],
    declarationVersion: 'sample-2026-11-v1',
  })
  if (sent.kind !== 'ok') throw new Error('revision failed')
}

afterEach(() => vi.restoreAllMocks())
beforeEach(async () => {
  mockSubmissionControls.reset()
  mockStaffControls.reset()
  mockReviewControls.reset()
  mockFeedbackControls.reset()
  window.localStorage.clear()
  await as(null)
})

describe('T08 applicant case view', () => {
  it('shows the applicant’s submitted idea, its stage and no decision yet', async () => {
    await as('applicant')
    const user = renderAt(`/ideas/${CASE_8}`)
    expect(await screen.findByRole('heading', { level: 1, name: 'Rainwater tanks for poultry farms' }, LOAD)).toBeInTheDocument()
    expect(screen.getByText('Under review')).toBeInTheDocument()
    expect(screen.getByText('Only you and CEDA staff assigned to this case can see your idea.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'View receipt' })).toHaveAttribute('href', `/ideas/${CASE_8}/receipt?v=1`)
    expect(screen.getByRole('heading', { name: 'Submitted proposal' })).toBeInTheDocument()
    expect(await screen.findByText(/^Version 1 \(current\) · submitted \d{1,2} \w{3} 2026$/)).toBeInTheDocument()
    expect(screen.getByText('Fictional problem statement (DEMO).')).toBeInTheDocument()
    await user.click(screen.getByRole('tab', { name: 'Decision' }))
    expect(within(screen.getByRole('tabpanel')).getByText("No decision yet. We'll notify you when CEDA publishes it.")).toBeInTheDocument()
  }, JOURNEY)

  it('View receipt opens the receipt for the seeded idea’s version 1', async () => {
    await as('applicant')
    const user = renderAt(`/ideas/${CASE_8}`)
    await user.click(await screen.findByRole('link', { name: 'View receipt' }, LOAD))
    const heading = await screen.findByRole('heading', { level: 1 }, LOAD)
    expect(heading).not.toHaveTextContent("We can't find this page")
    const receipt = heading.closest('section') as HTMLElement
    expect(within(receipt).getAllByText(/CEDA-2026-0008/).length).toBeGreaterThan(0)
  }, JOURNEY)

  it('picks a version: the current one by default with its change note, an earlier one on request', async () => {
    await versionTwo()
    const user = renderAt(`/ideas/${CASE_8}`)
    await screen.findByRole('heading', { level: 1, name: 'Rainwater tanks for poultry farms' }, LOAD)
    await user.click(screen.getByRole('tab', { name: 'Proposal' }))
    expect(screen.getByRole('link', { name: 'View receipt' })).toHaveAttribute('href', `/ideas/${CASE_8}/receipt?v=2`)
    const picker = await screen.findByRole('combobox', { name: 'Version' }, LOAD)
    expect(within(picker).getAllByRole('option').map((o) => o.textContent)).toEqual([
      expect.stringMatching(/^Version 2 \(current\) · submitted /),
      expect.stringMatching(/^Version 1 · submitted /),
    ])
    expect(screen.getByText('Revised problem statement (DEMO).')).toBeInTheDocument()
    expect(screen.getByText('Added a line-item budget.')).toBeInTheDocument()

    await user.selectOptions(picker, '1')
    expect(screen.getByText('Fictional problem statement (DEMO).')).toBeInTheDocument()
    expect(screen.queryByText('Revised problem statement (DEMO).')).not.toBeInTheDocument()
    expect(screen.getByText("You're looking at an earlier version. Your current version is Version 2.")).toBeInTheDocument()
  }, JOURNEY)

  it('an unpublished decision stays invisible; once published the applicant sees it, the award and Next steps', async () => {
    await reviewsIn()
    await as('adjudicator')
    const d = await mockStaff.recordDecision({ proposalId: CASE_8, outcome: 'approved', reason: 'A practical, well-scored idea.' })
    if (d.kind !== 'ok') throw new Error('record failed')

    await as('applicant')
    expect((await mockSubmission.getMyCase(CASE_8))?.decision).toBeNull()
    expect((await mockSubmission.listMyIdeas()).find((i) => i.id === CASE_8)?.status).toBe('in_adjudication')

    await as('adjudicator')
    await mockStaff.publishDecision({ decisionId: d.data.decision_id })
    await as('admin')
    await mockStaff.recordAward({ proposalId: CASE_8, amountMinor: 5_000_000, description: 'Pilot grant (DEMO).' })

    await as('applicant')
    renderAt(`/ideas/${CASE_8}`)
    const panel = await screen.findByRole('tabpanel', {}, LOAD)
    expect(within(panel).getByRole('heading', { name: 'Approved' })).toBeInTheDocument()
    expect(within(panel).getByText('A practical, well-scored idea.')).toBeInTheDocument()
    expect(within(panel).getByRole('heading', { name: 'Award: BWP 50,000.00' })).toBeInTheDocument()
    expect(await within(panel).findByRole('heading', { name: 'Next steps' })).toBeInTheDocument()
    expect(within(panel).getByText('Sample referral information')).toBeInTheDocument()
    expect(within(panel).getAllByRole('listitem')).toHaveLength(4)
    expect((await mockSubmission.listMyIdeas()).find((i) => i.id === CASE_8)?.status).toBe('awarded')
  }, JOURNEY)

  it('shows the closure reason, but never an eligible screening reason', async () => {
    const closedId = await applicantSubmits()
    const keptId = await (async () => {
      const saved = await mockSubmission.saveDraft({ challengeId: WATER_SMART_ID, data: { ...COMPLETE, title: 'Second idea (DEMO)' } })
      if (saved.kind !== 'ok') throw new Error('save failed')
      await mockSubmission.uploadAttachment({ proposalId: saved.data.proposal_id, file: new File([new Uint8Array(10)], 'p.pdf', { type: 'application/pdf' }), docKey: 'business_plan' })
      await mockSubmission.submitProposal({ proposalId: saved.data.proposal_id, clientRequestId: crypto.randomUUID(), declarationVersion: 'sample-2026-11-v1' })
      return saved.data.proposal_id
    })()
    await as('screening_officer')
    await mockStaff.recordScreening({ proposalId: closedId, result: 'ineligible', reason: 'Outside the challenge scope.' })
    await mockStaff.recordScreening({ proposalId: keptId, result: 'eligible', reason: 'INTERNAL: the officer liked the budget.' })

    await as('applicant')
    renderAt(`/ideas/${closedId}`)
    expect(await screen.findByText('Outside the challenge scope.', {}, LOAD)).toBeInTheDocument()
    expect(screen.getByText('This idea was not taken forward')).toBeInTheDocument()

    const kept = await mockSubmission.getMyCase(keptId)
    expect(JSON.stringify(kept)).not.toContain('INTERNAL')
    expect(kept?.stages.map((s) => s.stage)).toEqual(['submission', 'review'])
  }, JOURNEY)

  it('someone else’s case is Not found', async () => {
    await as('applicant')
    renderAt('/ideas/30000000-0000-4000-8000-000000000001')
    expect(await screen.findByRole('heading', { level: 1, name: "We can't find this page" }, LOAD)).toBeInTheDocument()
  }, JOURNEY)
})

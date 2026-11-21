import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent, { type UserEvent } from '@testing-library/user-event'
import { MemoryRouter, useRoutes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mockFeedback, mockFeedbackControls } from '@/lib/api/mock/feedback'
import { mockReview, mockReviewControls } from '@/lib/api/mock/review'
import { mockSession } from '@/lib/api/mock/session'
import { mockStaffControls } from '@/lib/api/mock/staff'
import { mockSubmission, mockSubmissionControls } from '@/lib/api/mock/submission'
import type { Role } from '@/lib/api/types'
import { routes } from '@/routes/router'

const CASE_2 = '30000000-0000-4000-8000-000000000002' // in evaluation; Reviewer 1 scored V1, Reviewer 2 not yet
const CASE_8 = '30000000-0000-4000-8000-000000000008' // in evaluation; Reviewer 1 not declared
const R1_ON_8 = '40000000-0000-4000-8000-000000080001'
const LOAD = { timeout: 5000 }
// The V2 journey types twelve answers and four reasons; on a loaded machine it can pass 20 s (seen in full runs).
const JOURNEY = 30_000
const LONG = 'A clear reason that is long enough.'

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

/** Staff ask for a revision with two tasks; Applicant A submits version 2 (the seeded idea belongs to A). */
async function versionTwo(caseId: string) {
  await as('screening_officer')
  const r = await mockFeedback.requestFeedback({ proposalId: caseId, kind: 'revision', message: 'Strengthen the budget.', tasks: ['Add a budget.', 'Name the site.'] })
  if (r.kind !== 'ok') throw new Error('request failed')
  const tasks = (await mockFeedback.getRoadmap(caseId))![0]!.tasks
  // Case 8 is Applicant A's; case 2 belongs to a background applicant, so its V2 is recorded directly.
  await as('applicant')
  const res = await mockSubmission.submitRevision({
    proposalId: caseId,
    clientRequestId: crypto.randomUUID(),
    data: null,
    changeNote: 'Added a budget; site not confirmed yet.',
    taskResponses: [
      { task_id: tasks[0]!.task_id, status: 'addressed', explanation: 'Budget table added.' },
      { task_id: tasks[1]!.task_id, status: 'not_addressed', explanation: 'Site not confirmed.' },
    ],
    declarationVersion: 'sample-2026-11-v1',
  })
  if (res.kind !== 'ok') throw new Error(`revision failed: ${JSON.stringify(res)}`)
}

async function scoreAll(user: UserEvent, score: number) {
  for (const label of ['Innovation', 'Market potential', 'Feasibility', 'Economic impact']) {
    await user.click(within(screen.getByRole('radiogroup', { name: `${label} score` })).getByText(String(score)))
    await user.type(screen.getByLabelText(`Reason for your ${label} score`), LONG)
  }
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

describe('INN-02: reviewers verify the roadmap on version 2', () => {
  it('requires every task to be verified (a note for "not verified") before the V2 scorecard can be submitted', async () => {
    await versionTwo(CASE_8)
    await as('reviewer')
    await mockReview.declare({ assignmentId: R1_ON_8, hasConflict: false, confidentialityAccepted: true })
    const user = renderAt(`/staff/cases/${CASE_8}/score`)
    expect(await screen.findByText('What changed in version 2', {}, LOAD)).toBeInTheDocument()
    expect(screen.getByText('Added a budget; site not confirmed yet.')).toBeInTheDocument()
    expect(screen.getByText('0 of 2 tasks verified')).toBeInTheDocument()

    await scoreAll(user, 4)
    await user.click(screen.getByRole('button', { name: 'Submit scorecard' }))
    const alert = await screen.findByRole('alert')
    expect(within(alert).getByRole('link', { name: 'Task 1: Verify this task' })).toBeInTheDocument()
    expect(within(alert).getByRole('link', { name: 'Task 2: Verify this task' })).toBeInTheDocument()

    const task1 = screen.getByRole('group', { name: /Task 1: Add a budget\./ })
    await user.click(within(task1).getByRole('radio', { name: 'Verified' }))
    await user.click(within(task1).getByRole('button', { name: 'Save check' }))
    await waitFor(() => expect(screen.getByText('1 of 2 tasks verified')).toBeInTheDocument(), LOAD)

    const task2 = screen.getByRole('group', { name: /Task 2: Name the site\./ })
    await user.click(within(task2).getByRole('radio', { name: 'Not verified' }))
    await user.click(within(task2).getByRole('button', { name: 'Save check' }))
    expect(within(task2).getByText('Explain why the task is not verified')).toBeInTheDocument()
    await user.type(within(task2).getByLabelText(/^Why isn't it verified\?/), 'The site is still missing.')
    await user.click(within(task2).getByRole('button', { name: 'Save check' }))
    await waitFor(() => expect(screen.getByText('2 of 2 tasks verified')).toBeInTheDocument(), LOAD)

    await user.click(screen.getByRole('button', { name: 'Submit scorecard' }))
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Submit scorecard' }))
    expect(await screen.findByText(/^Submitted .* · read only$/, {}, LOAD)).toBeInTheDocument()

    // Staff see the checks on the roadmap; the applicant doesn't until the decision is published (B6).
    await as('screening_officer')
    const staffView = (await mockFeedback.getRoadmap(CASE_8))![0]!
    expect(staffView.summary).toMatchObject({ verified: 1, not_verified: 1 })
    await as('applicant')
    const applicantView = (await mockFeedback.getRoadmap(CASE_8))![0]!
    expect(applicantView.tasks[0]!.verifications).toBeNull()
    expect(applicantView.summary.verified).toBeNull()
    // Checks are locked once the scorecard is submitted.
    await as('reviewer')
    expect(await mockReview.verifyTask({ taskId: staffView.tasks[0]!.task_id, assignmentId: R1_ON_8, result: 'not_verified', note: 'Changed my mind.' })).toMatchObject({
      kind: 'refused',
      code: 'INVALID_STATE',
    })
  }, JOURNEY)

  it('keeps version 1 scores with version 1: the reviewer scores version 2 afresh', async () => {
    await as('reviewer')
    expect((await mockReview.myQueue()).find((r) => r.proposal_id === CASE_2)?.my_status).toBe('submitted')
    // Case 2 belongs to a background applicant: move it to V2 through the mock's own rules.
    await as('screening_officer')
    await mockFeedback.requestFeedback({ proposalId: CASE_2, kind: 'revision', message: 'Clarify the market.', tasks: ['Add customer evidence.'] })
    const { mockFeedbackInternals } = await import('@/lib/api/mock/feedback')
    const { mockStaffInternals } = await import('@/lib/api/mock/staff')
    const c = mockStaffInternals.cases().find((x) => x.id === CASE_2)!
    mockStaffInternals.setSeededVersion(CASE_2, { ...c.version!, version_no: 2 })
    const req = mockFeedbackInternals.requests().get(CASE_2)!.at(-1)!
    req.status = 'answered'
    req.answered_version_no = 2
    req.tasks[0]!.applicant_status = 'addressed'
    req.tasks[0]!.applicant_explanation = 'Added two letters of intent.'
    mockStaffInternals.moveCase(CASE_2, { from_status: 'action_required', to_status: 'in_evaluation', public_stage: 'review', reason: null, at: new Date().toISOString() })

    await as('reviewer')
    const row = (await mockReview.myQueue()).find((r) => r.proposal_id === CASE_2)!
    expect(row).toMatchObject({ version_no: 2, my_status: 'not_started' })
    const ws = await mockReview.getWorkspace(row.assignment_id)
    expect(ws?.scorecard).toBeNull()
    expect(ws?.tasks.map((t) => t.text)).toEqual(['Add customer evidence.'])
  }, JOURNEY)
})

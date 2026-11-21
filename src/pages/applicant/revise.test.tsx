import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent, { type UserEvent } from '@testing-library/user-event'
import { MemoryRouter, useRoutes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mockFeedback, mockFeedbackControls } from '@/lib/api/mock/feedback'
import { mockReviewControls } from '@/lib/api/mock/review'
import { mockSession } from '@/lib/api/mock/session'
import { mockStaff, mockStaffControls } from '@/lib/api/mock/staff'
import { mockSubmission, mockSubmissionControls } from '@/lib/api/mock/submission'
import type { Role } from '@/lib/api/types'
import { routes } from '@/routes/router'

const CASE_8 = '30000000-0000-4000-8000-000000000008'
const LOAD = { timeout: 5000 }
/** Multi-step journeys: allow more than Vitest's 5 s default under full-suite load. */
const JOURNEY = 20_000

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

async function revisionRequested() {
  await as('screening_officer')
  const r = await mockFeedback.requestFeedback({
    proposalId: CASE_8,
    kind: 'revision',
    message: 'Please strengthen the budget.',
    tasks: ['Add a line-item budget.', 'Name the pilot site.'],
  })
  if (r.kind !== 'ok') throw new Error('request failed')
  await as('applicant')
}

async function answerTasks(user: UserEvent) {
  const roadmap = await screen.findByRole('region', { name: 'Your roadmap' }, LOAD)
  const tasks = within(roadmap).getAllByRole('group')
  await user.click(within(tasks[0]!).getByRole('radio', { name: 'Addressed' }))
  await user.type(within(tasks[0]!).getByLabelText(/^Explanation/), 'Added a budget table.')
  await user.click(within(tasks[1]!).getByRole('radio', { name: 'Not addressed' }))
  await user.type(within(tasks[1]!).getByLabelText(/^Explanation/), 'The site is not confirmed yet.')
}

/** Step 2 of Sandra's two-step revise frame: "Review changes" holds What changed?, the declaration and Submit. */
const review = (user: UserEvent) => user.click(screen.getByRole('button', { name: 'Review changes' }))

afterEach(() => vi.restoreAllMocks())
beforeEach(async () => {
  mockSubmissionControls.reset()
  mockStaffControls.reset()
  mockReviewControls.reset()
  mockFeedbackControls.reset()
  window.localStorage.clear()
  await as(null)
})

describe('T04 V2 revise mode', () => {
  it('answers the roadmap, edits the idea and submits version 2 with a receipt; the case returns to evaluation', async () => {
    await revisionRequested()
    const user = renderAt(`/ideas/${CASE_8}/revise`)
    expect(await screen.findByRole('heading', { level: 1, name: 'Rainwater tanks for poultry farms' }, LOAD)).toBeInTheDocument()
    expect(screen.getByText('Revise your idea')).toBeInTheDocument()
    expect(screen.getByText('Please strengthen the budget.')).toBeInTheDocument()
    // Submit is on step 2, disabled with the reason until every task is answered.
    await review(user)
    expect(screen.getByRole('button', { name: 'Submit Version 2' })).toBeDisabled()
    expect(screen.getByText('Answer all 2 roadmap tasks to submit (0 of 2 answered).')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Back' }))

    await answerTasks(user)
    expect(screen.getByText('2 of 2 tasks answered')).toBeInTheDocument()
    const summary = screen.getByLabelText(/^Summary/)
    await user.clear(summary)
    await user.type(summary, 'A revised summary with a budget.')
    await review(user)
    await user.type(screen.getByLabelText(/^What changed\?/), 'Added a budget; site still to confirm.')
    await user.click(screen.getByRole('checkbox', { name: /accept the declaration/i }))
    await user.click(screen.getByRole('button', { name: 'Submit Version 2' }))

    expect(await screen.findByRole('heading', { level: 1, name: 'Version 2 submitted' }, LOAD)).toBeInTheDocument()
    const mine = await mockSubmission.getMyCase(CASE_8)
    expect(mine?.version?.version_no).toBe(2)
    expect(mine?.version?.data.summary).toBe('A revised summary with a budget.')
    expect(mine?.status).toBe('in_evaluation')
    const roadmap = await mockFeedback.getRoadmap(CASE_8)
    expect(roadmap?.[0]).toMatchObject({ status: 'answered', answered_version_no: 2, summary: { addressed: 1 } })
    await as('admin')
    expect((await mockStaff.getCase(CASE_8))?.version?.version_no).toBe(2)
  }, JOURNEY)

  it('lists what is missing: the change note and the declaration', async () => {
    await revisionRequested()
    const user = renderAt(`/ideas/${CASE_8}/revise`)
    await answerTasks(user)
    await review(user)
    await user.click(screen.getByRole('button', { name: 'Submit Version 2' }))
    const alert = await screen.findByRole('alert')
    expect(within(alert).getByRole('link', { name: 'What changed: Say what changed' })).toBeInTheDocument()
    expect(within(alert).getByRole('link', { name: 'Declaration: Accept the declaration' })).toBeInTheDocument()
  }, JOURNEY)

  it('a lost reply is "not confirmed yet"; checking by the same key finds the version 2 receipt', async () => {
    await revisionRequested()
    mockSubmissionControls.loseNextSubmitReply()
    const user = renderAt(`/ideas/${CASE_8}/revise`)
    await answerTasks(user)
    await review(user)
    await user.type(screen.getByLabelText(/^What changed\?/), 'Added a budget.')
    await user.click(screen.getByRole('checkbox', { name: /accept the declaration/i }))
    await user.click(screen.getByRole('button', { name: 'Submit Version 2' }))
    await user.click(await screen.findByRole('button', { name: /check status/i }, LOAD))
    await waitFor(() => expect(screen.getByRole('heading', { level: 1, name: 'Version 2 submitted' })).toBeInTheDocument(), LOAD)
  }, JOURNEY)

  it('replays the same key and refuses a key used for another case', async () => {
    await revisionRequested()
    const roadmap = await mockFeedback.getRoadmap(CASE_8)
    const tasks = roadmap![0]!.tasks.map((t) => ({ task_id: t.task_id, status: 'addressed' as const, explanation: 'Done.' }))
    const input = { proposalId: CASE_8, clientRequestId: 'k-rev', data: null, changeNote: 'Changed.', taskResponses: tasks, declarationVersion: 'sample-2026-11-v1' }
    expect((await mockSubmission.submitRevision(input)).kind).toBe('ok')
    expect(await mockSubmission.submitRevision(input)).toMatchObject({ kind: 'ok', data: { version_no: 2, replayed: true } })
    expect(await mockSubmission.submitRevision({ ...input, proposalId: '30000000-0000-4000-8000-000000000001' })).toMatchObject({ kind: 'refused' })
  }, JOURNEY)

  it('says so when no revision is waiting', async () => {
    await as('applicant')
    renderAt(`/ideas/${CASE_8}/revise`)
    expect(await screen.findByRole('heading', { level: 1, name: 'No revision is waiting' }, LOAD)).toBeInTheDocument()
  }, JOURNEY)
})

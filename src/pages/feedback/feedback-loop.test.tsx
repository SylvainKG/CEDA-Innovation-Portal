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

/** Multi-step journeys: allow more than Vitest's 5 s default under full-suite load. */
const JOURNEY = 20_000

const CASE_3 = '30000000-0000-4000-8000-000000000003' // seeded open clarification
const CASE_8 = '30000000-0000-4000-8000-000000000008' // Applicant A's idea, in evaluation
const LOAD = { timeout: 5000 }

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

async function ask(user: UserEvent, kind: 'clarification' | 'revision', message: string, tasks: string[] = []) {
  await user.click(await screen.findByRole('button', { name: kind === 'clarification' ? 'Request clarification' : 'Request revision' }, LOAD))
  const dialog = await screen.findByRole('dialog')
  await user.type(within(dialog).getByLabelText(kind === 'clarification' ? /^Question/ : /^Message/), message)
  for (const [i, t] of tasks.entries()) {
    if (i > 0) await user.click(within(dialog).getByRole('button', { name: 'Add a task' }))
    await user.type(within(dialog).getByLabelText(`Task ${i + 1}`), t)
  }
  await user.click(within(dialog).getByRole('button', { name: kind === 'clarification' ? 'Send question' : 'Send revision request' }))
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

describe('Slice 4: clarification loop', () => {
  it('staff ask a question; the case waits on the applicant; a reply returns it to evaluation with no new version', async () => {
    await as('screening_officer')
    const staff = renderAt(`/staff/cases/${CASE_8}`)
    await ask(staff, 'clarification', 'Which district are the pilot farms in?')
    expect(await screen.findByText('Question sent. The case now waits on the applicant, who must reply in writing.')).toBeInTheDocument()
    expect((await mockStaff.getCase(CASE_8))?.status).toBe('action_required')
    expect(screen.queryByRole('button', { name: 'Request clarification' })).not.toBeInTheDocument()

    await as('applicant')
    expect((await mockSubmission.listMyIdeas()).find((i) => i.id === CASE_8)?.open_feedback).toMatchObject({ kind: 'clarification', status: 'open' })
    document.body.innerHTML = ''
    const user = renderAt(`/ideas/${CASE_8}`)
    expect(await screen.findByText('CEDA has a question for you', {}, LOAD)).toBeInTheDocument()
    const panel = screen.getByRole('tabpanel')
    expect(within(panel).getByText('Which district are the pilot farms in?')).toBeInTheDocument()
    await user.type(within(panel).getByLabelText(/^Your reply/), 'Short')
    await user.click(within(panel).getByRole('button', { name: 'Send reply' }))
    expect(within(panel).getByText('Write at least 10 characters')).toBeInTheDocument()
    await user.type(within(panel).getByLabelText(/^Your reply/), ' answer: Kweneng district.')
    await user.click(within(panel).getByRole('button', { name: 'Send reply' }))
    // The page refreshes after the reply, so look again rather than reuse the old panel element.
    await waitFor(() => {
      expect(screen.getByText('Short answer: Kweneng district.')).toBeInTheDocument()
      expect(screen.getByText('Answered')).toBeInTheDocument()
    }, LOAD)

    await as('admin')
    const c = await mockStaff.getCase(CASE_8)
    expect(c?.status).toBe('in_evaluation')
    expect(c?.version?.version_no).toBe(1)
  }, JOURNEY)

  it('only one request can be open at a time, and a question can be answered once', async () => {
    await as('screening_officer')
    expect(await mockFeedback.requestFeedback({ proposalId: CASE_3, kind: 'clarification', message: 'Another?' })).toMatchObject({ kind: 'refused', code: 'INVALID_STATE' })
    expect(await mockFeedback.requestFeedback({ proposalId: CASE_8, kind: 'clarification', message: 'Q?', tasks: ['no'] })).toMatchObject({ kind: 'refused', code: 'VALIDATION' })
  }, JOURNEY)

  it('shows the seeded open clarification to staff', async () => {
    await as('screening_officer')
    const user = renderAt(`/staff/cases/${CASE_3}`)
    await user.click(await screen.findByRole('tab', { name: 'Feedback' }, LOAD))
    expect(await within(screen.getByRole('tabpanel')).findByText('Please confirm the district of your pilot farms (DEMO).')).toBeInTheDocument()
    expect(within(screen.getByRole('tabpanel')).getByText('Open')).toBeInTheDocument()
  }, JOURNEY)
})

describe('Slice 4: revision request with a roadmap', () => {
  it('builds tasks, refuses an empty one, and shows the applicant the roadmap and a Revise link', async () => {
    await as('screening_officer')
    const staff = renderAt(`/staff/cases/${CASE_8}`)
    await staff.click(await screen.findByRole('button', { name: 'Request revision' }, LOAD))
    let dialog = await screen.findByRole('dialog', { name: 'Request revision for CEDA-2026-0008' })
    expect(within(dialog).getByText('The applicant will submit a new version. Current scores stay with the current version.')).toBeInTheDocument()
    await staff.type(within(dialog).getByLabelText(/^Message/), 'Please strengthen the budget.')
    await staff.click(within(dialog).getByRole('button', { name: 'Add a task' }))
    await staff.type(within(dialog).getByLabelText('Task 1'), 'Add a line-item budget.')
    await staff.click(within(dialog).getByRole('button', { name: 'Send revision request' }))
    expect(within(dialog).getByText('Write the task, or remove it')).toBeInTheDocument()
    await staff.click(within(dialog).getByRole('button', { name: 'Remove task 2' }))
    await staff.click(within(dialog).getByRole('button', { name: 'Add a task' }))
    dialog = screen.getByRole('dialog')
    await staff.type(within(dialog).getByLabelText('Task 2'), 'Name the pilot site.')
    await staff.click(within(dialog).getByRole('button', { name: 'Send revision request' }))
    expect(await screen.findByText(/Revision request sent/)).toBeInTheDocument()

    await as('applicant')
    document.body.innerHTML = ''
    renderAt(`/ideas/${CASE_8}`)
    expect(await screen.findByText('CEDA asks you to revise your idea', {}, LOAD)).toBeInTheDocument()
    const panel = screen.getByRole('tabpanel')
    expect(within(panel).getByText('Roadmap · 0 of 2 tasks addressed')).toBeInTheDocument()
    expect(within(panel).getByText('Add a line-item budget.')).toBeInTheDocument()
    expect(within(panel).getByRole('link', { name: 'Revise your idea' })).toHaveAttribute('href', `/ideas/${CASE_8}/revise`)
    // The applicant never sees reviewers' checks before the decision is published (BCR-001 B6).
    const roadmap = await mockFeedback.getRoadmap(CASE_8)
    expect(roadmap?.[0]?.tasks[0]?.verifications).toBeNull()
    expect(roadmap?.[0]?.summary.verified).toBeNull()
  }, JOURNEY)
})

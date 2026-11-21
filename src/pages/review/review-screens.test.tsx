import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import userEvent, { type UserEvent } from '@testing-library/user-event'
import { MemoryRouter, useRoutes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mockReview, mockReviewControls } from '@/lib/api/mock/review'
import { mockSession } from '@/lib/api/mock/session'
import { mockStaff, mockStaffControls } from '@/lib/api/mock/staff'
import { mockSubmissionControls } from '@/lib/api/mock/submission'
import type { Role } from '@/lib/api/types'
import { routes } from '@/routes/router'

const CASE_8 = '30000000-0000-4000-8000-000000000008' // Reviewer 1 assigned, not declared
const R1_ON_8 = '40000000-0000-4000-8000-000000080001'
const R2_ON_8 = '40000000-0000-4000-8000-000000080002'
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

async function declareClear(user: UserEvent) {
  await user.click(await screen.findByRole('radio', { name: /I have no conflict of interest/ }))
  await user.click(screen.getByRole('button', { name: 'Continue to proposal' }))
  await screen.findByRole('heading', { name: 'Your scorecard · Version 1' })
}

/** Score every criterion with the same score and a valid reason. */
async function scoreAll(user: UserEvent, score: number) {
  for (const label of ['Innovation', 'Market potential', 'Feasibility', 'Economic impact']) {
    const group = screen.getByRole('radiogroup', { name: `${label} score` })
    await user.click(within(group).getByText(String(score)))
    await user.type(screen.getByLabelText(`Reason for your ${label} score`), LONG)
  }
}

afterEach(() => vi.restoreAllMocks())
beforeEach(async () => {
  mockSubmissionControls.reset()
  mockStaffControls.reset()
  mockReviewControls.reset()
  window.localStorage.clear()
  await as(null)
})

describe('T07 My reviews', () => {
  it('groups the reviewer’s cases by status and opens on what needs doing', async () => {
    await as('reviewer')
    const user = renderAt('/staff/reviews')
    expect(await screen.findByRole('heading', { level: 1, name: 'My reviews' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Declaration needed (1)' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Submitted (4)' })).toBeInTheDocument()
    const links = [...new Set(screen.getAllByRole('link', { name: /CEDA-2026-/ }).map((l) => l.getAttribute('href')))]
    expect(links).toEqual([`/staff/cases/${CASE_8}/score`])
    await user.click(screen.getByRole('button', { name: 'Not started (0)' }))
    expect(screen.getByRole('heading', { name: 'Nothing waiting to be started.' })).toBeInTheDocument()
  })
})

describe('T09 declaration gate', () => {
  it('keeps the proposal closed until the reviewer declares no conflict', async () => {
    await as('reviewer')
    const user = renderAt(`/staff/cases/${CASE_8}/score`)
    expect(await screen.findByRole('heading', { level: 1, name: 'Before you open this proposal' })).toBeInTheDocument()
    expect(screen.getByText('Lesedi Agro Demo', { exact: false })).toBeInTheDocument()
    expect(screen.queryByText('Fictional problem statement (DEMO).')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Continue to proposal' }))
    expect(screen.getByText('Choose one option')).toBeInTheDocument()
    await declareClear(user)
    expect(screen.getByText('Fictional problem statement (DEMO).')).toBeInTheDocument()
  })

  it('a conflict, once confirmed, withdraws the reviewer from the case', async () => {
    await as('reviewer')
    const user = renderAt(`/staff/cases/${CASE_8}/score`)
    await user.click(await screen.findByRole('radio', { name: 'I have a conflict' }))
    await user.click(screen.getByRole('button', { name: 'Declare conflict and withdraw' }))
    const dialog = await screen.findByRole('dialog', { name: 'Declare a conflict and withdraw?' })
    expect(within(dialog).getByText("You'll lose access to this case. An administrator will reassign it.")).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: 'Declare conflict and withdraw' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Conflict declared' })).toBeInTheDocument()
    expect((await mockReview.myQueue()).some((r) => r.proposal_id === CASE_8)).toBe(false)
    // The same answer again is safe; a different one is refused.
    expect(await mockReview.declare({ assignmentId: R1_ON_8, hasConflict: true, confidentialityAccepted: false })).toMatchObject({ kind: 'ok', data: { replayed: true } })
    expect(await mockReview.declare({ assignmentId: R1_ON_8, hasConflict: false, confidentialityAccepted: true })).toMatchObject({ kind: 'refused', code: 'INVALID_STATE' })
  })
})

describe('T09 scorecard', () => {
  it('shows anchors and a live weighted score, and saves only scores that have a reason', async () => {
    await as('reviewer')
    const user = renderAt(`/staff/cases/${CASE_8}/score`)
    await declareClear(user)
    expect(screen.getByRole('group', { name: 'Weighted score' })).toHaveTextContent('— out of 5Score every criterion to see it.')
    const innovation = screen.getByRole('radiogroup', { name: 'Innovation score' })
    await user.click(within(innovation).getByText('5'))
    expect(screen.getByText('Fully demonstrated with evidence')).toBeInTheDocument()
    await user.click(within(screen.getByRole('radiogroup', { name: 'Feasibility score' })).getByText('3'))
    await user.type(screen.getByLabelText('Reason for your Feasibility score'), LONG)

    await user.click(screen.getByRole('button', { name: 'Save draft' }))
    expect(await screen.findByText(/Not saved yet: Innovation\. Add a reason to save its score\./)).toBeInTheDocument()
    const ws = await mockReview.getWorkspace(R1_ON_8)
    expect(ws?.scorecard?.items).toEqual([{ criterion_id: '12000000-0000-4000-8000-000000000003', score: 3, reason: LONG }])
    expect(ws?.row.my_status).toBe('in_progress')
  })

  it('refuses to submit with missing scores or short reasons, listing each criterion', async () => {
    await as('reviewer')
    const user = renderAt(`/staff/cases/${CASE_8}/score`)
    await declareClear(user)
    await user.click(within(screen.getByRole('radiogroup', { name: 'Innovation score' })).getByText('4'))
    await user.type(screen.getByLabelText('Reason for your Innovation score'), 'Too short')
    await user.click(screen.getByRole('button', { name: 'Submit scorecard' }))
    const summary = await screen.findByRole('alert')
    expect(within(summary).getByRole('link', { name: 'Innovation: Give a reason of at least 20 characters' })).toBeInTheDocument()
    expect(within(summary).getByRole('link', { name: 'Market potential: Choose a score from 1 to 5' })).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('submits after confirming, locks the scorecard, and moves the case on when the second review lands', async () => {
    mockReviewControls.submitAs(R2_ON_8, [3, 3, 3, 3])
    await as('reviewer')
    const user = renderAt(`/staff/cases/${CASE_8}/score`)
    await declareClear(user)
    await scoreAll(user, 4)
    expect(screen.getByRole('group', { name: 'Weighted score' })).toHaveTextContent('4.00 out of 5')
    await user.click(screen.getByRole('button', { name: 'Submit scorecard' }))
    const dialog = await screen.findByRole('dialog', { name: 'Submit your scorecard for CEDA-2026-0008?' })
    expect(within(dialog).getByText("You can't change scores after submitting.")).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: 'Submit scorecard' }))
    expect(await screen.findByText(/^Submitted .* · read only$/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Save draft' })).not.toBeInTheDocument()

    await as('admin')
    expect((await mockStaff.getCase(CASE_8))?.status).toBe('in_adjudication')
  })

  it('a lost submit reply re-reads the scorecard: submitted means done', async () => {
    await as('reviewer')
    const real = mockReview.submitScorecard.bind(mockReview)
    vi.spyOn(mockReview, 'submitScorecard').mockImplementationOnce(async (input) => {
      await real(input)
      throw new Error('network')
    })
    const user = renderAt(`/staff/cases/${CASE_8}/score`)
    await declareClear(user)
    await scoreAll(user, 2)
    await user.click(screen.getByRole('button', { name: 'Submit scorecard' }))
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Submit scorecard' }))
    expect(await screen.findByText(/^Submitted .* · read only$/)).toBeInTheDocument()
    // A repeat returns the recorded result and changes nothing.
    expect(await mockReview.submitScorecard({ assignmentId: R1_ON_8, items: [], overallComment: '' })).toMatchObject({ kind: 'ok', data: { replayed: true } })
  })

  it('a case the reviewer is not assigned to is Not found', async () => {
    await as('reviewer')
    renderAt('/staff/cases/30000000-0000-4000-8000-000000000001/score')
    expect(await screen.findByRole('heading', { level: 1, name: "We can't find this page" })).toBeInTheDocument()
  })
})

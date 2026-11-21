import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useRoutes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mockReview, mockReviewControls } from '@/lib/api/mock/review'
import { mockSession } from '@/lib/api/mock/session'
import { mockStaffControls } from '@/lib/api/mock/staff'
import { mockSubmissionControls } from '@/lib/api/mock/submission'
import type { Role } from '@/lib/api/types'
import { round2, weightedScore } from '@/lib/scoring'
import { routes } from '@/routes/router'

const CASE_4 = '30000000-0000-4000-8000-000000000004' // in adjudication: R1 [5,4,4,4], R2 [4,4,3,4]
const CASE_8 = '30000000-0000-4000-8000-000000000008'
const R1_ON_8 = '40000000-0000-4000-8000-000000080001'
const R2_ON_8 = '40000000-0000-4000-8000-000000080002'
const CRITERIA = ['12000000-0000-4000-8000-000000000001', '12000000-0000-4000-8000-000000000002', '12000000-0000-4000-8000-000000000003', '12000000-0000-4000-8000-000000000004']

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

afterEach(() => vi.restoreAllMocks())
beforeEach(async () => {
  mockSubmissionControls.reset()
  mockStaffControls.reset()
  mockReviewControls.reset()
  window.localStorage.clear()
  await as(null)
})

describe('scoring arithmetic (contract §4.3)', () => {
  it('weights scores and rounds like PostgreSQL numeric', () => {
    const criteria = CRITERIA.map((id, k) => ({ id, key: `k${k}`, label: `C${k}`, weight: [30, 25, 25, 20][k]!, guidance: '', anchors: {} }))
    expect(weightedScore(CRITERIA.map((id, k) => ({ criterion_id: id, score: [5, 4, 4, 4][k]! })), criteria)).toBe(4.3)
    expect(weightedScore(CRITERIA.map((id, k) => ({ criterion_id: id, score: [4, 4, 3, 4][k]! })), criteria)).toBe(3.75)
    expect(weightedScore([{ criterion_id: CRITERIA[0]!, score: 5 }], criteria)).toBeNull()
    expect(round2(4.025)).toBe(4.03)
    expect(round2(1.005)).toBe(1.01)
  })
})

describe('T07 Ready for decision', () => {
  it('lists cases in adjudication with scores, aggregate and a link to the panel', async () => {
    await as('adjudicator')
    renderAt('/staff/queue/decision')
    expect(await screen.findByRole('heading', { level: 1, name: 'Ready for decision' })).toBeInTheDocument()
    expect(await screen.findAllByText('2/2')).not.toHaveLength(0)
    expect(screen.getAllByText('4.03').length).toBeGreaterThan(0)
    const links = [...new Set(screen.getAllByRole('link', { name: /CEDA-2026-/ }).map((l) => l.getAttribute('href')))]
    expect(links).toEqual([`/staff/cases/${CASE_4}/panel`])
  })
})

describe('T09 score panel', () => {
  it('shows the criterion × reviewer matrix, weighted scores, aggregate and reasons', async () => {
    await as('adjudicator')
    const user = renderAt(`/staff/cases/${CASE_4}/panel`)
    expect(await screen.findByRole('heading', { level: 1, name: 'Fog-net water harvesting' })).toBeInTheDocument()
    expect(screen.getByText('Score panel')).toBeInTheDocument()
    expect(screen.getByText('Version 1 · 2 of 2 reviews submitted')).toBeInTheDocument()
    const table = screen.getByRole('table')
    const innovation = within(table).getByRole('row', { name: /Innovation/ })
    // Each reviewer's cell holds the score and that score's reason behind "Reason"; the last cell is the spread.
    expect(within(innovation).getAllByRole('cell').map((c) => c.querySelector('[data-score]')?.textContent ?? c.textContent)).toEqual(['5', '4', '1'])
    const weighted = within(table).getByRole('row', { name: /Weighted score/ })
    const cells = within(weighted).getAllByRole('cell')
    expect(cells.slice(0, 2).map((c) => c.textContent)).toEqual(['4.30', '3.75'])
    expect(cells[2]).toHaveTextContent('Panel average 4.03 out of 5spread 0.55')
    expect(screen.queryByText('Large spread')).not.toBeInTheDocument()
    await user.click(screen.getAllByText('Demo Reviewer 1').find((el) => el.closest('summary'))!)
    expect(screen.getAllByText('Fictional seeded reason for this score (DEMO).').length).toBeGreaterThan(0)
  })

  it('flags a spread of 2 or more and warns while reviews are outstanding', async () => {
    mockReviewControls.submitAs(R2_ON_8, [5, 5, 5, 5])
    await as('adjudicator')
    renderAt(`/staff/cases/${CASE_8}/panel`)
    expect(await screen.findByText(/1 of 2 reviews? outstanding\. A decision is not available yet\./)).toBeInTheDocument()

    mockReviewControls.submitAs(R1_ON_8, [2, 2, 2, 2])
    const panel = await mockReview.getPanel(CASE_8)
    expect(panel?.aggregate).toMatchObject({ mean_weighted: 3.5, spread: 3, flagged: true })
    expect(panel?.criteria_summary.every((c) => c.flagged)).toBe(true)
  })

  it('a reviewer sees the panel only after submitting their own scorecard', async () => {
    await as('reviewer')
    expect(await mockReview.getPanel(CASE_8)).toBeNull()
    renderAt(`/staff/cases/${CASE_8}/panel`)
    expect(await screen.findByRole('heading', { level: 1, name: "We can't find this page" })).toBeInTheDocument()
    mockReviewControls.submitAs(R1_ON_8, [3, 3, 3, 3])
    expect((await mockReview.getPanel(CASE_8))?.submitted_count).toBe(1)
  })

  it('the staff case page offers the panel to adjudicators once the case is in adjudication', async () => {
    await as('adjudicator')
    renderAt(`/staff/cases/${CASE_4}`)
    expect(await screen.findByRole('link', { name: 'Open score panel' })).toHaveAttribute('href', `/staff/cases/${CASE_4}/panel`)
  })
})

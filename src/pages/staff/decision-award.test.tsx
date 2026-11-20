import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import userEvent, { type UserEvent } from '@testing-library/user-event'
import { MemoryRouter, useRoutes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mockReviewControls } from '@/lib/api/mock/review'
import { mockSession } from '@/lib/api/mock/session'
import { mockStaff, mockStaffControls } from '@/lib/api/mock/staff'
import { mockSubmissionControls } from '@/lib/api/mock/submission'
import type { Role } from '@/lib/api/types'
import { formatBWP, parseBWP } from '@/lib/money'
import { routes } from '@/routes/router'

const CASE_1 = '30000000-0000-4000-8000-000000000001' // submitted
const CASE_4 = '30000000-0000-4000-8000-000000000004' // in adjudication
const CASE_6 = '30000000-0000-4000-8000-000000000006' // approved and awarded BWP 250,000.00

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

async function recordDecision(user: UserEvent, outcome: 'Approved' | 'Not approved', reason: string, button = 'Record decision') {
  await user.click(await screen.findByRole('button', { name: button }))
  const dialog = await screen.findByRole('dialog', { name: 'Record decision for CEDA-2026-0004' })
  await user.click(within(dialog).getByRole('radio', { name: outcome }))
  await user.type(within(dialog).getByLabelText(/^Reason/), reason)
  await user.click(within(dialog).getByRole('button', { name: 'Save decision (not published)' }))
}

afterEach(() => vi.restoreAllMocks())
beforeEach(async () => {
  mockSubmissionControls.reset()
  mockStaffControls.reset()
  mockReviewControls.reset()
  window.localStorage.clear()
  await as(null)
})

describe('money in thebe', () => {
  it('parses what people type and formats it back exactly', () => {
    expect(parseBWP('250000')).toBe(25_000_000)
    expect(parseBWP('250,000.5')).toBe(25_000_050)
    expect(parseBWP('BWP 1 000.25')).toBe(100_025)
    expect(parseBWP('P 0.01')).toBe(1)
    expect(parseBWP('1.234')).toBeNull()
    expect(parseBWP('ten')).toBeNull()
    expect(formatBWP(25_000_000)).toBe('BWP 250,000.00')
    expect(formatBWP(5)).toBe('BWP 0.05')
  })
})

describe('Slice 5: decide, publish, award', () => {
  it('the adjudicator records an unpublished decision, then publishes it', async () => {
    await as('adjudicator')
    const user = renderAt(`/staff/cases/${CASE_4}`)
    await user.click(await screen.findByRole('button', { name: 'Record decision' }))
    const dialog = await screen.findByRole('dialog', { name: 'Record decision for CEDA-2026-0004' })
    expect(within(dialog).getByText("The applicant won't see this until you publish.")).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: 'Save decision (not published)' }))
    expect(within(dialog).getByText('Choose Approved or Not approved')).toBeInTheDocument()
    expect(within(dialog).getByText('Give a reason')).toBeInTheDocument()
    await user.click(within(dialog).getByRole('radio', { name: 'Approved' }))
    await user.type(within(dialog).getByLabelText(/^Reason/), 'Strong scores and a credible pilot plan.')
    await user.click(within(dialog).getByRole('button', { name: 'Save decision (not published)' }))

    expect(await screen.findByText(/Decision saved as Approved\. It is not published/)).toBeInTheDocument()
    expect((await mockStaff.getCase(CASE_4))?.status).toBe('in_adjudication')
    await user.click(screen.getByRole('tab', { name: 'Decision' }))
    expect(within(screen.getByRole('tabpanel')).getByText("The applicant can't see this decision yet.", { exact: false })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Publish decision' }))
    const publish = await screen.findByRole('dialog', { name: 'Publish decision for CEDA-2026-0004' })
    expect(within(publish).getByText("The applicant is notified now. This can't be unpublished.")).toBeInTheDocument()
    expect(within(publish).getByText('Strong scores and a credible pilot plan.')).toBeInTheDocument()
    await user.click(within(publish).getByRole('button', { name: 'Publish to applicant' }))
    expect(await screen.findByText('Decision published. The applicant is notified.')).toBeInTheDocument()
    expect((await mockStaff.getCase(CASE_4))?.status).toBe('approved')
  })

  it('changing a draft keeps the earlier one as replaced', async () => {
    await as('adjudicator')
    const user = renderAt(`/staff/cases/${CASE_4}`)
    await recordDecision(user, 'Not approved', 'First thoughts on this case.')
    await screen.findByText(/Decision saved as Not approved/)
    await recordDecision(user, 'Approved', 'On reflection, it meets the bar.', 'Change decision')
    await screen.findByText(/Decision saved as Approved/)
    await user.click(screen.getByRole('tab', { name: 'Decision' }))
    const panel = screen.getByRole('tabpanel')
    expect(within(panel).getByRole('heading', { name: 'Decision: Approved' })).toBeInTheDocument()
    expect(within(panel).getByText('Earlier drafts (1)')).toBeInTheDocument()
  })

  it('only the administrator records the award, and only after a published approval', async () => {
    await as('admin')
    expect(await mockStaff.recordAward({ proposalId: CASE_4, amountMinor: 100, description: 'x' })).toMatchObject({ kind: 'refused', code: 'CASE_NOT_APPROVED' })
    expect(await mockStaff.recordDecision({ proposalId: CASE_4, outcome: 'approved', reason: 'x' })).toMatchObject({ kind: 'refused', code: 'FORBIDDEN' })

    await as('adjudicator')
    const d = await mockStaff.recordDecision({ proposalId: CASE_4, outcome: 'approved', reason: 'Approved.' })
    if (d.kind !== 'ok') throw new Error('record failed')
    await mockStaff.publishDecision({ decisionId: d.data.decision_id })
    expect(await mockStaff.recordAward({ proposalId: CASE_4, amountMinor: 100, description: 'x' })).toMatchObject({ kind: 'refused', code: 'FORBIDDEN' })

    await as('admin')
    const user = renderAt(`/staff/cases/${CASE_4}`)
    await user.click(await screen.findByRole('button', { name: 'Record award' }))
    const dialog = await screen.findByRole('dialog', { name: 'Record award for CEDA-2026-0004' })
    await user.type(within(dialog).getByLabelText(/^Amount \(BWP\)/), '250,000.50')
    expect(within(dialog).getByText('Recorded as BWP 250,000.50.')).toBeInTheDocument()
    await user.type(within(dialog).getByLabelText(/^Description/), 'Seed grant for the pilot (DEMO).')
    await user.click(within(dialog).getByRole('button', { name: 'Record award' }))
    expect(await screen.findByText('Award of BWP 250,000.50 recorded. The applicant is notified.')).toBeInTheDocument()
    expect((await mockStaff.getCase(CASE_4))?.status).toBe('awarded')
    // The same award again is replayed; a different one is refused.
    expect(await mockStaff.recordAward({ proposalId: CASE_4, amountMinor: 25_000_050, description: 'Seed grant for the pilot (DEMO).' })).toMatchObject({ kind: 'ok', data: { replayed: true } })
    expect(await mockStaff.recordAward({ proposalId: CASE_4, amountMinor: 1, description: 'Other' })).toMatchObject({ kind: 'refused', code: 'INVALID_STATE' })
  })

  it('shows the seeded approval and award', async () => {
    await as('admin')
    const user = renderAt(`/staff/cases/${CASE_6}`)
    expect(await screen.findByText('Awarded BWP 250,000.00.')).toBeInTheDocument()
    await user.click(screen.getByRole('tab', { name: 'Decision' }))
    const panel = screen.getByRole('tabpanel')
    expect(within(panel).getByRole('heading', { name: 'Decision: Approved' })).toBeInTheDocument()
    expect(within(panel).getByRole('heading', { name: 'Award: BWP 250,000.00' })).toBeInTheDocument()
  })

  it('a screening officer can close an open case with a reason', async () => {
    await as('screening_officer')
    const user = renderAt(`/staff/cases/${CASE_1}`)
    await user.click(await screen.findByRole('button', { name: 'Close case' }))
    const dialog = await screen.findByRole('dialog', { name: 'Close CEDA-2026-0001' })
    await user.click(within(dialog).getByRole('button', { name: 'Close case' }))
    expect(within(dialog).getByText('Give a reason')).toBeInTheDocument()
    await user.type(within(dialog).getByLabelText(/^Reason/), 'Duplicate of an earlier submission.')
    await user.click(within(dialog).getByRole('button', { name: 'Close case' }))
    expect(await screen.findByText('Case closed. The applicant is notified and sees the reason.')).toBeInTheDocument()
    expect((await mockStaff.getCase(CASE_1))?.status).toBe('closed')
    expect(screen.queryByRole('button', { name: 'Close case' })).not.toBeInTheDocument()
  })
})

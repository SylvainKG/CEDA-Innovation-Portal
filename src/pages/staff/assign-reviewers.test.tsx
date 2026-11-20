import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation, useRoutes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mockSession } from '@/lib/api/mock/session'
import { mockStaff, mockStaffControls } from '@/lib/api/mock/staff'
import { mockSubmissionControls } from '@/lib/api/mock/submission'
import type { Role } from '@/lib/api/types'
import { routes } from '@/routes/router'

const CASE_1 = '30000000-0000-4000-8000-000000000001' // submitted
const CASE_2 = '30000000-0000-4000-8000-000000000002' // in evaluation, Reviewers 1 and 2
const REVIEWER_3 = '00000000-0000-4000-8000-0000000000c3'

function Where() {
  const l = useLocation()
  return <p data-testid="location">{l.pathname + l.search}</p>
}

function renderAt(path: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  function App() {
    return (
      <>
        {useRoutes(routes)}
        <Where />
      </>
    )
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
  window.localStorage.clear()
  await as(null)
})

describe('T10 assign reviewers (admin)', () => {
  it('shows each reviewer’s load, locks those already assigned, and assigns the one chosen', async () => {
    await as('admin')
    const user = renderAt(`/staff/cases/${CASE_2}`)
    expect(await screen.findByText('2 reviewers assigned.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Assign reviewers' }))
    const dialog = await screen.findByRole('dialog', { name: 'Assign reviewers to CEDA-2026-0002' })

    const r1 = await within(dialog).findByRole('checkbox', { name: 'Demo Reviewer 1' })
    expect(r1).toBeChecked()
    expect(r1).toBeDisabled()
    expect(within(dialog).getAllByText('Already assigned to this case')).toHaveLength(2)
    expect(within(dialog).getByText('0 active reviews')).toBeInTheDocument()
    expect(within(dialog).getByLabelText(/^Due date/)).toHaveValue(new Date(Date.now() + 14 * 86_400_000).toLocaleDateString('en-CA', { timeZone: 'Africa/Gaborone' }))

    await user.click(within(dialog).getByRole('button', { name: 'Assign reviewers' }))
    expect(within(dialog).getByText('Choose at least one reviewer')).toBeInTheDocument()

    await user.click(within(dialog).getByRole('checkbox', { name: 'Demo Reviewer 3' }))
    await user.click(within(dialog).getByRole('button', { name: 'Assign 1 reviewer' }))
    expect(await screen.findByText('Assigned Demo Reviewer 3. Reviewers must declare conflicts before they can open the proposal.')).toBeInTheDocument()
    expect(screen.getByText('3 reviewers assigned.')).toBeInTheDocument()
    await user.click(screen.getByRole('tab', { name: 'Reviewers' }))
    expect(within(screen.getByRole('tabpanel')).getByText('Demo Reviewer 3')).toBeInTheDocument()
    expect(within(screen.getByRole('tabpanel')).getByText('Declaration needed')).toBeInTheDocument()
  })

  it('removes a reviewer only with a reason', async () => {
    await as('admin')
    const user = renderAt(`/staff/cases/${CASE_2}`)
    await user.click(await screen.findByRole('tab', { name: 'Reviewers' }))
    await user.click(within(screen.getByRole('tabpanel')).getAllByRole('button', { name: 'Remove reviewer' })[0]!)
    const dialog = await screen.findByRole('dialog', { name: 'Remove Demo Reviewer 1 from CEDA-2026-0002' })
    expect(within(dialog).getByText('The reviewer loses access to this case. Any scores they already submitted are kept.')).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: 'Remove reviewer' }))
    expect(within(dialog).getByText('Give a reason')).toBeInTheDocument()
    await user.type(within(dialog).getByLabelText(/^Reason/), 'Workload.')
    await user.click(within(dialog).getByRole('button', { name: 'Remove reviewer' }))
    expect(await screen.findByText('Removed Demo Reviewer 1 from this case. Their submitted scores are kept.')).toBeInTheDocument()
    expect(within(screen.getByRole('tabpanel')).getByText(/^Removed /)).toBeInTheDocument()
    expect(screen.getByText('1 reviewer assigned.')).toBeInTheDocument()
  })

  it('a lost reply re-reads the case: assigned means done', async () => {
    await as('admin')
    const real = mockStaff.assignReviewers.bind(mockStaff)
    vi.spyOn(mockStaff, 'assignReviewers').mockImplementationOnce(async (input) => {
      await real(input)
      throw new Error('network')
    })
    const user = renderAt(`/staff/cases/${CASE_2}`)
    await user.click(await screen.findByRole('button', { name: 'Assign reviewers' }))
    const dialog = await screen.findByRole('dialog')
    await user.click(await within(dialog).findByRole('checkbox', { name: 'Demo Reviewer 3' }))
    await user.click(within(dialog).getByRole('button', { name: 'Assign 1 reviewer' }))
    expect(await screen.findByText(/^Assigned Demo Reviewer 3/)).toBeInTheDocument()
  })

  it('is offered only to admins and only while the case is in evaluation', async () => {
    await as('screening_officer')
    renderAt(`/staff/cases/${CASE_2}`)
    expect(await screen.findByRole('heading', { level: 1, name: 'Greywater reuse for market gardens' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Assign reviewers' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Remove reviewer' })).not.toBeInTheDocument()
    expect(await mockStaff.listReviewers()).toEqual([])
    expect(await mockStaff.assignReviewers({ proposalId: CASE_2, reviewerIds: [REVIEWER_3] })).toMatchObject({ kind: 'refused', code: 'FORBIDDEN' })

    await as('admin')
    expect(await mockStaff.assignReviewers({ proposalId: CASE_1, reviewerIds: [REVIEWER_3] })).toMatchObject({ kind: 'refused', code: 'INVALID_STATE' })
  })
})

describe('mock assignment rules (contract §4.2)', () => {
  it('skips reviewers already assigned, refuses non-reviewers and past due dates, and a second removal', async () => {
    await as('admin')
    const again = await mockStaff.assignReviewers({ proposalId: CASE_2, reviewerIds: ['00000000-0000-4000-8000-0000000000c1', REVIEWER_3] })
    expect(again).toMatchObject({ kind: 'ok', data: { active_reviewers: 3 } })
    if (again.kind !== 'ok') return
    expect(again.data.already_assigned).toHaveLength(1)
    expect(again.data.assigned).toHaveLength(1)
    expect(await mockStaff.assignReviewers({ proposalId: CASE_2, reviewerIds: ['demo-admin'] })).toMatchObject({ kind: 'refused', fields: { reviewers: 'Not a reviewer' } })
    expect(await mockStaff.assignReviewers({ proposalId: CASE_2, reviewerIds: [REVIEWER_3], dueAt: '2020-01-01T00:00:00Z' })).toMatchObject({
      kind: 'refused',
      fields: { due_at: 'Must be in the future' },
    })
    const id = again.data.assigned[0]!.assignment_id
    expect((await mockStaff.revokeAssignment({ assignmentId: id, reason: 'x' })).kind).toBe('ok')
    expect(await mockStaff.revokeAssignment({ assignmentId: id, reason: 'x' })).toMatchObject({ kind: 'refused', code: 'INVALID_STATE' })
  })
})

describe('T07 all cases (admin)', () => {
  it('lists every submitted case with reviewers, filters by status in the address, and links to the case', async () => {
    await as('admin')
    const user = renderAt('/staff/cases')
    expect(await screen.findByRole('heading', { level: 1, name: 'All cases' })).toBeInTheDocument()
    expect(screen.getByText('8 cases, most recently updated first.')).toBeInTheDocument()
    await user.selectOptions(screen.getByLabelText('Status'), 'in_evaluation')
    expect(screen.getByTestId('location')).toHaveTextContent('/staff/cases?status=in_evaluation')
    expect(screen.getByText('2 of 8 cases: In evaluation')).toBeInTheDocument()
    const links = [...new Set(screen.getAllByRole('link', { name: /CEDA-2026-/ }).map((l) => l.textContent))]
    expect(links.sort()).toEqual(['CEDA-2026-0002', 'CEDA-2026-0008'])
  })

  it('gives committee members the status-only variant instead of the admin table (D-08)', async () => {
    await as('committee_member')
    renderAt('/staff/cases')
    expect(await screen.findByRole('heading', { level: 1, name: 'All cases' })).toBeInTheDocument()
    expect(await screen.findByText(/No proposal text, scores or notes \(D-08\)/)).toBeInTheDocument()
    expect(screen.queryByRole('columnheader', { name: 'Reviewers' })).not.toBeInTheDocument()
  })
})

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useRoutes } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import { mockFeedbackControls } from '@/lib/api/mock/feedback'
import { mockOversight, mockOversightControls } from '@/lib/api/mock/oversight'
import { mockReviewControls } from '@/lib/api/mock/review'
import { mockSession } from '@/lib/api/mock/session'
import { mockStaffControls } from '@/lib/api/mock/staff'
import { mockSubmissionControls } from '@/lib/api/mock/submission'
import type { Role } from '@/lib/api/types'
import { routes } from '@/routes/router'

const LOAD = { timeout: 5000 }
const NO_ACCESS = "You don't have access to this page"

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

beforeEach(async () => {
  mockSubmissionControls.reset()
  mockStaffControls.reset()
  mockReviewControls.reset()
  mockFeedbackControls.reset()
  mockOversightControls.reset()
  window.localStorage.clear()
  await as(null)
})

describe('T11 notifications (NTF-01)', () => {
  it("shows only the reader's own notifications and marks them all read", async () => {
    await as('applicant')
    const user = renderAt('/notifications')
    expect(await screen.findByRole('heading', { name: 'Notifications', level: 1 }, LOAD)).toBeInTheDocument()
    expect(screen.getByText('3 unread')).toBeInTheDocument()
    // The applicant's sample notifications (demo data) appear with the seeded ones.
    expect(screen.getByRole('link', { name: /^Unread: ?Clarification requested/ })).toHaveAttribute('href', '/ideas/30000000-0000-4000-8000-000000000008')
    expect(screen.getByText('Reply from CEDA support')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /^Unread: ?Your idea is under review/ })).toHaveAttribute('href', '/ideas/30000000-0000-4000-8000-000000000008')
    expect(screen.getByText('Idea submitted')).toBeInTheDocument()
    // Another person's notification (the reviewer's "New case to review") never appears.
    expect(screen.queryByText('New case to review')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Unread' }))
    expect(screen.queryByText('Idea submitted')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Mark all as read' }))
    expect(await screen.findByText('No unread notifications.', {}, LOAD)).toBeInTheDocument()
    expect(screen.getByText("You're all caught up.")).toBeInTheDocument()
  })

  it("cannot mark someone else's notifications read", async () => {
    await as('screening_officer')
    expect(await mockOversight.markRead(['90000000-0000-4000-8000-000000000002'])).toEqual({ kind: 'ok', data: { updated: 0 } })
    await as('applicant')
    expect((await mockOversight.listNotifications()).find((n) => n.id === '90000000-0000-4000-8000-000000000002')?.read_at).toBeNull()
  })
})

describe('T13 reports (RPT-01)', () => {
  it('reconciles with the seed: 8 cases, 4 applicants, one award of BWP 250,000', async () => {
    await as('admin')
    const user = renderAt('/reports')
    expect(await screen.findByRole('heading', { name: 'Reports', level: 1 }, LOAD)).toBeInTheDocument()
    expect(within(screen.getByText('Ideas submitted', { selector: 'span' }).parentElement!).getByText('8')).toBeInTheDocument()
    expect(within(screen.getByText('Applicants').parentElement!).getByText('4')).toBeInTheDocument()

    await user.click(screen.getByRole('tab', { name: 'Outcomes' }))
    expect(screen.getByText('Total awarded: BWP 250,000.00.')).toBeInTheDocument()
    await user.click(screen.getAllByRole('button', { name: 'Show as table' })[0]!)
    const table = screen.getByRole('table', { name: 'Cases that reached each stage' })
    expect(within(table).getByRole('row', { name: 'Submission 8' })).toBeInTheDocument()
    expect(within(table).getByRole('row', { name: 'Award 1' })).toBeInTheDocument()
  })

  it('refuses a period that ends before it starts, and shows an empty period plainly', async () => {
    await as('admin')
    const user = renderAt('/reports')
    await screen.findByRole('heading', { name: 'Reports', level: 1 }, LOAD)
    await user.type(screen.getByLabelText('From'), '2026-11-10')
    await user.type(screen.getByLabelText('To'), '2026-11-01')
    await user.click(screen.getByRole('button', { name: 'Apply filters' }))
    expect(screen.getByRole('alert')).toHaveTextContent('The period must end on or after the day it starts')

    await user.clear(screen.getByLabelText('From'))
    await user.clear(screen.getByLabelText('To'))
    await user.type(screen.getByLabelText('From'), '2025-01-01')
    await user.type(screen.getByLabelText('To'), '2025-01-31')
    await user.click(screen.getByRole('button', { name: 'Apply filters' }))
    expect(await screen.findByText('No activity in this period.', {}, LOAD)).toBeInTheDocument()
  })

  it('shows "no access" to roles the server refuses (committee member) and the port returns nothing', async () => {
    await as('committee_member')
    renderAt('/reports')
    expect(await screen.findByRole('heading', { name: NO_ACCESS }, LOAD)).toBeInTheDocument()
    await as('reviewer')
    expect(await mockOversight.getReport({})).toBeNull()
    expect(await mockOversight.reportRows({})).toBeNull()
  })
})

describe('T14 audit log (SEC-03)', () => {
  it('lists entries newest first, filters by case reference and shows the metadata', async () => {
    await as('auditor')
    const user = renderAt('/audit')
    expect(await screen.findByRole('heading', { name: 'Audit log', level: 1 }, LOAD)).toBeInTheDocument()
    expect(screen.getByText("Audit entries can't be edited or deleted.")).toBeInTheDocument()
    await user.type(screen.getByLabelText('Case reference'), 'ceda-2026-0006')
    await user.click(screen.getByRole('button', { name: 'Apply filters' }))
    await waitFor(() => expect(screen.queryByText('CEDA-2026-0001')).not.toBeInTheDocument(), LOAD)
    const award = await screen.findByText('award.recorded', {}, LOAD)
    expect(screen.getAllByText('CEDA-2026-0006').length).toBeGreaterThan(1)
    await user.click(award)
    expect(screen.getByText('amount_minor')).toBeInTheDocument()
    expect(screen.getByText('25000000')).toBeInTheDocument()

    await user.clear(screen.getByLabelText('Case reference'))
    await user.type(screen.getByLabelText('Case reference'), 'CEDA-2099-0001')
    await user.click(screen.getByRole('button', { name: 'Apply filters' }))
    expect(await screen.findByText('No entries match these filters.', {}, LOAD)).toBeInTheDocument()
  })

  it('is closed to everyone but admins and auditors, and pages by id', async () => {
    await as('reviewer')
    renderAt('/audit')
    expect(await screen.findByRole('heading', { name: NO_ACCESS }, LOAD)).toBeInTheDocument()
    expect(await mockOversight.queryAudit({})).toBeNull()
    await as('admin')
    const page = (await mockOversight.queryAudit({ limit: 3 }))!
    expect(page).toHaveLength(3)
    expect(page[0]!.id).toBeGreaterThan(page[1]!.id)
    const older = (await mockOversight.queryAudit({ limit: 3, beforeId: page[2]!.id }))!
    expect(older[0]!.id).toBeLessThan(page[2]!.id)
  })
})

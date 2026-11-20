import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter, useRoutes } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import { mockChat, mockChatControls } from '@/lib/api/mock/chat'
import { mockFeedbackControls } from '@/lib/api/mock/feedback'
import { mockOversightControls } from '@/lib/api/mock/oversight'
import { mockReviewControls } from '@/lib/api/mock/review'
import { mockSession } from '@/lib/api/mock/session'
import { mockStaffControls } from '@/lib/api/mock/staff'
import { mockSubmissionControls } from '@/lib/api/mock/submission'
import type { Role } from '@/lib/api/types'
import { routes } from '@/routes/router'

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
}

const as = (role: Role | null) => mockSession.switchDemoRole?.(role)
const tile = (label: string) => screen.getByText(label, { selector: 'span' }).parentElement!

beforeEach(async () => {
  mockSubmissionControls.reset()
  mockStaffControls.reset()
  mockReviewControls.reset()
  mockFeedbackControls.reset()
  mockOversightControls.reset()
  mockChatControls.reset()
  await as(null)
})

describe('T06 staff home', () => {
  it('gives the screening officer the screening count and the oldest cases to screen', async () => {
    await as('screening_officer')
    renderAt('/staff')
    expect(await screen.findByRole('heading', { name: 'Welcome, Demo Screening Officer' }, LOAD)).toBeInTheDocument()
    expect(within(tile('Awaiting screening')).getByText('1')).toBeInTheDocument()
    const tasks = screen.getByRole('list', { name: 'Your next tasks' })
    expect(within(tasks).getByRole('link', { name: /Screen CEDA-2026-0001/ })).toHaveAttribute('href', '/staff/cases/30000000-0000-4000-8000-000000000001')
    // Staff without decision rights see no decision figures.
    expect(screen.queryByText('Ready for decision')).not.toBeInTheDocument()
  })

  it("gives the reviewer their own reviews and recent activity, and nothing about other people's work", async () => {
    await as('reviewer')
    renderAt('/staff')
    expect(await screen.findByRole('heading', { name: 'Welcome, Demo Reviewer 1' }, LOAD)).toBeInTheDocument()
    expect(screen.getByText('Reviews to do', { selector: 'span' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /CEDA-2026-0008/ })).toHaveAttribute('href', '/staff/cases/30000000-0000-4000-8000-000000000008/score')
    expect(screen.queryByText('Awaiting screening')).not.toBeInTheDocument()
    expect(screen.getAllByText('New case to review').length).toBeGreaterThan(0)
  })

  it('gives the adjudicator the cases ready for decision', async () => {
    await as('adjudicator')
    renderAt('/staff')
    await screen.findByRole('heading', { name: 'Welcome, Demo Adjudicator' }, LOAD)
    expect(within(tile('Ready for decision')).getByText('1')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Decide CEDA-2026-0004/ })).toHaveAttribute('href', '/staff/cases/30000000-0000-4000-8000-000000000004/panel')
  })

  it('shows consultants waiting chats, and an empty state when nothing is waiting', async () => {
    await as('support_consultant')
    renderAt('/staff')
    expect(await screen.findByText('Nothing needs your attention right now.', {}, LOAD)).toBeInTheDocument()
    expect(within(tile('Chats waiting')).getByText('0')).toBeInTheDocument()
  })

  it('lists a waiting chat as a task for the consultant', async () => {
    await as('applicant')
    await mockChat.start('Hello, I need help.')
    await as('support_consultant')
    renderAt('/staff')
    expect(await screen.findByRole('link', { name: /Answer Demo Applicant A/ }, LOAD)).toHaveAttribute('href', '/support/inbox')
  })
})

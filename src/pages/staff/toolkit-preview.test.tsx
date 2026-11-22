import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useRoutes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mockChatControls } from '@/lib/api/mock/chat'
import { mockFeedbackControls } from '@/lib/api/mock/feedback'
import { mockOversightControls } from '@/lib/api/mock/oversight'
import { mockReviewControls } from '@/lib/api/mock/review'
import { mockSession } from '@/lib/api/mock/session'
import { mockStaffControls } from '@/lib/api/mock/staff'
import { mockSubmissionControls } from '@/lib/api/mock/submission'
import type { Role } from '@/lib/api/types'
import { routes } from '@/routes/router'

const LOAD = { timeout: 5000 }
const HOME = /^Good (morning|afternoon|evening), /

function renderHome() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  function App() {
    return useRoutes(routes)
  }
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/staff']}>
        <App />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

const as = (role: Role | null) => mockSession.switchDemoRole?.(role)

beforeEach(async () => {
  mockSubmissionControls.reset()
  mockStaffControls.reset()
  mockReviewControls.reset()
  mockFeedbackControls.reset()
  mockOversightControls.reset()
  mockChatControls.reset()
  await as(null)
})
afterEach(() => vi.unstubAllEnvs())

describe('toolkit preview on staff home (docs/plans/toolkit-preview)', () => {
  it('is not shown to a reviewer when the flag is off (the default)', async () => {
    vi.stubEnv('VITE_TOOLKIT_PREVIEW', '')
    await as('reviewer')
    renderHome()
    expect(await screen.findByRole('heading', { level: 1, name: HOME }, LOAD)).toBeInTheDocument()
    expect(screen.queryByText('Reviewer Intelligence Toolkit')).not.toBeInTheDocument()
  })

  it('with the flag on, shows a reviewer only the reviewer toolkit, and its dialog lists all 8 tools', async () => {
    vi.stubEnv('VITE_TOOLKIT_PREVIEW', 'true')
    await as('reviewer')
    renderHome()
    const section = await screen.findByRole('region', { name: 'Reviewer Intelligence Toolkit' }, LOAD)
    expect(within(section).getByText(/not yet available/)).toBeInTheDocument()
    expect(within(section).getAllByText('Planned feature')).toHaveLength(4)
    expect(screen.queryByText('Business Development Toolkit')).not.toBeInTheDocument()

    await userEvent.setup().click(within(section).getByRole('button', { name: 'View planned tools' }))
    const dialog = screen.getByRole('dialog', { name: 'Reviewer Intelligence Toolkit' })
    expect(within(dialog).getAllByText('Planned feature')).toHaveLength(8)
  })

  it.each<Role>(['screening_officer', 'adjudicator', 'admin'])('with the flag on, is not shown to a %s without the reviewer role', async (role) => {
    vi.stubEnv('VITE_TOOLKIT_PREVIEW', 'true')
    await as(role)
    renderHome()
    expect(await screen.findByRole('heading', { level: 1, name: HOME }, LOAD)).toBeInTheDocument()
    expect(screen.queryByText('Reviewer Intelligence Toolkit')).not.toBeInTheDocument()
  })
})

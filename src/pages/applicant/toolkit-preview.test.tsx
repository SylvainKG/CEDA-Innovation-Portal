import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useRoutes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mockSession } from '@/lib/api/mock/session'
import { mockSubmissionControls } from '@/lib/api/mock/submission'
import { routes } from '@/routes/router'

const LOAD = { timeout: 5000 }

function renderIdeas() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  function App() {
    return useRoutes(routes)
  }
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/ideas']}>
        <App />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(async () => {
  mockSubmissionControls.reset()
  window.localStorage.clear()
  await mockSession.switchDemoRole?.('applicant')
})
afterEach(() => vi.unstubAllEnvs())

describe('toolkit preview on My ideas (docs/plans/toolkit-preview)', () => {
  it('is not shown when the flag is off (the default)', async () => {
    vi.stubEnv('VITE_TOOLKIT_PREVIEW', '')
    renderIdeas()
    expect(await screen.findByRole('heading', { level: 1, name: 'Welcome, Demo Applicant A' }, LOAD)).toBeInTheDocument()
    expect(screen.queryByText('Business Development Toolkit')).not.toBeInTheDocument()
    expect(screen.queryByText('Reviewer Intelligence Toolkit')).not.toBeInTheDocument()
  })

  it('with the flag on, shows only the innovator toolkit, and its dialog lists all 14 tools', async () => {
    vi.stubEnv('VITE_TOOLKIT_PREVIEW', 'true')
    renderIdeas()
    const section = await screen.findByRole('region', { name: 'Business Development Toolkit' }, LOAD)
    expect(within(section).getByText(/not yet available/)).toBeInTheDocument()
    expect(within(section).getAllByText('Planned feature')).toHaveLength(4)
    expect(screen.queryByText('Reviewer Intelligence Toolkit')).not.toBeInTheDocument()

    await userEvent.setup().click(within(section).getByRole('button', { name: 'View planned tools' }))
    const dialog = screen.getByRole('dialog', { name: 'Business Development Toolkit' })
    expect(within(dialog).getAllByText('Planned feature')).toHaveLength(14)
  })
})

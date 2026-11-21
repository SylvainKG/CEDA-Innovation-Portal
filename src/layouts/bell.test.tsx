import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useRoutes } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import { mockOversightControls } from '@/lib/api/mock/oversight'
import { mockSession } from '@/lib/api/mock/session'
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
  return userEvent.setup()
}

const as = (role: Role | null) => mockSession.switchDemoRole?.(role)

beforeEach(async () => {
  mockOversightControls.reset()
  window.localStorage.clear()
  await as(null)
})

describe('NTF-01 bell', () => {
  it('says how many notifications are unread, and drops the count once they are read', async () => {
    await as('applicant')
    mockOversightControls.notify('demo-applicant-a', { proposal_id: null, type: 'test', title: 'Another update', body: '' })
    const user = renderAt('/ideas')
    const bell = await screen.findByRole('link', { name: 'Notifications, 2 unread' }, LOAD)
    await user.click(bell)
    await user.click(await screen.findByRole('button', { name: 'Mark all as read' }, LOAD))
    expect(await screen.findByRole('link', { name: 'Notifications' }, LOAD)).toBeInTheDocument()
  })

  it('shows staff their own count only', async () => {
    await as('screening_officer')
    renderAt('/staff')
    expect(await screen.findByRole('link', { name: 'Notifications' }, LOAD)).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /unread/ })).not.toBeInTheDocument()
  })
})

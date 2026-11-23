import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
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
const bellNamed = (name: string | RegExp) => screen.findByRole('button', { name }, LOAD)

beforeEach(async () => {
  mockOversightControls.reset()
  window.localStorage.clear()
  await as(null)
})

describe('NTF-01 bell and notifications panel', () => {
  it('says how many notifications are unread, and drops the count once they are read', async () => {
    await as('applicant')
    mockOversightControls.notify('demo-applicant-a', { proposal_id: null, type: 'test', title: 'Another update', body: '' })
    const user = renderAt('/notifications')
    await screen.findByRole('heading', { level: 1, name: 'Notifications' }, LOAD)
    expect(await bellNamed('Notifications, 4 unread')).toBeInTheDocument()
    await user.click(await screen.findByRole('button', { name: 'Mark all as read' }, LOAD))
    expect(await bellNamed('Notifications')).toBeInTheDocument()
  })

  it('opens a panel listing the newest notifications; choosing one closes it, marks it read and opens the notifications page', async () => {
    await as('applicant')
    const user = renderAt('/ideas')
    const bell = await bellNamed('Notifications, 3 unread')
    expect(bell).toHaveAttribute('aria-expanded', 'false')

    await user.click(bell)
    const panel = screen.getByRole('dialog', { name: 'Notifications' })
    expect(bell).toHaveAttribute('aria-expanded', 'true')
    const items = within(panel).getAllByRole('button')
    // Newest first, at most five; the rest are on the notifications page.
    expect(items).toHaveLength(5)
    expect(items[0]).toHaveAccessibleName(/^Unread: ?Clarification requested/)
    expect(within(panel).getByRole('link', { name: /View all notifications/ })).toHaveAttribute('href', '/notifications')

    await user.click(items[0]!)
    expect(screen.queryByRole('dialog', { name: 'Notifications' })).not.toBeInTheDocument()
    expect(await screen.findByRole('heading', { level: 1, name: 'Notifications' }, LOAD)).toBeInTheDocument()
    expect(await bellNamed('Notifications, 2 unread')).toBeInTheDocument()
  })

  it('closes with Escape and returns focus to the bell', async () => {
    await as('reviewer')
    const user = renderAt('/staff')
    const bell = await bellNamed(/^Notifications, \d+ unread$/)
    await user.click(bell)
    expect(screen.getByRole('dialog', { name: 'Notifications' })).toHaveFocus()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog', { name: 'Notifications' })).not.toBeInTheDocument()
    expect(bell).toHaveFocus()
  })

  it.each<[Role, string]>([
    ['screening_officer', 'New idea to screen'],
    ['reviewer', 'Scorecard due in 2 days'],
    ['admin', 'Applicant waiting in chat'],
    ['auditor', 'Role change recorded'],
  ])('gives the %s their own sample notifications, never anyone else\'s', async (role, own) => {
    await as(role)
    const user = renderAt('/staff')
    await user.click(await bellNamed(/^Notifications/))
    const panel = screen.getByRole('dialog', { name: 'Notifications' })
    expect(within(panel).getByText(own)).toBeInTheDocument()
    // The applicant's notifications never appear on a staff dashboard.
    expect(within(panel).queryByText('Clarification requested')).not.toBeInTheDocument()
  })
})

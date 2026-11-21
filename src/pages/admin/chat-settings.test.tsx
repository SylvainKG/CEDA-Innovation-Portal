import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useRoutes } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import { mockChat, mockChatControls } from '@/lib/api/mock/chat'
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
  mockChatControls.reset()
  await as(null)
})

describe('T12 chat settings (CHT-02)', () => {
  it('closes chat with the demo switch, and applicants then see the closed state', async () => {
    await as('admin')
    const user = renderAt('/admin/settings/chat')
    expect(await screen.findByText('Chat is open now.', {}, LOAD)).toBeInTheDocument()
    await user.click(screen.getByRole('radio', { name: 'Always closed' }))
    expect(await screen.findByText('Chat set to: always closed.', {}, LOAD)).toBeInTheDocument()
    expect(await screen.findByText('Chat is closed now.', {}, LOAD)).toBeInTheDocument()
    cleanup()
    await as('applicant')
    renderAt('/support/chat')
    expect(await screen.findByText('Chat is closed now', {}, LOAD)).toBeInTheDocument()
  })

  it('changes a day’s hours, refuses closing before opening, and adds and removes a closure day', async () => {
    await as('admin')
    const user = renderAt('/admin/settings/chat')
    const friday = await screen.findByRole('listitem', { name: 'Friday' }, LOAD)
    await user.clear(within(friday).getByLabelText('Friday closes'))
    await user.type(within(friday).getByLabelText('Friday closes'), '08:00')
    await user.click(within(friday).getByRole('button', { name: 'Save Friday' }))
    expect(within(friday).getByRole('alert')).toHaveTextContent('Opening time must be before closing time')
    await user.clear(within(friday).getByLabelText('Friday closes'))
    await user.type(within(friday).getByLabelText('Friday closes'), '13:00')
    await user.click(within(friday).getByRole('button', { name: 'Save Friday' }))
    expect(await screen.findByText('Friday saved.', {}, LOAD)).toBeInTheDocument()
    expect((await mockChat.status()).hours.find((h) => h.weekday === 5)?.closes_at).toBe('13:00')

    await user.type(screen.getByLabelText('Date'), '2026-12-25')
    await user.type(screen.getByLabelText('Reason'), 'Christmas Day')
    await user.click(screen.getByRole('button', { name: 'Add closure' }))
    expect(await screen.findByText('Christmas Day', {}, LOAD)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Re-open 25 Dec 2026' }))
    expect(await screen.findByText('No closure days.', {}, LOAD)).toBeInTheDocument()
  })

  it('is refused to everyone but administrators', async () => {
    await as('support_lead')
    expect(await mockChat.setOverride('open')).toMatchObject({ kind: 'refused', code: 'FORBIDDEN' })
    expect(await mockChat.setHours({ weekday: 1, isWorking: true, opensAt: '08:00', closesAt: '17:00' })).toMatchObject({ kind: 'refused', code: 'FORBIDDEN' })
    renderAt('/admin/settings/chat')
    expect(await screen.findByRole('heading', { name: "You don't have access to this page" }, LOAD)).toBeInTheDocument()
  })
})

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useRoutes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mockOversight, mockOversightControls } from '@/lib/api/mock/oversight'
import { mockSession } from '@/lib/api/mock/session'
import type { Role } from '@/lib/api/types'
import { routes } from '@/routes/router'

const LOAD = { timeout: 5000 }
const SWITCH = "Email me when there's an update on my ideas (free)"

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
  mockOversightControls.reset()
  window.localStorage.clear()
  await as(null)
})

describe('NTF-02 e-mail alerts', () => {
  it('turns alerts on and off, saves at once, and keeps the setting after a reload', async () => {
    await as('applicant')
    let user = renderAt('/notifications')
    const toggle = await screen.findByRole('switch', { name: SWITCH }, LOAD)
    expect(toggle).not.toBeChecked()
    expect(toggle).toHaveAccessibleDescription("Emails say an update is waiting; they never include your idea's content.")
    await user.click(toggle)
    expect(await screen.findByText('Saved: e-mail alerts are on.', {}, LOAD)).toBeInTheDocument()
    expect(screen.getByText('Email delivery is simulated in this demo.')).toBeInTheDocument()

    cleanup()
    user = renderAt('/notifications')
    const again = await screen.findByRole('switch', { name: SWITCH }, LOAD)
    await vi.waitFor(() => expect(again).toBeChecked(), LOAD)
    await user.click(again)
    expect(await screen.findByText('Saved: e-mail alerts are off.', {}, LOAD)).toBeInTheDocument()
    expect(await mockOversight.alertPreference()).toBe(false)
  })

  it("changes only the reader's own setting", async () => {
    await as('applicant')
    await mockOversight.setAlertPreference(true)
    await as('reviewer')
    expect(await mockOversight.alertPreference()).toBe(false)
    renderAt('/notifications')
    expect(await screen.findByRole('switch', { name: 'Email me when something needs my attention' }, LOAD)).not.toBeChecked()
  })

  it('after a lost reply, shows what the server actually saved', async () => {
    await as('applicant')
    const real = mockOversight.setAlertPreference.bind(mockOversight)
    // The change reached the server but the reply was lost: it is confirmed by re-reading.
    vi.spyOn(mockOversight, 'setAlertPreference').mockImplementationOnce(async (v) => {
      await real(v)
      throw new Error('network')
    })
    const user = renderAt('/notifications')
    await user.click(await screen.findByRole('switch', { name: SWITCH }, LOAD))
    expect(await screen.findByText('Saved: e-mail alerts are on.', {}, LOAD)).toBeInTheDocument()
    expect(screen.getByRole('switch', { name: SWITCH })).toBeChecked()
  })
})

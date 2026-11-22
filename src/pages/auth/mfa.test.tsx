import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useRoutes } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import { MOCK_MFA_CODE, mockMfaControls } from '@/lib/api/mock/mfa'
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
  mockMfaControls.reset()
  window.localStorage.clear()
  await as(null)
})

describe('T02 two-step sign-in (D-07)', () => {
  it('lets exempt seeded staff through with the "no code needed" banner', async () => {
    await as('reviewer')
    renderAt('/auth/mfa')
    expect(await screen.findByText('No authenticator code is needed for this account.', {}, LOAD)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Continue' })).toHaveAttribute('href', '/staff')
  })

  it('sets up an authenticator app, refuses a wrong code, and continues after the right one', async () => {
    mockMfaControls.requireFor(true)
    await as('screening_officer')
    const user = renderAt('/auth/mfa?next=/staff/queue/screening')
    await user.click(await screen.findByRole('button', { name: 'Set up my app' }, LOAD))
    expect(await screen.findByRole('img', { name: 'QR code for your authenticator app' }, LOAD)).toBeInTheDocument()
    expect(screen.getByText('MOCKSECRETDEMO23')).toBeInTheDocument()

    await user.type(screen.getByLabelText('6-digit code'), '12')
    await user.click(screen.getByRole('button', { name: 'Verify' }))
    expect(screen.getByText('Enter the 6-digit code from your app')).toBeInTheDocument()

    await user.clear(screen.getByLabelText('6-digit code'))
    await user.type(screen.getByLabelText('6-digit code'), '999999')
    await user.click(screen.getByRole('button', { name: 'Verify' }))
    expect(await screen.findByText("That code didn't work", {}, LOAD)).toBeInTheDocument()
    expect(screen.getByLabelText('6-digit code')).toHaveValue('')

    await user.type(screen.getByLabelText('6-digit code'), MOCK_MFA_CODE)
    await user.click(screen.getByRole('button', { name: 'Verify' }))
    expect(await screen.findByRole('heading', { name: 'Screening queue', level: 1 }, LOAD)).toBeInTheDocument()
  })

  it('asks people who are signed out to sign in first, and needs nothing from applicants', async () => {
    renderAt('/auth/mfa')
    expect(await screen.findByText('Sign in first.', {}, LOAD)).toBeInTheDocument()
    await as('applicant')
    mockMfaControls.requireFor(true)
    renderAt('/auth/mfa')
    expect(await screen.findByText(/You're fully signed in/, {}, LOAD)).toBeInTheDocument()
  })
})

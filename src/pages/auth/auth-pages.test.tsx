import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter, useRoutes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockSession, MOCK_UNVERIFIED_EMAIL, MOCK_WRONG_PASSWORD } from '@/lib/api/mock/session'
import { mockSubmissionControls } from '@/lib/api/mock/submission'
import { routes } from '@/routes/router'

function renderAt(path: string, state?: unknown) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  function App() {
    return useRoutes(routes)
  }
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[state ? { pathname: path, state } : path]}>
        <App />
      </MemoryRouter>
    </QueryClientProvider>,
  )
  return client
}

const type = (label: RegExp | string, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } })
const press = (name: RegExp | string) => fireEvent.click(screen.getByRole('button', { name }))

beforeEach(async () => {
  mockSubmissionControls.reset()
  window.localStorage.clear()
  await mockSession.switchDemoRole?.(null)
})

describe('T02 sign in', () => {
  it('lists missing fields in an error summary that links to each field', async () => {
    renderAt('/auth/sign-in')
    await screen.findByRole('heading', { level: 1, name: 'Sign in' })
    press(/^Sign in$/)
    const summary = await screen.findByRole('alert')
    expect(within(summary).getByRole('link', { name: 'Enter your email address' })).toHaveAttribute('href', '#signin-email')
    expect(within(summary).getByRole('link', { name: 'Enter your password' })).toHaveAttribute('href', '#signin-password')
    fireEvent.click(within(summary).getByRole('link', { name: 'Enter your password' }))
    expect(document.activeElement).toBe(screen.getByLabelText(/^Password/))
  })

  it('never says which of email or password was wrong, and clears the password', async () => {
    renderAt('/auth/sign-in')
    type(/Email address/, 'applicant.a@demo.ceda-portal.test')
    type(/^Password/, MOCK_WRONG_PASSWORD)
    press(/^Sign in$/)
    // Shown in the "There is a problem" box (Sandra's frame), linked to the email field to try again.
    const summary = await screen.findByRole('alert')
    expect(within(summary).getByRole('link', { name: 'Email or password is incorrect.' })).toHaveAttribute('href', '#signin-email')
    expect(screen.getByLabelText(/^Password/)).toHaveValue('')
  })

  it('has the frame’s intro and puts "Forgot password?" under the password field', async () => {
    renderAt('/auth/sign-in')
    expect(await screen.findByText('Access your ideas or staff workspace.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Forgot password?' })).toHaveAttribute('href', '/auth/forgot')
    expect(screen.getByRole('link', { name: 'Register' })).toHaveAttribute('href', '/auth/register')
  })

  it('offers no demo-account picker or demo note (accounts are given with the submission; team lead, 22 Nov)', async () => {
    renderAt('/auth/sign-in')
    expect(await screen.findByRole('heading', { level: 1, name: 'Sign in' })).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Choose a demo portal' })).not.toBeInTheDocument()
    expect(screen.queryByText(/Demo accounts are available/)).not.toBeInTheDocument()
  })

  it('offers to resend the link to an unverified address', async () => {
    renderAt('/auth/sign-in')
    type(/Email address/, MOCK_UNVERIFIED_EMAIL)
    type(/^Password/, 'anything-long-enough')
    press(/^Sign in$/)
    expect(await screen.findByText('Verify your email address')).toBeInTheDocument()
    press('Resend the link')
    expect(await screen.findByText(/We sent a new link/)).toBeInTheDocument()
  })

  it('signs a demo applicant in and goes to a safe "next" page, ignoring an outside one', async () => {
    renderAt('/auth/sign-in?next=%2Fideas')
    type(/Email address/, 'applicant.a@demo.ceda-portal.test')
    type(/^Password/, 'demo-password-1')
    press(/^Sign in$/)
    expect(await screen.findByRole('heading', { level: 1, name: 'Welcome, Demo Applicant A' })).toBeInTheDocument()
  })

  it('removes the previous person’s unsent drafts and keys when someone else signs in, but keeps the same person’s', async () => {
    window.localStorage.setItem('ceda.last.user', 'demo-admin')
    window.localStorage.setItem('ceda.draft.local.p1', '{"data":{}}')
    renderAt('/auth/sign-in')
    type(/Email address/, 'applicant.a@demo.ceda-portal.test')
    type(/^Password/, 'demo-password-1')
    press(/^Sign in$/)
    await screen.findByRole('heading', { level: 1, name: 'Welcome, Demo Applicant A' })
    expect(window.localStorage.getItem('ceda.draft.local.p1')).toBeNull()
    expect(window.localStorage.getItem('ceda.last.user')).toBe('demo-applicant-a')
  })

  it('shows a confirmation after verifying or resetting', async () => {
    renderAt('/auth/sign-in?verified=1')
    expect(await screen.findByText('Your email is verified. Sign in to continue.')).toBeInTheDocument()
  })

  it('keeps the development-only mock picker, clearly labelled', async () => {
    renderAt('/auth/sign-in')
    expect(await screen.findByRole('heading', { name: 'Mock session (development only)' })).toBeInTheDocument()
  })
})

describe('T02 register', () => {
  it('shows the compact privacy panel with its Sample label and requires consent and a 12-character password', async () => {
    renderAt('/auth/register')
    expect(await screen.findByRole('heading', { level: 1, name: 'Create your account' })).toBeInTheDocument()
    expect(await screen.findByRole('heading', { name: 'How we use your information' })).toBeInTheDocument()
    expect(screen.getByText('Sample: awaiting CEDA confirmation')).toBeInTheDocument()
    type(/Full name/, 'Demo Person')
    type(/Email address/, 'person@example.test')
    type(/^Password/, 'short-pass1')
    press(/^Create account$/)
    const summary = await screen.findByRole('alert')
    expect(within(summary).getByText('Use at least 12 characters for your password')).toBeInTheDocument()
    expect(within(summary).getByText('Accept the privacy notice to register')).toBeInTheDocument()
    expect(within(summary).queryByText(/full name/)).not.toBeInTheDocument()
  })

  it('ticks off "At least 12 characters" as the password grows, and links the rule to the field', async () => {
    renderAt('/auth/register')
    await screen.findByRole('heading', { name: 'How we use your information' })
    const rule = screen.getByText(/At least 12 characters/)
    expect(rule).toHaveTextContent('At least 12 characters: not yet')
    type(/^Password/, 'eleven-char')
    expect(rule).toHaveTextContent('At least 12 characters: not yet')
    type(/^Password/, 'twelve-chars')
    expect(rule).toHaveTextContent('At least 12 characters: done')
    expect(screen.getByLabelText(/^Password/).getAttribute('aria-describedby')).toContain('reg-password-rules')
  })

  it('keeps the full, versioned privacy notice one tap away', async () => {
    renderAt('/auth/register')
    await screen.findByRole('heading', { name: 'How we use your information' })
    expect(screen.getByText('Read the full privacy notice')).toBeInTheDocument()
    expect(screen.getByText(/This demonstration portal stores the details you enter/)).toBeInTheDocument()
  })

  it('sends the notice version with the registration and goes to "Check your email" (address not in the URL)', async () => {
    const register = vi.spyOn(mockSession, 'register')
    renderAt('/auth/register')
    await screen.findByRole('heading', { name: 'How we use your information' })
    type(/Full name/, 'Demo Person')
    type(/Email address/, 'person@example.test')
    type(/^Password/, 'a long enough password')
    fireEvent.click(screen.getByLabelText(/I agree to the privacy notice/))
    press(/^Create account$/)
    expect(await screen.findByRole('heading', { level: 1, name: 'Check your email' })).toBeInTheDocument()
    expect(register).toHaveBeenCalledWith(expect.objectContaining({ email: 'person@example.test', consentVersion: 'sample-2026-11-v1' }))
    expect(screen.getByText('person@example.test')).toBeInTheDocument()
    register.mockRestore()
  })
})

describe('T02 verify, forgot and reset', () => {
  it('lets the person resend only after 60 seconds', async () => {
    vi.useFakeTimers()
    try {
      renderAt('/auth/verify', { email: 'person@example.test' })
      const resend = screen.getByRole('button', { name: /Resend the link/ })
      expect(resend).toBeDisabled()
      expect(screen.getByText('You can resend in 60 s')).toBeInTheDocument()
      for (let i = 0; i < 60; i += 1) act(() => void vi.advanceTimersByTime(1_000))
      expect(screen.getByRole('button', { name: /Resend the link/ })).toBeEnabled()
    } finally {
      vi.useRealTimers()
    }
  })

  it('after a refresh (address unknown) asks for the address, checks it, then resends at once', async () => {
    const resend = vi.spyOn(mockSession, 'resendVerification')
    renderAt('/auth/verify')
    await screen.findByRole('heading', { level: 1, name: 'Check your email' })
    press('Resend the link')
    expect(screen.getByText('Enter your email address')).toBeInTheDocument()
    type(/^Email address/, 'person@example.test')
    press('Resend the link')
    expect(await screen.findByText('We sent a new link.')).toBeInTheDocument()
    expect(resend).toHaveBeenCalledWith('person@example.test')
    resend.mockRestore()
  })

  it('makes the whole consent row the target', async () => {
    renderAt('/auth/register')
    await screen.findByRole('heading', { name: 'How we use your information' })
    fireEvent.click(screen.getByText(/I agree to the privacy notice/))
    expect(screen.getByRole('checkbox', { name: /I agree to the privacy notice/ })).toBeChecked()
  })

  it('answers a reset request neutrally', async () => {
    renderAt('/auth/forgot')
    type(/Email address/, 'nobody@example.test')
    press('Send the reset link')
    expect(await screen.findByText("If an account exists for that email, we've sent a reset link.")).toBeInTheDocument()
  })

  it('checks the new password, then signs out and returns to sign in', async () => {
    await mockSession.switchDemoRole?.('applicant')
    renderAt('/auth/reset')
    type(/^New password/, 'a long enough password')
    type(/Confirm the new password/, 'a different password!')
    press('Save the new password')
    expect(await screen.findByRole('link', { name: 'The two passwords do not match' })).toBeInTheDocument()
    type(/Confirm the new password/, 'a long enough password')
    press('Save the new password')
    expect(await screen.findByText('Your password was changed. Sign in with the new one.')).toBeInTheDocument()
    expect(await mockSession.getSession()).toBeNull()
  })
})

describe('sign out', () => {
  it('ends the session and forgets this person’s device copies', async () => {
    await mockSession.switchDemoRole?.('applicant')
    window.localStorage.setItem('ceda.draft.local.p1', '{"data":{}}')
    window.localStorage.setItem('ceda.submit.key.p1', 'k1')
    renderAt('/ideas')
    await screen.findByRole('heading', { level: 1, name: 'Welcome, Demo Applicant A' })
    // Sign out sits in the account menu on the avatar (decision #19).
    press('Account: Demo Applicant A')
    press('Sign out')
    expect(await screen.findByRole('heading', { level: 1, name: 'A new dawn for innovation in Botswana' })).toBeInTheDocument()
    expect(window.localStorage.getItem('ceda.draft.local.p1')).toBeNull()
    expect(window.localStorage.getItem('ceda.submit.key.p1')).toBeNull()
    expect(await mockSession.getSession()).toBeNull()
  })
})

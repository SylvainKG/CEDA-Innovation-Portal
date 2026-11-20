import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter, useLocation, useRoutes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { routes } from './router'

// The same route table the app uses, rendered with MemoryRouter + useRoutes. The data router's
// Request/AbortSignal does not work under jsdom on Node 24, so tests avoid createMemoryRouter.
function AppRoutes() {
  const location = useLocation()
  return (
    <>
      {useRoutes(routes)}
      <output data-testid="location">{location.pathname + location.search}</output>
    </>
  )
}

function renderAt(path: string, mockRole?: string) {
  if (mockRole) window.localStorage.setItem('ceda.mock.role', mockRole)
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <AppRoutes />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

async function staffNav() {
  // Wait until the session has loaded and the Home link is in the staff navigation.
  const home = await screen.findByRole('link', { name: 'Home' })
  return home.closest('nav') as HTMLElement
}

describe('routing and role shells (UI convenience; the server enforces access)', () => {
  it('sends a signed-out visitor from a staff page to sign-in, keeping where they were going', async () => {
    renderAt('/staff/queue/screening')
    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument()
    expect(screen.getByTestId('location')).toHaveTextContent('/auth/sign-in?next=%2Fstaff%2Fqueue%2Fscreening')
  })

  it('shows Forbidden to an applicant on the audit log', async () => {
    renderAt('/audit', 'applicant')
    // Page-level state: its title is the page's h1 (Sylvain's PR #6 review, finding 2).
    expect(await screen.findByRole('heading', { level: 1, name: "You don't have access to this page" })).toBeInTheDocument()
  })

  it('shows the administrator the audit log and settings links', async () => {
    renderAt('/staff', 'admin')
    const nav = await staffNav()
    expect(within(nav).getByRole('link', { name: 'Audit log' })).toBeInTheDocument()
    expect(within(nav).getByRole('link', { name: 'Settings' })).toBeInTheDocument()
  })

  it('does not show the audit log link to a reviewer', async () => {
    renderAt('/staff', 'reviewer')
    const nav = await staffNav()
    expect(within(nav).getByRole('link', { name: 'My reviews' })).toBeInTheDocument()
    expect(within(nav).queryByRole('link', { name: 'Audit log' })).not.toBeInTheDocument()
  })

  it('labels unbuilt screens honestly instead of faking them', async () => {
    renderAt('/admin/users', 'admin')
    expect(await screen.findByRole('heading', { level: 1, name: 'Users and roles' })).toBeInTheDocument()
    expect(document.body.textContent).toContain('Not built yet: T12')
  })

  it('gives applicants the applicant shell on shared pages', async () => {
    renderAt('/notifications', 'applicant')
    expect(await screen.findByRole('heading', { level: 1, name: 'Notifications' })).toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: 'Staff' })).not.toBeInTheDocument()
  })

  it('renders the not-found state for unknown paths', async () => {
    renderAt('/no-such-page')
    expect(await screen.findByRole('heading', { name: "We can't find this page" })).toBeInTheDocument()
  })

  it('shows the DEMO badge in every shell', async () => {
    renderAt('/')
    expect(await screen.findByText('DEMO')).toBeInTheDocument()
  })
})

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useRoutes } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
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
  window.localStorage.clear()
  await as(null)
})

describe('shared shell, laid out to Sandra\'s 21 Nov frames', () => {
  it('applicant: text links, DEMO pill, account menu with Sign out, and the floating chat button', async () => {
    await as('applicant')
    const user = renderAt('/ideas')
    await screen.findByRole('heading', { level: 1, name: 'Welcome, Demo Applicant A' }, LOAD)
    const header = screen.getByRole('banner')
    expect(within(header).queryByText('DEMO')).not.toBeInTheDocument() // no header pill (team lead, 22 Nov); the footer says demo
    const nav = within(header).getByRole('navigation', { name: 'Main' })
    expect(within(nav).getAllByRole('link').map((l) => l.textContent)).toEqual(['My ideas', 'Challenges', 'Help'])
    expect(within(nav).getByRole('link', { name: 'My ideas' })).toHaveAttribute('aria-current', 'page')

    // Sign out is in the menu on the avatar; Escape closes it and returns focus to the avatar.
    expect(screen.queryByRole('button', { name: 'Sign out' })).not.toBeInTheDocument()
    const account = within(header).getByRole('button', { name: 'Account: Demo Applicant A' })
    await user.click(account)
    expect(account).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('button', { name: 'Sign out' })).toBeInTheDocument()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('button', { name: 'Sign out' })).not.toBeInTheDocument()
    expect(account).toHaveFocus()

    expect(screen.getByRole('link', { name: 'Chat with CEDA' })).toHaveAttribute('href', '/support/chat')
    // Footer: Peolwane is a CEDA product, with CEDA's website, head office and offices.
    const footer = within(screen.getByRole('contentinfo'))
    expect(footer.getByText(/· Demo prototype with fictional data$/)).toBeInTheDocument()
    expect(footer.getByRole('heading', { name: /a CEDA product$/ })).toBeInTheDocument()
    const site = footer.getByRole('link', { name: /Visit CEDA's main website/ })
    expect(site).toHaveAttribute('href', 'https://www.ceda.co.bw')
    expect(site).toHaveAttribute('target', '_blank')
    expect(site).toHaveAttribute('rel', 'noopener noreferrer')
    expect(footer.getByText('Four Thirty Square, Plot 54350')).toBeInTheDocument()
    expect(footer.getByRole('link', { name: 'Tel +267 317 0895' })).toHaveAttribute('href', 'tel:+2673170895')
    expect(footer.getByRole('link', { name: /Addresses and phone numbers on ceda.co.bw/ })).toHaveAttribute('href', 'https://www.ceda.co.bw/contact-us')
  })

  it('hides the chat button on the chat page itself', async () => {
    await as('applicant')
    renderAt('/support/chat')
    await screen.findByRole('heading', { level: 1, name: 'Chat with CEDA' }, LOAD)
    expect(screen.queryByRole('link', { name: 'Chat with CEDA' })).not.toBeInTheDocument()
  })

  it('staff: the portal label and "Restricted staff area" in the sidebar, no chat button', async () => {
    await as('screening_officer')
    renderAt('/staff')
    await screen.findByRole('heading', { level: 1, name: /^Good (morning|afternoon|evening), Demo Screening Officer$/ }, LOAD)
    expect(screen.getAllByText('Screening officer portal').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Restricted staff area').length).toBeGreaterThan(0)
    expect(screen.queryByRole('link', { name: 'Chat with CEDA' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Account: Demo Screening Officer' })).toBeInTheDocument()
  })
})

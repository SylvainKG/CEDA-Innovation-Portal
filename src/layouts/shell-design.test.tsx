import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useRoutes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockSession } from '@/lib/api/mock/session'
import type { Role } from '@/lib/api/types'
import { routes } from '@/routes/router'

vi.mock('@/features/assistant/PeolwaneAssistant', () => ({
  // The floating launcher; the staff shell's `sidebar` placement floats nothing (the sidebar has its own launcher).
  PeolwaneAssistant: ({ placement = 'default' }: { placement?: string }) =>
    placement === 'sidebar' ? null : (
      <button type="button" aria-label="Peolwane AI" data-placement={placement}>
        Peolwane AI
      </button>
    ),
  PeolwaneSidebarLauncher: () => (
    <button type="button" aria-label="Peolwane AI" data-placement="sidebar">
      Peolwane AI
    </button>
  ),
}))

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
  it('applicant: text links, account menu, one Peolwane launcher, and human support access', async () => {
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

    expect(screen.getByRole('button', { name: 'Peolwane AI' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Message CEDA support' })).toHaveAttribute('href', '/support/chat')
    // The slim workspace footer: Peolwane is a CEDA product, with help links, the toll-free number and CEDA's website.
    const footer = within(screen.getByRole('contentinfo'))
    expect(footer.getByText(/· Demo prototype with fictional data$/)).toBeInTheDocument()
    expect(footer.getByRole('heading', { name: /a CEDA product$/ })).toBeInTheDocument()
    const site = footer.getByRole('link', { name: /Visit CEDA's main website/ })
    expect(site).toHaveAttribute('href', 'https://www.ceda.co.bw')
    expect(site).toHaveAttribute('target', '_blank')
    expect(site).toHaveAttribute('rel', 'noopener noreferrer')
    expect(footer.getByRole('link', { name: 'FAQs' })).toHaveAttribute('href', '/help/faqs')
    expect(footer.getByRole('link', { name: 'Contact and branches' })).toHaveAttribute('href', '/help/contacts')
    expect(footer.getByRole('link', { name: 'Toll-free 0800 600 253' })).toHaveAttribute('href', 'tel:0800600253')
  })

  it('public footer: CEDA head office, phone numbers, email and branch map', async () => {
    renderAt('/')
    await screen.findByRole('heading', { level: 1, name: 'A new dawn for innovation in Botswana' }, LOAD)
    const footer = within(screen.getByRole('contentinfo'))
    expect(footer.getByRole('heading', { name: /a CEDA product$/ })).toBeInTheDocument()
    expect(footer.getByRole('link', { name: /Visit CEDA's main website/ })).toHaveAttribute('href', 'https://www.ceda.co.bw')
    expect(footer.getByText('Four Thirty Square, Plot 54350')).toBeInTheDocument()
    expect(footer.getByRole('link', { name: 'Tel +267 317 0895' })).toHaveAttribute('href', 'tel:+2673170895')
    expect(footer.getByRole('link', { name: /View CEDA's interactive branch map/ })).toHaveAttribute('href', 'https://www.ceda.co.bw/branch-network')
    expect(footer.getByText(/· Demo prototype with fictional data$/)).toBeInTheDocument()
  })

  it('an applicant keeps the applicant navigation on Challenges, briefs and Help, and the logo leads to My ideas', async () => {
    await as('applicant')
    renderAt('/challenges')
    await screen.findByRole('heading', { level: 1, name: 'Challenges' }, LOAD)
    const header = screen.getByRole('banner')
    const nav = within(header).getByRole('navigation', { name: 'Main' })
    expect(within(nav).getAllByRole('link').map((l) => l.textContent)).toEqual(['My ideas', 'Challenges', 'Help'])
    expect(within(nav).getByRole('link', { name: 'Challenges' })).toHaveAttribute('aria-current', 'page')
    expect(within(header).queryByRole('link', { name: 'About Us' })).not.toBeInTheDocument()
    expect(within(header).getByRole('link', { name: 'Peolwane · CEDA Innovation Portal' })).toHaveAttribute('href', '/ideas')
    expect(screen.getByRole('button', { name: 'Peolwane AI' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Chat with CEDA' })).not.toBeInTheDocument()
  })

  it('staff keep the staff navigation on shared pages such as the FAQs', async () => {
    await as('admin')
    renderAt('/help/faqs')
    await screen.findByRole('heading', { level: 1, name: 'Frequently asked questions' }, LOAD)
    expect(screen.getAllByRole('navigation', { name: 'Staff' }).length).toBeGreaterThan(0)
    expect(screen.queryByRole('link', { name: 'About Us' })).not.toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: 'Peolwane · CEDA Innovation Portal' })[0]).toHaveAttribute('href', '/staff')
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
  })

  it('staff: Peolwane AI under the navigation and Sign out at the foot of the sidebar; the header only says who is signed in', async () => {
    await as('admin')
    renderAt('/staff')
    await screen.findByRole('heading', { level: 1, name: /^Good (morning|afternoon|evening), Demo Administrator$/ }, LOAD)
    const sidebar = within(screen.getByRole('navigation', { name: 'Staff' }))
    // One way in to Peolwane AI, in the sidebar after Settings (no floating launcher).
    const peolwane = screen.getAllByRole('button', { name: 'Peolwane AI' })
    expect(peolwane).toHaveLength(1)
    expect(peolwane[0]).toHaveAttribute('data-placement', 'sidebar')
    const settings = sidebar.getByRole('link', { name: 'Settings' })
    expect(settings.compareDocumentPosition(peolwane[0]!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    // Sign out sits in the sidebar, before "Restricted staff area"; the avatar is a label, not a menu.
    const signOut = sidebar.getByRole('button', { name: 'Sign out' })
    expect(peolwane[0]!.compareDocumentPosition(signOut) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(signOut.compareDocumentPosition(sidebar.getByText('Restricted staff area')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(signOut.parentElement).not.toContainElement(peolwane[0]!)
    const header = within(screen.getByRole('banner'))
    expect(header.queryByRole('button', { name: /^Account:/ })).not.toBeInTheDocument()
    expect(header.getByText('Signed in as Demo Administrator, Administrator')).toBeInTheDocument()
  })

  it('other staff: Peolwane AI sits at the foot of the sidebar, just above Sign out', async () => {
    await as('reviewer')
    renderAt('/staff')
    await screen.findByRole('heading', { level: 1, name: /^Good (morning|afternoon|evening), Demo Reviewer/ }, LOAD)
    const sidebar = within(screen.getByRole('navigation', { name: 'Staff' }))
    const peolwane = sidebar.getByRole('button', { name: 'Peolwane AI' })
    const signOut = sidebar.getByRole('button', { name: 'Sign out' })
    expect(signOut.parentElement).toContainElement(peolwane)
    expect(peolwane.compareDocumentPosition(signOut) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(screen.getAllByRole('button', { name: 'Peolwane AI' })).toHaveLength(1)
  })
})

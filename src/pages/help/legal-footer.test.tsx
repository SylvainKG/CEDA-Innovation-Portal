import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter, useRoutes } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import { CEDA } from '@/brand/ceda-info'
import { mockSession } from '@/lib/api/mock/session'
import { mockSubmissionControls } from '@/lib/api/mock/submission'
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
}

beforeEach(async () => {
  mockSubmissionControls.reset()
  window.localStorage.clear()
  await mockSession.switchDemoRole?.(null)
})

function expectFollowUs(footer: ReturnType<typeof within>) {
  expect(footer.getByText('Follow us')).toBeInTheDocument()
  for (const s of CEDA.social) {
    const link = footer.getByRole('link', { name: `CEDA on ${s.label} (opens in a new tab)` })
    expect(link).toHaveAttribute('href', s.url)
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  }
}

describe('terms of use, Data Protection Act and footer additions', () => {
  it('the public footer has Terms of use, Accessibility settings, Cookie preferences and Follow us', async () => {
    renderAt('/terms')
    expect(await screen.findByRole('heading', { level: 1, name: 'Terms of use' }, LOAD)).toBeInTheDocument()
    const footer = within(screen.getByRole('contentinfo'))
    expect(footer.getByRole('link', { name: 'Terms of use' })).toHaveAttribute('href', '/terms')
    expect(footer.getByRole('button', { name: 'Accessibility settings' })).toBeInTheDocument()
    expect(footer.getByRole('button', { name: 'Cookie preferences' })).toBeInTheDocument()
    expectFollowUs(footer)
  })

  it('only follows the accounts CEDA links from its own site (Facebook and LinkedIn)', () => {
    expect(CEDA.social.map((s) => s.platform)).toEqual(['facebook', 'linkedin'])
    expect(CEDA.social.every((s) => s.url.startsWith('https://'))).toBe(true)
  })

  it('the terms cite the Data Protection Act, 2024 and are marked as a draft for legal review', async () => {
    renderAt('/terms')
    const main = within(await screen.findByRole('main', {}, LOAD))
    await screen.findByRole('heading', { level: 1, name: 'Terms of use' }, LOAD)
    expect(main.getByText('Draft: awaiting CEDA legal review')).toBeInTheDocument()
    expect(main.getByText(/Data Protection Act, 2024 \(Act No\. 18 of 2024\)/)).toBeInTheDocument()
    expect(main.getByRole('heading', { name: '9. Law and contact' })).toBeInTheDocument()
    expect(main.getByRole('link', { name: 'privacy notice' })).toHaveAttribute('href', '/privacy')
  })

  it('the privacy page adds the rights under the Act, including a complaint to the Commission', async () => {
    renderAt('/privacy')
    const rights = await screen.findByRole('region', { name: 'Your rights under the Data Protection Act, 2024' }, LOAD)
    expect(within(rights).getByText(/Act No\. 18 of 2024/)).toBeInTheDocument()
    expect(within(rights).getByText(/Information and Data Protection Commission/)).toBeInTheDocument()
    expect(within(rights).getByText('Draft: awaiting CEDA legal review')).toBeInTheDocument()
    expect(within(rights).getByRole('link', { name: CEDA.headOffice.email })).toHaveAttribute('href', `mailto:${CEDA.headOffice.email}`)
  })

  it('the slim workspace footer has the same additions', async () => {
    await mockSession.switchDemoRole?.('applicant')
    renderAt('/ideas')
    await screen.findByRole('heading', { level: 1, name: /^Welcome, / }, LOAD)
    const footer = within(screen.getByRole('contentinfo'))
    expect(footer.getByRole('link', { name: 'Terms of use' })).toHaveAttribute('href', '/terms')
    expect(footer.getByRole('button', { name: 'Accessibility settings' })).toBeInTheDocument()
    expect(footer.getByRole('button', { name: 'Cookie preferences' })).toBeInTheDocument()
    expect(footer.getByRole('group', { name: 'Follow us' })).toBeInTheDocument()
    expectFollowUs(footer)
  })
})

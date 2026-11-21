import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter, useRoutes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { mockContent } from '@/lib/api/mock/content'
import { routes } from '@/routes/router'

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

afterEach(() => vi.restoreAllMocks())

describe('T03 FAQs', () => {
  it('lists the questions as disclosures, labelled as sample wording', async () => {
    renderAt('/help/faqs')
    expect(await screen.findByRole('heading', { level: 1, name: 'Frequently asked questions' })).toBeInTheDocument()
    await screen.findByText('Who can apply?')
    expect(document.querySelectorAll('details')).toHaveLength(5)
    expect(screen.getByText('5 questions')).toBeInTheDocument()
    expect(screen.getByText('Sample: awaiting CEDA confirmation')).toBeInTheDocument()
  })

  it('searches titles and answers, and says when nothing matches', async () => {
    renderAt('/help/faqs')
    await screen.findByText('Who can apply?')
    fireEvent.change(screen.getByLabelText('Search the questions'), { target: { value: 'PDF' } })
    expect(screen.getByText('1 of 5 questions match')).toBeInTheDocument()
    expect(screen.getByText('What files can I attach?')).toBeInTheDocument()
    expect(screen.queryByText('Who can apply?')).not.toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Search the questions'), { target: { value: 'zzz' } })
    expect(screen.getByRole('heading', { name: 'No questions match your search' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'contact support' })).toHaveAttribute('href', '/help/support')
  })

  it('shows an error with a retry when the content cannot load', async () => {
    vi.spyOn(mockContent, 'list').mockRejectedValue(new Error('offline'))
    renderAt('/help/faqs')
    expect(await screen.findByText("We couldn't load the questions.")).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument()
  })
})

describe('T03 contacts, support and privacy', () => {
  it('shows regulatory offices and referral programmes as separate, labelled sections', async () => {
    renderAt('/help/contacts')
    const offices = (await screen.findByRole('heading', { name: 'Regulatory offices' })).closest('section') as HTMLElement
    await within(offices).findByText('Company registration (sample)')
    expect(within(offices).getAllByRole('listitem')).toHaveLength(4)
    const programmes = screen.getByRole('heading', { name: 'Other support programmes' }).closest('section') as HTMLElement
    expect(within(programmes).getByText('Listed for information only. CEDA does not endorse these programmes.')).toBeInTheDocument()
    expect(await within(programmes).findAllByRole('listitem')).toHaveLength(4)
  })

  it('shows the support page from the server text only', async () => {
    renderAt('/help/support')
    expect(await screen.findByRole('heading', { level: 2, name: 'Report a problem' })).toBeInTheDocument()
    expect(screen.getByText(/Hours 09:00–16:00 CAT/)).toBeInTheDocument()
  })

  it('shows the privacy notice with its version', async () => {
    renderAt('/privacy')
    expect(await screen.findByRole('heading', { level: 1, name: 'Privacy notice' })).toBeInTheDocument()
    expect(screen.getByText('Version sample-2026-11-v1')).toBeInTheDocument()
    expect(screen.getByText(/Data Protection Act, 2024/)).toBeInTheDocument()
  })
})

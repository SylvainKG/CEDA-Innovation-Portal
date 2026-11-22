import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter, useRoutes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PlainMarkdown } from '@/components'
import { challengeTiming } from '@/lib/form-check'
import { WATER_SMART_ID } from '@/lib/api/mock/fixtures'
import { mockSession } from '@/lib/api/mock/session'
import { mockSubmission, mockSubmissionControls } from '@/lib/api/mock/submission'
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

beforeEach(async () => {
  mockSubmissionControls.reset()
  window.localStorage.clear()
  await mockSession.switchDemoRole?.(null)
})

describe('challenge timing (spec T01)', () => {
  const c = { status: 'published' as const, opens_at: '2026-10-01T00:00:00Z', closes_at: '2026-12-31T14:00:00Z' }
  it('is Open, then Closing soon in the last 7 days, then Closed at the deadline', () => {
    expect(challengeTiming(c, new Date('2026-11-17T10:00:00Z'))).toBe('open')
    expect(challengeTiming(c, new Date('2026-12-24T14:00:00Z'))).toBe('closing_soon')
    expect(challengeTiming(c, new Date('2026-12-31T14:00:00Z'))).toBe('closed')
    expect(challengeTiming(c, new Date('2026-09-01T00:00:00Z'))).toBe('upcoming')
    expect(challengeTiming({ ...c, status: 'closed' }, new Date('2026-11-17T10:00:00Z'))).toBe('closed')
  })
})

describe('PlainMarkdown', () => {
  it('renders bold and lists, and never interprets HTML', () => {
    render(<PlainMarkdown source={'**Bold** text\n\n- one\n- two\n\n<img src=x onerror=alert(1)>'} />)
    expect(screen.getByText('Bold').tagName).toBe('STRONG')
    expect(screen.getAllByRole('listitem')).toHaveLength(2)
    expect(document.querySelector('img')).toBeNull()
    expect(screen.getByText('<img src=x onerror=alert(1)>')).toBeInTheDocument()
  })
})

describe('T01 public home', () => {
  it('closed cards keep full contrast and use the F4 Closed tone with an icon', async () => {
    renderAt('/challenges')
    const card = (await screen.findByText('Closed — not accepting submissions')).closest('article') as HTMLElement
    expect(within(card).getByText('Closed', { selector: '[data-tone] *, [data-tone]' }).closest('[data-tone]')).toHaveAttribute('data-tone', 'closed')
    expect(card.className).not.toMatch(/opacity/)
    // A closed challenge offers no "View challenge" button; its brief stays reachable through the title.
    expect(within(card).queryByRole('link', { name: /^View challenge/ })).not.toBeInTheDocument()
  })

  it('has the intro, the challenges (open first, closed labelled) and the five steps', async () => {
    renderAt('/')
    const intro = (await screen.findByRole('heading', { level: 1, name: 'A new dawn for innovation in Botswana' })).closest('section') as HTMLElement
    // One action leads into the open challenges; Sign in and Register stay in the navigation (post-freeze design).
    expect(within(intro).getByRole('link', { name: 'Submit an innovation' })).toHaveAttribute('href', '/challenges')
    expect(within(intro).getByRole('link', { name: 'How it works' })).toHaveAttribute('href', '#how-it-works')
    expect(await within(intro).findByRole('link', { name: 'Read the brief: Water-Smart Agriculture Challenge 2026' })).toHaveAttribute(
      'href',
      '/challenges/water-smart-agriculture-2026',
    )
    await screen.findByText('Closed — not accepting submissions')
    const cards = screen.getAllByRole('article')
    expect(within(cards[0] as HTMLElement).getByRole('heading', { name: 'Water-Smart Agriculture Challenge 2026' })).toBeInTheDocument()
    expect(within(cards[0] as HTMLElement).getByRole('link', { name: 'View challenge: Water-Smart Agriculture Challenge 2026' })).toHaveAttribute('href', '/challenges/water-smart-agriculture-2026')
    expect(within(cards[1] as HTMLElement).getByText('Closed — not accepting submissions')).toBeInTheDocument()
    const steps = within(screen.getByRole('heading', { name: 'From submission to award' }).closest('section') as HTMLElement).getAllByRole('listitem')
    expect(steps).toHaveLength(5)
  })
})

describe('T03 challenge brief', () => {
  it('shows the brief, criteria with weights (no anchors), templates and Start an idea', async () => {
    renderAt('/challenges/water-smart-agriculture-2026')
    expect(await screen.findByRole('heading', { level: 1, name: 'Water-Smart Agriculture Challenge 2026' })).toBeInTheDocument()
    expect(screen.getByText('30%')).toBeInTheDocument()
    expect(screen.queryByText(/Fully demonstrated with evidence/)).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Downloads' })).not.toBeInTheDocument() // no file store in the mock: hidden, not a dead link
    const starts = screen.getAllByRole('link', { name: 'Start an idea' })
    expect(starts[0]).toHaveAttribute('href', `/ideas/new?challenge=${WATER_SMART_ID}`)
  })

  it('lists templates as real downloads when the backend gives a URL', async () => {
    vi.spyOn(mockSubmission, 'templateUrl').mockImplementation((path) => `https://files.example.test/${path}`)
    renderAt('/challenges/water-smart-agriculture-2026')
    const link = await screen.findByRole('link', { name: /Proposal template \(sample\)\.docx/ })
    expect(link).toHaveAttribute('href', 'https://files.example.test/water-smart-agriculture-2026/proposal-template.docx')
  })

  it('offers "Continue your draft" to an applicant who already has one', async () => {
    await mockSession.switchDemoRole?.('applicant')
    const saved = await mockSubmission.saveDraft({ challengeId: WATER_SMART_ID, data: { title: 'Mine' } })
    if (saved.kind !== 'ok') throw new Error('save failed')
    renderAt('/challenges/water-smart-agriculture-2026')
    const links = await screen.findAllByRole('link', { name: 'Continue your draft' })
    expect(links[0]).toHaveAttribute('href', `/ideas/${saved.data.proposal_id}/edit`)
  })

  it('disables the action on a closed challenge and says why', async () => {
    renderAt('/challenges/youth-digital-services-2026')
    expect(await screen.findByRole('heading', { level: 1, name: 'Youth Digital Services Challenge 2026' })).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /Start an idea/ })[0]).toBeDisabled()
    expect(screen.getAllByText('This challenge is closed and not accepting submissions.').length).toBeGreaterThan(0)
  })

  it('an unknown or unpublished challenge is Not found', async () => {
    renderAt('/challenges/no-such-challenge')
    expect(await screen.findByRole('heading', { level: 1, name: "We can't find this page" })).toBeInTheDocument()
  })
})

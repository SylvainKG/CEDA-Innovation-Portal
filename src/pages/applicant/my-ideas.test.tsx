import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter, useRoutes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { primaryActionFor, sortIdeas, stagesFor, toIdeaCard } from '@/features/ideas/idea-view'
import { MOCK_SEEDED_IDEA, WATER_SMART_ID } from '@/lib/api/mock/fixtures'
import { mockSession } from '@/lib/api/mock/session'
import { mockSubmission, mockSubmissionControls } from '@/lib/api/mock/submission'
import type { MyIdea } from '@/lib/api/types'
import { routes } from '@/routes/router'

function idea(over: Partial<MyIdea>): MyIdea {
  return { ...MOCK_SEEDED_IDEA, ...over }
}

describe('idea view rules (spec T06, §6)', () => {
  it('puts ideas needing a response first, then drafts, then the most recently updated', () => {
    const sorted = sortIdeas([
      idea({ id: 'old', status: 'in_evaluation', updated_at: '2026-11-01T00:00:00Z' }),
      idea({ id: 'new', status: 'in_evaluation', updated_at: '2026-11-10T00:00:00Z' }),
      idea({ id: 'draft', status: 'draft', reference: null, updated_at: '2026-10-01T00:00:00Z' }),
      idea({ id: 'act', status: 'action_required', open_feedback: { kind: 'clarification', due_at: '2026-11-21T14:00:00Z', status: 'open' } }),
    ])
    expect(sorted.map((i) => i.id)).toEqual(['act', 'draft', 'new', 'old'])
  })

  it('marks the stage the status sits in as current and reached stages as done', () => {
    const stages = stagesFor(idea({ status: 'in_evaluation' }))
    expect(stages.find((s) => s.stage === 'submission')?.state).toBe('done')
    expect(stages.find((s) => s.stage === 'review')?.state).toBe('current')
    expect(stages.find((s) => s.stage === 'approval')?.state).toBe('upcoming')
    expect(stages.find((s) => s.stage === 'feedback')?.state).toBe('upcoming')
  })

  it('marks Feedback skipped once the idea went past it without a request, and done when one happened', () => {
    const at = '2026-11-10T00:00:00Z'
    const past = stagesFor({ status: 'approved', stages: [{ stage: 'submission', at }, { stage: 'review', at }, { stage: 'approval', at }] })
    expect(past.map((s) => s.state)).toEqual(['done', 'done', 'skipped', 'current', 'upcoming'])
    const asked = stagesFor({ status: 'approved', stages: [{ stage: 'submission', at }, { stage: 'review', at }, { stage: 'feedback', at }, { stage: 'approval', at }] })
    expect(asked.find((s) => s.stage === 'feedback')?.state).toBe('done')
  })

  it('gives one primary action that matches what the applicant has to do', () => {
    expect(primaryActionFor({ id: 'x', status: 'draft', open_feedback: null })).toEqual({ label: 'Continue draft', to: '/ideas/x/edit' })
    expect(primaryActionFor({ id: 'x', status: 'action_required', open_feedback: { kind: 'revision', due_at: '', status: 'open' } })?.label).toBe('Revise your idea')
    expect(primaryActionFor({ id: 'x', status: 'action_required', open_feedback: { kind: 'clarification', due_at: '', status: 'open' } })?.label).toBe('Answer the question')
    expect(primaryActionFor({ id: 'x', status: 'awarded', open_feedback: null })?.label).toBe('View idea')
  })

  it('an expired request shows a notice and no action (Stacey, #38)', () => {
    const card = toIdeaCard(idea({ status: 'action_required', open_feedback: { kind: 'clarification', due_at: '2026-11-15T14:00:00Z', status: 'expired' } }))
    expect(card.primaryAction).toBeUndefined()
    expect(card.notice).toBe('The response deadline has passed. CEDA will contact you.')
    expect(card.deadline).toBeUndefined()
  })

  it('a draft shows the challenge closing date as "Submit by"; a request shows its due date', () => {
    expect(toIdeaCard(idea({ status: 'draft', reference: null }))).toMatchObject({ deadlineLabel: 'Submit by', deadline: MOCK_SEEDED_IDEA.challenge.closes_at })
    expect(toIdeaCard(idea({ status: 'action_required', open_feedback: { kind: 'clarification', due_at: '2026-11-21T14:00:00Z', status: 'open' } }))).toMatchObject({
      deadline: '2026-11-21T14:00:00Z',
      feedbackKind: 'clarification',
    })
  })
})

function renderIdeas() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  function App() {
    return useRoutes(routes)
  }
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/ideas']}>
        <App />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(async () => {
  mockSubmissionControls.reset()
  window.localStorage.clear()
  await mockSession.switchDemoRole?.('applicant')
})
afterEach(() => vi.restoreAllMocks())

describe('T06 My ideas page', () => {
  it('shows Applicant A two separate cards: the earlier idea and the new draft, draft first', async () => {
    await mockSubmission.saveDraft({ challengeId: WATER_SMART_ID, data: { title: 'Solar drip irrigation kit (DEMO)' } })
    renderIdeas()
    expect(await screen.findByRole('heading', { level: 1, name: 'Welcome, Demo Applicant A' })).toBeInTheDocument()
    const cards = await screen.findAllByRole('article')
    expect(cards).toHaveLength(2)
    expect(within(cards[0] as HTMLElement).getByRole('heading', { name: 'Solar drip irrigation kit (DEMO)' })).toBeInTheDocument()
    expect(within(cards[0] as HTMLElement).getByRole('link', { name: /Continue draft/ })).toBeInTheDocument()
    expect(within(cards[1] as HTMLElement).getByText('CEDA-2026-0008')).toBeInTheDocument()
    expect(within(cards[1] as HTMLElement).getByText('Under review')).toBeInTheDocument()
  })

  it('with no ideas, says so and lists the open challenges to start from', async () => {
    vi.spyOn(mockSubmission, 'listMyIdeas').mockResolvedValue([])
    renderIdeas()
    expect(await screen.findByRole('heading', { name: "You haven't started an idea yet" })).toBeInTheDocument()
    await screen.findByText('These challenges are open now:')
    const card = (await screen.findByRole('heading', { level: 3, name: 'Water-Smart Agriculture Challenge 2026' })).closest('li') as HTMLElement
    expect(within(card).getByRole('link', { name: /Start an idea.*Water-Smart Agriculture Challenge 2026/ })).toHaveAttribute(
      'href',
      `/ideas/new?challenge=${WATER_SMART_ID}`,
    )
    expect(screen.queryByText(/Youth Digital Services/)).not.toBeInTheDocument() // closed: not offered
  })

  it('shows the action banner when an idea waits on the applicant', async () => {
    vi.spyOn(mockSubmission, 'listMyIdeas').mockResolvedValue([
      idea({ status: 'action_required', open_feedback: { kind: 'revision', due_at: '2026-11-21T14:00:00Z', status: 'open' } }),
    ])
    renderIdeas()
    const banner = (await screen.findByRole('heading', { level: 2, name: 'An idea needs your response' })).closest('section') as HTMLElement
    expect(banner).toHaveTextContent(/Respond by 21 Nov 2026, 16:00 CAT/)
    // The banner offers the same action as the card.
    expect(within(banner).getByRole('link', { name: /Revise your idea/ })).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: /Revise your idea/ })).toHaveLength(2)
  })
})

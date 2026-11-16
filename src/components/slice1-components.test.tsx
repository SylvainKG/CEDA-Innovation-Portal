import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { AutosaveIndicator, Banner, DeclarationPanel, IdeaCard, ReceiptCard, StageTimeline, type IdeaCardModel } from '.'

describe('StageTimeline', () => {
  it('hides the Feedback stage unless it occurred or is open', () => {
    const { rerender } = render(
      <StageTimeline stages={[{ stage: 'submission', state: 'done' }, { stage: 'review', state: 'current' }]} />,
    )
    expect(screen.queryByText('Feedback')).not.toBeInTheDocument()
    rerender(<StageTimeline stages={[{ stage: 'feedback', state: 'current' }]} />)
    expect(screen.getByText('Feedback')).toBeInTheDocument()
  })

  it('marks the current stage for assistive technology', () => {
    render(<StageTimeline stages={[{ stage: 'submission', state: 'done' }, { stage: 'review', state: 'current' }]} />)
    const current = screen.getAllByRole('listitem').find((li) => li.getAttribute('aria-current') === 'step')
    expect(current).toHaveTextContent('Review')
    expect(current).toHaveTextContent('current stage')
  })
})

describe('IdeaCard', () => {
  const base: IdeaCardModel = {
    id: '0006',
    title: 'Rainwater harvesting tanks',
    challenge: 'Water-Smart Agriculture Challenge 2026',
    reference: 'CEDA-2026-0006',
    status: 'action_required',
    feedbackKind: 'revision',
    updatedAt: '2026-11-15T10:00:00Z',
    deadline: '2026-11-20T14:00:00Z',
    stages: [{ stage: 'feedback', state: 'current' }],
    primaryAction: { label: 'Revise your idea', to: '/ideas/0006/revise' },
  }

  it('shows the action-required status, deadline in CAT with a relative hint, and one primary action', () => {
    render(
      <MemoryRouter>
        <IdeaCard idea={base} now={new Date('2026-11-15T12:00:00Z')} />
      </MemoryRouter>,
    )
    const card = screen.getByRole('article', { name: 'Rainwater harvesting tanks' })
    expect(within(card).getByText('Action required: revise your idea')).toBeInTheDocument()
    expect(within(card).getByText(/Respond by 20 Nov 2026, 16:00 CAT \(in 5 days\)/)).toBeInTheDocument()
    expect(within(card).getAllByRole('link')).toHaveLength(1)
    expect(within(card).getByRole('link')).toHaveAccessibleName('Revise your idea: Rainwater harvesting tanks')
  })

  it('shows drafts without a reference', () => {
    render(
      <MemoryRouter>
        <IdeaCard idea={{ ...base, status: 'draft', reference: null, deadline: undefined, primaryAction: { label: 'Continue draft', to: '/x' } }} />
      </MemoryRouter>,
    )
    expect(screen.getByText('Draft: no reference yet')).toBeInTheDocument()
  })
})

describe('ReceiptCard', () => {
  it('shows reference, version, server time in CAT and the declaration', () => {
    render(
      <ReceiptCard
        receipt={{
          reference: 'CEDA-2026-0009',
          version: 2,
          submittedAt: '2026-11-18T12:05:00Z',
          challenge: 'Water-Smart Agriculture Challenge 2026',
          formVersion: 'Form v1',
          files: [{ name: 'plan.pdf', sizeBytes: 1_250_000 }],
          declarationAccepted: true,
        }}
      />,
    )
    expect(screen.getByRole('heading', { name: 'Version 2 submitted' })).toBeInTheDocument()
    expect(screen.getByText('CEDA-2026-0009')).toBeInTheDocument()
    expect(screen.getByText('18 Nov 2026, 14:05 CAT')).toBeInTheDocument()
    expect(screen.getByText('Accepted')).toBeInTheDocument()
  })
})

describe('Banner', () => {
  it('lets only informational banners be dismissed', async () => {
    const { unmount } = render(<Banner kind="action">Respond by Friday</Banner>)
    expect(screen.queryByRole('button', { name: 'Dismiss message' })).not.toBeInTheDocument()
    unmount()
    render(<Banner kind="info">Chat hours</Banner>)
    await userEvent.click(screen.getByRole('button', { name: 'Dismiss message' }))
    expect(screen.queryByText('Chat hours')).not.toBeInTheDocument()
  })

  it('announces errors immediately', () => {
    render(<Banner kind="error">Couldn't load</Banner>)
    expect(screen.getByRole('alert')).toHaveTextContent("Couldn't load")
  })
})

describe('DeclarationPanel (reviewer, D-19)', () => {
  it('cannot continue until the declaration is confirmed', async () => {
    const onDeclare = vi.fn()
    render(<DeclarationPanel kind="reviewer" terms="Terms" onDeclare={onDeclare} />)
    const proceed = screen.getByRole('button', { name: 'Continue to proposal' })
    expect(proceed).toBeDisabled()
    await userEvent.click(screen.getByRole('checkbox', { name: /no conflict of interest/ }))
    await userEvent.click(proceed)
    expect(onDeclare).toHaveBeenCalledWith({ hasConflict: false })
  })

  it('requires a reason to declare a conflict', async () => {
    const onDeclare = vi.fn()
    render(<DeclarationPanel kind="reviewer" terms="Terms" onDeclare={onDeclare} />)
    await userEvent.click(screen.getByRole('button', { name: 'I have a conflict' }))
    const withdraw = screen.getByRole('button', { name: 'Declare conflict and withdraw' })
    expect(withdraw).toBeDisabled()
    await userEvent.type(screen.getByRole('textbox', { name: /Describe the conflict/ }), 'My cousin is the applicant.')
    await userEvent.click(withdraw)
    expect(onDeclare).toHaveBeenCalledWith({ hasConflict: true, reason: 'My cousin is the applicant.' })
  })
})

describe('AutosaveIndicator', () => {
  it('distinguishes a server-confirmed save from a device-only save', () => {
    const { rerender } = render(<AutosaveIndicator state={{ kind: 'saved', at: '2026-11-16T12:05:00Z' }} />)
    expect(screen.getByRole('status')).toHaveTextContent('Saved 14:05')
    rerender(<AutosaveIndicator state={{ kind: 'local' }} />)
    expect(screen.getByRole('status')).toHaveTextContent('Saved on this device, not sent')
  })
})

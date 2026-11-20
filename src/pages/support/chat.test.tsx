import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useRoutes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mockChat, mockChatControls } from '@/lib/api/mock/chat'
import { mockSession } from '@/lib/api/mock/session'
import type { Role } from '@/lib/api/types'
import { routes } from '@/routes/router'

const LOAD = { timeout: 5000 }
const JOURNEY = 20_000
const NO_ACCESS = "You don't have access to this page"

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

afterEach(() => vi.restoreAllMocks())
beforeEach(async () => {
  mockChatControls.reset()
  window.localStorage.clear()
  await as(null)
})

describe('T15 chat (CHT-01, CHT-02)', () => {
  it('runs a whole conversation: applicant starts, consultant accepts and replies, applicant ends it', async () => {
    await as('applicant')
    let user = renderAt('/support/chat')
    await user.type(await screen.findByLabelText(/^How can we help\?/, {}, LOAD), 'How do I attach a budget?')
    await user.click(screen.getByRole('button', { name: 'Start chat' }))
    expect(await screen.findByText('A consultant will join shortly.', {}, LOAD)).toBeInTheDocument()
    expect(await within(screen.getByRole('list', { name: 'Conversation' })).findByText('How do I attach a budget?', {}, LOAD)).toBeInTheDocument()
    cleanup()

    await as('support_consultant')
    user = renderAt('/support/inbox')
    expect(await screen.findByText('1 waiting · 0 with you', {}, LOAD)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Accept' }))
    expect(await screen.findByRole('heading', { name: 'Chat with Demo Applicant A' }, LOAD)).toBeInTheDocument()
    expect(await within(screen.getByRole('list', { name: 'Conversation' })).findByText('How do I attach a budget?', {}, LOAD)).toBeInTheDocument()
    await user.type(screen.getByLabelText('Your message'), 'Use the Documents step of the form.')
    await user.click(screen.getByRole('button', { name: 'Send' }))
    await waitFor(() => expect(within(screen.getByRole('list', { name: 'Conversation' })).getByText('Use the Documents step of the form.')).toBeInTheDocument(), LOAD)
    cleanup()

    await as('applicant')
    user = renderAt('/support/chat')
    expect(await screen.findByText('A consultant has joined.', {}, LOAD)).toBeInTheDocument()
    expect(await screen.findByText('Use the Documents step of the form.', {}, LOAD)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'End chat' }))
    expect(await screen.findByText('Your last chat has ended.', {}, LOAD)).toBeInTheDocument()
  }, JOURNEY)

  it('shows the opening hours while chat is closed, and the server refuses a new chat', async () => {
    mockChatControls.setOpen(false)
    await as('applicant')
    renderAt('/support/chat')
    expect(await screen.findByText('Chat is closed now', {}, LOAD)).toBeInTheDocument()
    expect(screen.getByText(/Monday, Tuesday, Wednesday, Thursday, Friday, 09:00–16:00 CAT/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Start chat' })).not.toBeInTheDocument()
    expect(await mockChat.start('Hello there')).toMatchObject({ kind: 'refused', code: 'INVALID_STATE' })
  })

  it('lets only one consultant take a chat', async () => {
    await as('applicant')
    const started = await mockChat.start('Is anyone there?')
    if (started.kind !== 'ok') throw new Error('start failed')
    await as('support_consultant')
    const user = renderAt('/support/inbox')
    await screen.findByText('1 waiting · 0 with you', {}, LOAD)
    // Another consultant (the lead) accepts first.
    await as('support_lead')
    expect(await mockChat.accept(started.data.session_id)).toMatchObject({ kind: 'ok' })
    await as('support_consultant')
    await user.click(screen.getByRole('button', { name: 'Accept' }))
    expect(await screen.findByText('Another consultant took this conversation, or it has ended.', {}, LOAD)).toBeInTheDocument()
    // The consultant cannot write in, or read, a chat they don't handle.
    expect(await mockChat.send(started.data.session_id, 'Hi')).toMatchObject({ kind: 'refused', code: 'FORBIDDEN' })
    expect(await mockChat.messages(started.data.session_id)).toEqual([])
  })

  it('after a lost reply, checks the conversation before saying whether the message was sent', async () => {
    await as('applicant')
    await mockChat.start('First question')
    const user = renderAt('/support/chat')
    await screen.findByText('A consultant will join shortly.', {}, LOAD)
    const real = mockChat.send.bind(mockChat)
    // 1) The message reached the server but the reply was lost: it shows as sent, and the box clears.
    const spy = vi.spyOn(mockChat, 'send').mockImplementationOnce(async (id, body) => {
      await real(id, body)
      throw new Error('network')
    })
    await user.type(screen.getByLabelText('Your message'), 'Second question')
    await user.click(screen.getByRole('button', { name: 'Send' }))
    await waitFor(() => expect(screen.getByLabelText('Your message')).toHaveValue(''), LOAD)
    expect(await screen.findByText('Second question', {}, LOAD)).toBeInTheDocument()
    // 2) It never arrived: the screen says it can't confirm, and keeps the text.
    spy.mockImplementationOnce(async () => {
      throw new Error('network')
    })
    await user.type(screen.getByLabelText('Your message'), 'Third question')
    await user.click(screen.getByRole('button', { name: 'Send' }))
    expect(await screen.findByText(/We couldn't confirm your message was sent/, {}, LOAD)).toBeInTheDocument()
    expect(screen.getByLabelText('Your message')).toHaveValue('Third question')
  }, JOURNEY)

  it('keeps the inbox and chat statistics to support staff', async () => {
    await as('screening_officer')
    expect(await mockChat.inbox()).toBeNull()
    expect(await mockChat.statistics({})).toBeNull()
    renderAt('/support/inbox')
    expect(await screen.findByRole('heading', { name: NO_ACCESS }, LOAD)).toBeInTheDocument()
    cleanup()
    await as('support_consultant')
    expect(await mockChat.statistics({})).toBeNull()
  })

  it('gives the support lead the chat statistics on Reports', async () => {
    await as('applicant')
    await mockChat.start('A question')
    await as('support_lead')
    renderAt('/reports')
    expect(await screen.findByRole('heading', { name: 'Chat', level: 2 }, LOAD)).toBeInTheDocument()
    expect(within(screen.getByText('Waiting now').parentElement!).getByText('1')).toBeInTheDocument()
    expect(screen.queryByRole('tab', { name: 'Participation' })).not.toBeInTheDocument()
  })
})

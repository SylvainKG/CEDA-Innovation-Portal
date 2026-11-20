import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import { mockSession } from '@/lib/api/mock/session'
import { mockSubmissionControls } from '@/lib/api/mock/submission'
import { SubmissionPlayground } from './SubmissionPlayground'

function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: 0 } } })
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <SubmissionPlayground />
      </MemoryRouter>
    </QueryClientProvider>,
  )
  return userEvent.setup()
}

const pdf = () => new File([new Uint8Array(500)], 'business-plan.pdf', { type: 'application/pdf' })

beforeEach(async () => {
  mockSubmissionControls.reset()
  window.localStorage.clear()
  await mockSession.switchDemoRole?.('applicant')
})

describe('submission playground (dev only) drives the Slice 1 hooks end to end', () => {
  it('refuses an incomplete idea with field errors and keeps the answers', async () => {
    const user = setup()
    await user.type(await screen.findByLabelText(/Idea title/), 'Half an idea')
    await screen.findByText(/^Saved/, undefined, { timeout: 4000 })
    await user.click(screen.getByRole('button', { name: 'Submit idea' }))
    expect(await screen.findByText("Your idea wasn't submitted")).toBeInTheDocument()
    expect(screen.getAllByText('Required').length).toBeGreaterThan(0)
    expect(screen.getByLabelText(/Idea title/)).toHaveValue('Half an idea')
  })

  it('submits a complete idea and shows receipt CEDA-2026-0009', async () => {
    const user = setup()
    await user.click(await screen.findByRole('button', { name: 'Fill with sample answers' }))
    await screen.findByText(/^Saved/, undefined, { timeout: 4000 })
    await user.upload(screen.getByLabelText('Attach business plan'), pdf())
    await screen.findByText('Attached: business-plan.pdf')
    await user.click(screen.getByRole('checkbox', { name: /I agree|accept|confirm/i }))
    await user.click(screen.getByRole('button', { name: 'Submit idea' }))
    expect(await screen.findByText('Idea submitted')).toBeInTheDocument()
    expect(screen.getByText('CEDA-2026-0009')).toBeInTheDocument()
  })

  it('a lost reply shows "Not confirmed yet", and Check status finds the same receipt', async () => {
    const user = setup()
    await user.click(await screen.findByRole('button', { name: 'Fill with sample answers' }))
    await screen.findByText(/^Saved/, undefined, { timeout: 4000 })
    await user.upload(screen.getByLabelText('Attach business plan'), pdf())
    await screen.findByText('Attached: business-plan.pdf')
    await user.click(screen.getByRole('checkbox', { name: /I agree|accept|confirm/i }))
    await user.click(screen.getByRole('checkbox', { name: /lose the server's reply/ }))
    await user.click(screen.getByRole('button', { name: 'Submit idea' }))
    expect(await screen.findByText('Not confirmed yet.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Check status' }))
    await waitFor(() => expect(screen.getByText('CEDA-2026-0009')).toBeInTheDocument())
  })
})

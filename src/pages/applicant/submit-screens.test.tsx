import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation, useRoutes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { WATER_SMART_ID, YOUTH_DIGITAL_ID } from '@/lib/api/mock/fixtures'
import { mockSession } from '@/lib/api/mock/session'
import { mockSubmission, mockSubmissionControls } from '@/lib/api/mock/submission'
import type { DraftData } from '@/lib/api/types'
import { routes } from '@/routes/router'
import { brand } from '@/brand'

// T04 and T05 through the real route table, as the applicant uses them (mock adapter).

const COMPLETE: DraftData = {
  applicant_name: 'Demo Applicant A',
  contact_email: 'applicant.a@example.test',
  title: 'Solar drip irrigation kit (DEMO)',
  summary: 'A low-cost drip kit.',
  sector: 'Crops',
  problem: 'Water is scarce.',
  solution: 'Solar drip.',
  impact: 'Less water.',
}

function Where() {
  const l = useLocation()
  return <output data-testid="location">{l.pathname + l.search + l.hash}</output>
}
function App() {
  return (
    <>
      {useRoutes(routes)}
      <Where />
    </>
  )
}
function renderAt(path: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: 0 } } })
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <App />
      </MemoryRouter>
    </QueryClientProvider>,
  )
  return userEvent.setup()
}

async function draft(data: DraftData, withPlan = true) {
  const saved = await mockSubmission.saveDraft({ challengeId: WATER_SMART_ID, data })
  if (saved.kind !== 'ok') throw new Error('save failed')
  if (withPlan) {
    const file = new File([new Uint8Array(100)], 'business-plan.pdf', { type: 'application/pdf' })
    await mockSubmission.uploadAttachment({ proposalId: saved.data.proposal_id, file, docKey: 'business_plan' })
  }
  return saved.data.proposal_id
}

afterEach(() => vi.restoreAllMocks())

beforeEach(async () => {
  mockSubmissionControls.reset()
  window.localStorage.clear()
  await mockSession.switchDemoRole?.('applicant')
})

describe('T04 proposal form', () => {
  it('starts a new idea, saves it and moves to the draft address', async () => {
    const user = renderAt(`/ideas/new?challenge=${WATER_SMART_ID}`)
    expect(await screen.findByRole('heading', { level: 1, name: 'New idea' })).toBeInTheDocument()
    await user.type(screen.getByLabelText(/Your full name/), 'Demo Applicant A')
    await waitFor(() => expect(screen.getByTestId('location').textContent).toMatch(/^\/ideas\/[0-9a-f-]+\/edit/), { timeout: 4000 })
    expect(await screen.findByText(/^Saved/)).toBeInTheDocument()
  })

  it('keeps answers typed before the first save when Continue is clicked at once (no data loss)', async () => {
    // Regression (#38 review, issue #61 journey): a hash-only navigation dropped `?challenge=`, which unmounted the
    // form, and the draft created moments later opened empty.
    const user = renderAt(`/ideas/new?challenge=${WATER_SMART_ID}`)
    expect(await screen.findByRole('heading', { level: 1, name: 'New idea' })).toBeInTheDocument()
    await user.type(screen.getByLabelText(/Your full name/), 'Demo Applicant A')
    await user.click(screen.getByRole('button', { name: /^Continue: / }))
    await waitFor(() => expect(screen.getByTestId('location').textContent).toMatch(/^\/ideas\/[0-9a-f-]+\/edit/), { timeout: 4000 })
    await user.click(screen.getByRole('button', { name: /^Back: / }))
    expect(await screen.findByLabelText(/Your full name/)).toHaveValue('Demo Applicant A')
  })

  it('says a closed challenge is not accepting ideas, instead of showing the form', async () => {
    renderAt(`/ideas/new?challenge=${YOUTH_DIGITAL_ID}`)
    expect(await screen.findByText('This challenge is not accepting ideas')).toBeInTheDocument()
    expect(screen.queryByLabelText(/Team lead/)).not.toBeInTheDocument()
  })

  it('lists every missing item, linked, and does not submit', async () => {
    const id = await draft({ title: 'Half an idea' }, false)
    const user = renderAt(`/ideas/${id}/edit#step-review`)
    await user.click(await screen.findByRole('button', { name: 'Submit idea' }))
    const summary = await screen.findByRole('alert')
    expect(within(summary).getByText("Your idea wasn't submitted yet")).toBeInTheDocument()
    expect(within(summary).getByRole('link', { name: 'Summary: Required' })).toBeInTheDocument()
    expect(within(summary).getByRole('link', { name: 'Business plan (PDF): Attach this document' })).toBeInTheDocument()
    expect(within(summary).getByRole('link', { name: /Declaration/ })).toBeInTheDocument()
    await user.click(within(summary).getByRole('link', { name: 'Summary: Required' }))
    expect(await screen.findByRole('heading', { level: 2, name: 'Idea overview' })).toBeInTheDocument()
    expect(await mockSubmission.getDraft(id)).not.toBeNull() // still a draft
  })

  it('submits a complete idea and shows the receipt from the server', async () => {
    const id = await draft(COMPLETE)
    const user = renderAt(`/ideas/${id}/edit#step-review`)
    await user.click(await screen.findByRole('checkbox', { name: /accept the declaration/i }))
    await user.click(screen.getByRole('button', { name: 'Submit idea' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Idea submitted' })).toBeInTheDocument()
    expect(screen.getByText('CEDA-2026-0009')).toBeInTheDocument()
    expect(screen.getByTestId('location')).toHaveTextContent(`/ideas/${id}/receipt`)
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    // The printed receipt carries the brand mark and the DEMO line (the header is not printed).
    const printLogo = screen.getAllByRole('img', { name: brand.fullName }).find((img) => img.className.includes('print:block'))
    expect(printLogo).toBeDefined()
    expect(screen.getByText('DEMO — fictional data. This is not a real CEDA receipt.')).toBeInTheDocument()
  })

  it('a lost reply shows "Not confirmed yet"; checking finds the same receipt', async () => {
    const id = await draft(COMPLETE)
    const user = renderAt(`/ideas/${id}/edit#step-review`)
    await user.click(await screen.findByRole('checkbox', { name: /accept the declaration/i }))
    mockSubmissionControls.loseNextSubmitReply()
    await user.click(screen.getByRole('button', { name: 'Submit idea' }))
    expect(await screen.findByText('Not confirmed yet.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Check status' }))
    expect(await screen.findByText('CEDA-2026-0009')).toBeInTheDocument()
  })

  it("someone else's or a missing draft shows Not found, never its content", async () => {
    renderAt('/ideas/00000000-0000-4000-8000-000000000000/edit')
    expect(await screen.findByRole('heading', { level: 1, name: "We can't find this page" })).toBeInTheDocument()
  })

  it('offers to restore answers that were typed on this device but never saved', async () => {
    const id = await draft({ title: 'Saved title' }, false)
    window.localStorage.setItem(`ceda.draft.local.${id}`, JSON.stringify({ data: { title: 'Typed offline' } }))
    const user = renderAt(`/ideas/${id}/edit#step-overview`)
    expect(await screen.findByText('We found unsaved changes from this device')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Restore them' }))
    expect(screen.getByLabelText(/Idea title/)).toHaveValue('Typed offline')
  })
})

describe('T04 review fixes (Sandra, Sylvain: #38)', () => {
  it('mobile has a "Progress & help" button near the top that opens the meter, deadline and help', async () => {
    const id = await draft({ title: 'An idea' }, false)
    const user = renderAt(`/ideas/${id}/edit#step-overview`)
    const toggle = await screen.findByRole('button', { name: 'Progress & help' })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    await user.click(toggle)
    expect(screen.getByRole('button', { name: 'Hide progress & help' })).toHaveAttribute('aria-expanded', 'true')
    expect(within(document.getElementById('progress-help') as HTMLElement).getByText('Deadline')).toBeInTheDocument()
  })

  it('progress links are 44 px touch targets', async () => {
    const id = await draft({ title: 'An idea' }, false)
    renderAt(`/ideas/${id}/edit#step-overview`)
    const links = await screen.findAllByRole('link', { name: /About you: needs attention/ })
    expect(links[0]?.className).toMatch(/min-h-touch/)
  })

  it('an upload in progress says "Uploading…" with no made-up percentage', async () => {
    const id = await draft({ title: 'An idea' }, false)
    let release: () => void = () => undefined
    const real = mockSubmission.uploadAttachment.bind(mockSubmission)
    vi.spyOn(mockSubmission, 'uploadAttachment').mockImplementationOnce(async (input) => {
      await new Promise<void>((r) => {
        release = r
      })
      return real(input)
    })
    const user = renderAt(`/ideas/${id}/edit#step-attachments`)
    const input = (await screen.findAllByLabelText(/Business plan/))[0] as HTMLInputElement
    await user.upload(input, new File([new Uint8Array(10)], 'plan.pdf', { type: 'application/pdf' }))
    const bar = await screen.findByRole('progressbar', { name: 'Uploading plan.pdf' })
    expect(bar).not.toHaveAttribute('aria-valuenow')
    expect(screen.getByText('Uploading…')).toBeInTheDocument()
    release()
  })
})

describe('T05 receipt', () => {
  it('shows Not found for a receipt that is not yours or does not exist', async () => {
    renderAt('/ideas/00000000-0000-4000-8000-000000000000/receipt')
    expect(await screen.findByRole('heading', { level: 1, name: "We can't find this page" })).toBeInTheDocument()
  })
})

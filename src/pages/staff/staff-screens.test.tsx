import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useRoutes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { WATER_SMART_ID } from '@/lib/api/mock/fixtures'
import { mockSession } from '@/lib/api/mock/session'
import { mockStaff, mockStaffControls } from '@/lib/api/mock/staff'
import { mockSubmission, mockSubmissionControls } from '@/lib/api/mock/submission'
import type { DraftData, Role } from '@/lib/api/types'
import { routes } from '@/routes/router'

const CASE_1 = '30000000-0000-4000-8000-000000000001'
const CASE_2 = '30000000-0000-4000-8000-000000000002'

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

/** The demo journey's first half: Applicant A submits a complete idea in this session (CEDA-2026-0009). */
async function applicantSubmits(): Promise<string> {
  await as('applicant')
  const saved = await mockSubmission.saveDraft({ challengeId: WATER_SMART_ID, data: COMPLETE })
  if (saved.kind !== 'ok') throw new Error('save failed')
  const id = saved.data.proposal_id
  await mockSubmission.uploadAttachment({ proposalId: id, file: new File([new Uint8Array(100)], 'plan.pdf', { type: 'application/pdf' }), docKey: 'business_plan' })
  const sent = await mockSubmission.submitProposal({ proposalId: id, clientRequestId: crypto.randomUUID(), declarationVersion: 'sample-2026-11-v1' })
  if (sent.kind !== 'ok') throw new Error('submit failed')
  return id
}

afterEach(() => vi.restoreAllMocks())
beforeEach(async () => {
  mockSubmissionControls.reset()
  mockStaffControls.reset()
  window.localStorage.clear()
  await as(null)
})

describe('T07 screening queue', () => {
  it('lists submitted cases oldest first, including one submitted in this session', async () => {
    await applicantSubmits()
    await as('screening_officer')
    renderAt('/staff/queue/screening')
    expect(await screen.findByRole('heading', { level: 1, name: 'Screening queue' })).toBeInTheDocument()
    expect(await screen.findByText('2 cases are waiting for screening, oldest first.')).toBeInTheDocument()
    // The table also renders as cards for phones, so each link appears twice in the markup.
    const links = screen.getAllByRole('link', { name: /CEDA-2026-000\d/ })
    expect([...new Set(links.map((l) => l.textContent))]).toEqual(['CEDA-2026-0001', 'CEDA-2026-0009'])
    expect(links[0]).toHaveAttribute('href', `/staff/cases/${CASE_1}`)
  })

  it('says so when nothing is waiting', async () => {
    await as('screening_officer')
    await mockStaff.recordScreening({ proposalId: CASE_1, result: 'eligible', reason: 'Fits the scope.' })
    renderAt('/staff/queue/screening')
    expect(await screen.findByRole('heading', { name: 'No cases are waiting for screening' })).toBeInTheDocument()
  })

  it('is forbidden to an applicant', async () => {
    await as('applicant')
    renderAt('/staff/queue/screening')
    expect(await screen.findByRole('heading', { level: 1, name: /don.t have access/i })).toBeInTheDocument()
  })
})

describe('T08 staff case workspace and T10 screening', () => {
  it('shows the submitted answers, timeline and the Record screening action', async () => {
    await as('screening_officer')
    const user = renderAt(`/staff/cases/${CASE_1}`)
    expect(await screen.findByRole('heading', { level: 1, name: 'Solar-powered drip kits for smallholders' })).toBeInTheDocument()
    expect(screen.getByText('Fictional problem statement (DEMO).')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Record screening' })).toBeInTheDocument()
    await user.click(screen.getByRole('tab', { name: 'Timeline' }))
    expect(screen.getByRole('tab', { name: 'Timeline' })).toHaveAttribute('aria-selected', 'true')
    expect(within(screen.getByRole('tabpanel')).getByText('Submitted')).toBeInTheDocument()
    // Arrow keys move between tabs.
    await user.keyboard('{ArrowRight}')
    expect(screen.getByRole('tab', { name: 'Reviewers' })).toHaveAttribute('aria-selected', 'true')
  })

  it('requires a result and a reason, then closes an ineligible case and shows the reason on the timeline', async () => {
    await as('screening_officer')
    const user = renderAt(`/staff/cases/${CASE_1}`)
    await user.click(await screen.findByRole('button', { name: 'Record screening' }))
    const dialog = await screen.findByRole('dialog', { name: 'Record screening for CEDA-2026-0001' })
    expect(within(dialog).getByText('This action is recorded in the audit log.')).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: 'Record result' }))
    expect(within(dialog).getByText('Choose Eligible or Not eligible')).toBeInTheDocument()
    expect(within(dialog).getByText('Give a reason')).toBeInTheDocument()

    await user.click(within(dialog).getByRole('radio', { name: 'Not eligible' }))
    await user.type(within(dialog).getByLabelText(/^Reason/), 'Outside the challenge scope.')
    await user.click(within(dialog).getByRole('button', { name: 'Record result' }))

    expect(await screen.findByText('Recorded as not eligible. The case is closed and the applicant is notified.')).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Record screening' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('tab', { name: 'Timeline' }))
    expect(within(screen.getByRole('tabpanel')).getByText('Outside the challenge scope.')).toBeInTheDocument()
  })

  it('moves an applicant’s submitted idea to evaluation, which the applicant then sees', async () => {
    const id = await applicantSubmits()
    await as('screening_officer')
    const user = renderAt(`/staff/cases/${id}`)
    await user.click(await screen.findByRole('button', { name: 'Record screening' }))
    const dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByRole('radio', { name: 'Eligible' }))
    await user.type(within(dialog).getByLabelText(/^Reason/), 'Fits the challenge.')
    await user.click(within(dialog).getByRole('button', { name: 'Record result' }))
    expect(await screen.findByText('Recorded as eligible. The case moved to evaluation.')).toBeInTheDocument()

    await as('applicant')
    const mine = await mockSubmission.listMyIdeas()
    const idea = mine.find((i) => i.id === id)
    expect(idea?.status).toBe('in_evaluation')
    expect(idea?.stages.map((s) => s.stage)).toEqual(['submission', 'review'])
  })

  it('an admin can read the case but cannot screen it', async () => {
    await as('admin')
    renderAt(`/staff/cases/${CASE_1}`)
    expect(await screen.findByText('Waiting for a screening officer to record eligibility.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Record screening' })).not.toBeInTheDocument()
    expect(await mockStaff.recordScreening({ proposalId: CASE_1, result: 'eligible', reason: 'x' })).toMatchObject({ kind: 'refused', code: 'FORBIDDEN' })
  })

  it('an admin sees reviewer names', async () => {
    await as('admin')
    const user = renderAt(`/staff/cases/${CASE_2}`)
    await user.click(await screen.findByRole('tab', { name: 'Reviewers' }))
    expect(screen.getByText('Demo Reviewer 1')).toBeInTheDocument()
  })

  it('a screening officer sees reviewers without names (profiles are admin-only)', async () => {
    await as('screening_officer')
    const user = renderAt(`/staff/cases/${CASE_2}`)
    await user.click(await screen.findByRole('tab', { name: 'Reviewers' }))
    expect(screen.getByText('Reviewer 1')).toBeInTheDocument()
    expect(screen.queryByText('Demo Reviewer 1')).not.toBeInTheDocument()
    expect(screen.getAllByText('Declared: no conflict')).toHaveLength(2)
  })

  it('a lost reply re-reads the case: moved on means done, still submitted means "Not confirmed yet"', async () => {
    await as('screening_officer')
    const real = mockStaff.recordScreening.bind(mockStaff)
    // Applied on the server, reply lost.
    vi.spyOn(mockStaff, 'recordScreening').mockImplementationOnce(async (input) => {
      await real(input)
      throw new Error('network')
    })
    const user = renderAt(`/staff/cases/${CASE_1}`)
    await user.click(await screen.findByRole('button', { name: 'Record screening' }))
    const dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByRole('radio', { name: 'Eligible' }))
    await user.type(within(dialog).getByLabelText(/^Reason/), 'Fits.')
    await user.click(within(dialog).getByRole('button', { name: 'Record result' }))
    expect(await screen.findByText('Recorded as eligible. The case moved to evaluation.')).toBeInTheDocument()

  })

  it('a lost reply on a case that did not move says "Not confirmed yet" and claims nothing', async () => {
    await as('screening_officer')
    vi.spyOn(mockStaff, 'recordScreening').mockRejectedValueOnce(new Error('network'))
    const user = renderAt(`/staff/cases/${CASE_1}`)
    await user.click(await screen.findByRole('button', { name: 'Record screening' }))
    const dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByRole('radio', { name: 'Eligible' }))
    await user.type(within(dialog).getByLabelText(/^Reason/), 'Fits.')
    await user.click(within(dialog).getByRole('button', { name: 'Record result' }))
    expect(await within(dialog).findByText('Not confirmed yet')).toBeInTheDocument()
  })

  it('a case that is not visible is Not found', async () => {
    await as('screening_officer')
    renderAt('/staff/cases/00000000-0000-4000-8000-000000000000')
    expect(await screen.findByRole('heading', { level: 1, name: "We can't find this page" })).toBeInTheDocument()
  })
})

describe('mock staff rules', () => {
  it('screening twice is refused as INVALID_STATE; readers without case.read_all see nothing', async () => {
    await as('screening_officer')
    expect((await mockStaff.recordScreening({ proposalId: CASE_1, result: 'eligible', reason: 'ok' })).kind).toBe('ok')
    expect(await mockStaff.recordScreening({ proposalId: CASE_1, result: 'eligible', reason: 'ok' })).toMatchObject({ kind: 'refused', code: 'INVALID_STATE' })
    await as('reviewer')
    expect(await mockStaff.listCases()).toEqual([])
    expect(await mockStaff.getCase(CASE_1)).toBeNull()
  })
})

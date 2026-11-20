import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useRoutes } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import { mockFeedback, mockFeedbackControls } from '@/lib/api/mock/feedback'
import { mockReview, mockReviewControls } from '@/lib/api/mock/review'
import { mockSession } from '@/lib/api/mock/session'
import { mockStaffControls, mockStaffInternals } from '@/lib/api/mock/staff'
import { mockSubmission, mockSubmissionControls } from '@/lib/api/mock/submission'
import { mockVersions } from '@/lib/api/mock/versions'
import type { Role } from '@/lib/api/types'
import { routes } from '@/routes/router'

const CASE_8 = '30000000-0000-4000-8000-000000000008'
const R1_ON_8 = '40000000-0000-4000-8000-000000080001'
const LOAD = { timeout: 5000 }
const JOURNEY = 20_000

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

/** A revision with one task; the applicant rewrites the summary in version 2. */
async function versionTwo() {
  await as('screening_officer')
  const r = await mockFeedback.requestFeedback({ proposalId: CASE_8, kind: 'revision', message: 'Sharpen the summary.', tasks: ['Rewrite the summary.'] })
  if (r.kind !== 'ok') throw new Error('request failed')
  const task = (await mockFeedback.getRoadmap(CASE_8))![0]!.tasks[0]!
  await as('applicant')
  const v1 = mockStaffInternals.cases().find((c) => c.id === CASE_8)!.version!.data
  const res = await mockSubmission.submitRevision({
    proposalId: CASE_8,
    clientRequestId: crypto.randomUUID(),
    data: { ...v1, summary: 'Rainwater tanks with first-flush filters for 40 poultry farms (DEMO).' },
    changeNote: 'Rewrote the summary.',
    taskResponses: [{ task_id: task.task_id, status: 'addressed', explanation: 'Summary rewritten.' }],
    declarationVersion: 'sample-2026-11-v1',
  })
  if (res.kind !== 'ok') throw new Error(`revision failed: ${JSON.stringify(res)}`)
}

beforeEach(async () => {
  mockSubmissionControls.reset()
  mockStaffControls.reset()
  mockReviewControls.reset()
  mockFeedbackControls.reset()
  window.localStorage.clear()
  await as(null)
})

describe('INN-01 compare versions', () => {
  it('shows staff what changed between version 1 and version 2', async () => {
    await versionTwo()
    await as('screening_officer')
    const user = renderAt(`/staff/cases/${CASE_8}`)
    await user.click(await screen.findByRole('tab', { name: 'Compare versions' }, LOAD))
    expect(await screen.findByText(/: 1 field and 0 files changed\.$/, {}, LOAD)).toBeInTheDocument()
    const field = screen.getByRole('listitem', { name: /: Changed$/ })
    expect(within(field).getByText('Fictional demo summary for Rainwater tanks for poultry farms.')).toBeInTheDocument()
    expect(within(field).getByText('Rainwater tanks with first-flush filters for 40 poultry farms (DEMO).')).toBeInTheDocument()
    expect(screen.getByText('Rewrote the summary.')).toBeInTheDocument()
    // Unchanged fields appear when asked.
    await user.click(screen.getByLabelText('Show only changes'))
    expect(screen.getAllByRole('listitem', { name: /: Unchanged$/ }).length).toBeGreaterThan(3)
  }, JOURNEY)

  it('puts the comparison next to the roadmap tasks in the reviewer’s version 2 scorecard', async () => {
    await versionTwo()
    await as('reviewer')
    await mockReview.declare({ assignmentId: R1_ON_8, hasConflict: false, confidentialityAccepted: true })
    const user = renderAt(`/staff/cases/${CASE_8}/score`)
    await user.click(await screen.findByText('Compare with version 1', {}, LOAD))
    expect(await screen.findByText(/: 1 field and 0 files changed\.$/, {}, LOAD)).toBeInTheDocument()
  }, JOURNEY)

  it('shows the versions only to people who may read the case', async () => {
    await versionTwo()
    await as('reviewer') // assigned to case 8 but not yet declared
    expect(await mockVersions.listVersions(CASE_8)).toBeNull()
    await as('committee_member')
    expect(await mockVersions.listVersions(CASE_8)).toBeNull()
    await as('applicant') // the owner
    expect((await mockVersions.listVersions(CASE_8))!.map((v) => v.version_no)).toEqual([1, 2])
  }, JOURNEY)
})

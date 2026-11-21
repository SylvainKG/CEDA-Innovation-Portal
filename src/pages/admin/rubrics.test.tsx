import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import userEvent, { type UserEvent } from '@testing-library/user-event'
import { MemoryRouter, useRoutes } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import { mockChallengeAdminControls } from '@/lib/api/mock/challenge-admin'
import { mockRubricAdmin, mockRubricAdminControls } from '@/lib/api/mock/rubric-admin'
import { mockSession } from '@/lib/api/mock/session'
import type { Role } from '@/lib/api/types'
import { routes } from '@/routes/router'

const LOAD = { timeout: 5000 }
const JOURNEY = 20_000
const SEED_RUBRIC = '10000000-0000-4000-8000-000000000001'

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

async function fillCriterion(user: UserEvent, group: HTMLElement, v: { key: string; label: string; weight: string }) {
  await user.type(within(group).getByLabelText('Key'), v.key)
  await user.type(within(group).getByLabelText('Name'), v.label)
  await user.type(within(group).getByLabelText('Weight (%)'), v.weight)
  await user.type(within(group).getByLabelText('Score 1 means'), 'Not shown')
  await user.type(within(group).getByLabelText('Score 3 means'), 'Partly shown')
  await user.type(within(group).getByLabelText('Score 5 means'), 'Fully shown with evidence')
}

beforeEach(async () => {
  mockRubricAdminControls.reset()
  mockChallengeAdminControls.reset()
  await as(null)
})

describe('T12 rubrics (REV-02, D-20)', () => {
  it('builds a new rubric, refuses publishing until the weights total 100, then locks it', async () => {
    await as('admin')
    const user = renderAt('/admin/challenges')
    await user.type(await screen.findByLabelText('Rubric title', {}, LOAD), 'Solar rubric')
    await user.type(screen.getByLabelText(/^Rubric key/), 'solar-2027')
    await user.click(screen.getByRole('button', { name: 'New rubric' }))
    expect(await screen.findByText('Draft of v1', {}, LOAD)).toBeInTheDocument()
    expect(screen.getByText('No criteria yet.')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Add criterion' }))
    let group = screen.getByRole('group', { name: 'New criterion' })
    await user.type(within(group).getByLabelText('Key'), 'impact')
    await user.type(within(group).getByLabelText('Name'), 'Impact')
    await user.type(within(group).getByLabelText('Weight (%)'), '60')
    await user.click(within(group).getByRole('button', { name: 'Save criterion' }))
    expect(await within(group).findByText('Describe scores 1, 3 and 5', {}, LOAD)).toBeInTheDocument()
    await user.type(within(group).getByLabelText('Score 1 means'), 'Not shown')
    await user.type(within(group).getByLabelText('Score 3 means'), 'Partly shown')
    await user.type(within(group).getByLabelText('Score 5 means'), 'Fully shown with evidence')
    await user.click(within(group).getByRole('button', { name: 'Save criterion' }))
    expect(await screen.findByText('Impact saved. Weights now total 60%.', {}, LOAD)).toBeInTheDocument()
    expect(screen.getByText('Total 60%: must be 100% to publish')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Publish rubric v1' }))
    expect(await screen.findByText('Weights must total 100% (now 60%).', {}, LOAD)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Add criterion' }))
    group = screen.getByRole('group', { name: 'New criterion' })
    await fillCriterion(user, group, { key: 'feasibility', label: 'Feasibility', weight: '40' })
    await user.click(within(group).getByRole('button', { name: 'Save criterion' }))
    expect(await screen.findByText('Total 100% ✓', {}, LOAD)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Publish rubric v1' }))
    expect(await screen.findByText('v1 is published and locked', {}, LOAD)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Save / })).not.toBeInTheDocument()
  }, JOURNEY)

  it('changes a published rubric only through a new draft copied from it', async () => {
    await as('admin')
    const user = renderAt(`/admin/rubrics/${SEED_RUBRIC}`)
    expect(await screen.findByText('v1 is published and locked', {}, LOAD)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Create draft v2' }))
    expect(await screen.findByText('Draft of v2, v1 is live', {}, LOAD)).toBeInTheDocument()
    expect(screen.getByText('Total 100% ✓')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Remove Economic impact' }))
    expect(await screen.findByText('Economic impact removed. Weights now total 80%.', {}, LOAD)).toBeInTheDocument()
    // Version 1 is untouched.
    const r = (await mockRubricAdmin.getRubric(SEED_RUBRIC))!
    expect(r.versions.find((v) => v.version_no === 1)!.criteria).toHaveLength(4)
    expect(await mockRubricAdmin.removeCriterion(r.versions.find((v) => v.version_no === 1)!.id, 'innovation')).toMatchObject({ kind: 'refused', code: 'INVALID_STATE' })
  }, JOURNEY)

  it('is refused to everyone but administrators', async () => {
    await as('adjudicator')
    expect(await mockRubricAdmin.listRubrics()).toBeNull()
    expect(await mockRubricAdmin.create({ key: 'x-1', title: 'X' })).toMatchObject({ kind: 'refused', code: 'FORBIDDEN' })
    renderAt(`/admin/rubrics/${SEED_RUBRIC}`)
    expect(await screen.findByRole('heading', { name: "You don't have access to this page" }, LOAD)).toBeInTheDocument()
  })
})

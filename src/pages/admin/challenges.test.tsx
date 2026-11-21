import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useRoutes } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import { mockChallengeAdmin, mockChallengeAdminControls } from '@/lib/api/mock/challenge-admin'
import { WATER_SMART_ID } from '@/lib/api/mock/fixtures'
import { mockSession } from '@/lib/api/mock/session'
import type { Role } from '@/lib/api/types'
import { routes } from '@/routes/router'

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

beforeEach(async () => {
  mockChallengeAdminControls.reset()
  await as(null)
})

describe('T12 challenges (ADM-01, ADM-02)', () => {
  it('creates a draft, builds its form, and publishes it', async () => {
    await as('admin')
    const user = renderAt('/admin/challenges')
    await user.click(await screen.findByRole('button', { name: 'New challenge' }, LOAD))
    await user.type(screen.getByLabelText(/^Title/), 'Solar Farming Challenge 2027')
    await user.type(screen.getByLabelText(/^Web address/), 'Solar Farming')
    await user.type(screen.getByLabelText('Opens (CAT)'), '2027-01-10T09:00')
    await user.type(screen.getByLabelText('Closes (CAT)'), '2027-01-01T09:00')
    await user.click(screen.getByRole('button', { name: 'Create draft' }))
    expect(await screen.findByText('Use a new address of lowercase letters, numbers and hyphens.', {}, LOAD)).toBeInTheDocument()
    await user.clear(screen.getByLabelText(/^Web address/))
    await user.type(screen.getByLabelText(/^Web address/), 'solar-farming-2027')
    await user.click(screen.getByRole('button', { name: 'Create draft' }))
    expect(await screen.findByText('The closing date must be after the opening date.', {}, LOAD)).toBeInTheDocument()
    await user.clear(screen.getByLabelText('Closes (CAT)'))
    await user.type(screen.getByLabelText('Closes (CAT)'), '2027-03-31T16:00')
    await user.click(screen.getByRole('button', { name: 'Create draft' }))

    expect(await screen.findByRole('heading', { name: 'Solar Farming Challenge 2027', level: 1 }, LOAD)).toBeInTheDocument()
    expect(screen.getByText('Draft · No application form yet')).toBeInTheDocument()
    // A choice field without options is refused with the server's words.
    await user.click(screen.getByRole('button', { name: 'Add field' }))
    const field = screen.getByRole('group', { name: 'Field 2' })
    await user.type(within(field).getByLabelText('Key'), 'farm_size')
    await user.type(within(field).getByLabelText('Label'), 'Farm size')
    await user.selectOptions(within(field).getByLabelText('Type'), 'select')
    await user.click(screen.getByRole('button', { name: 'Save form as draft' }))
    expect(await screen.findByText('Field "farm_size": A choice field needs options', {}, LOAD)).toBeInTheDocument()
    await user.type(within(screen.getByRole('group', { name: 'Field farm_size' })).getByLabelText('Options (one per line)'), 'Small{enter}Large')
    await user.click(screen.getByRole('button', { name: 'Save form as draft' }))
    expect(await screen.findByText('Form saved as a draft. Publish to make it live.', {}, LOAD)).toBeInTheDocument()
    expect(await screen.findByText('Draft · Draft of v1', {}, LOAD)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Publish challenge' }))
    expect(await screen.findByText('Published form v1.', {}, LOAD)).toBeInTheDocument()
    expect(await screen.findByText('Published · Form v1 is live', {}, LOAD)).toBeInTheDocument()
  }, JOURNEY)

  it('keeps the live form unchanged: editing it makes a draft v2, and a draft rubric blocks publishing', async () => {
    await as('admin')
    const user = renderAt(`/admin/challenges/${WATER_SMART_ID}`)
    expect(await screen.findByText('Published · Form v1 is live', {}, LOAD)).toBeInTheDocument()
    await user.selectOptions(screen.getByLabelText('Scoring rubric'), 'Draft rubric (DEMO) v1 (not published)')
    await user.click(screen.getByRole('button', { name: 'Save form as draft' }))
    expect(await screen.findByText('Published · Draft of v2, v1 is live', {}, LOAD)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Publish form v2' }))
    expect(await screen.findByText('Publish the rubric before the challenge.', {}, LOAD)).toBeInTheDocument()
    expect((await mockChallengeAdmin.getChallenge(WATER_SMART_ID))!.versions.find((v) => v.version_no === 1)!.published_at).not.toBeNull()
  }, JOURNEY)

  it('deletes only an unused draft, and refuses non-admins', async () => {
    await as('admin')
    expect(await mockChallengeAdmin.remove(WATER_SMART_ID)).toMatchObject({ kind: 'refused', code: 'INVALID_STATE' })
    await as('adjudicator')
    expect(await mockChallengeAdmin.listChallenges()).toBeNull()
    expect(await mockChallengeAdmin.create({ slug: 'x-1', title: 'X', summary: '', audience: '', opensAt: '2027-01-01T00:00:00Z', closesAt: '2027-02-01T00:00:00Z' })).toMatchObject({
      kind: 'refused',
      code: 'FORBIDDEN',
    })
    renderAt('/admin/challenges')
    expect(await screen.findByRole('heading', { name: "You don't have access to this page" }, LOAD)).toBeInTheDocument()
  })
})

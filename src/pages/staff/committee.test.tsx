import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter, useRoutes } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import { mockCommittee } from '@/lib/api/mock/committee'
import { mockSession } from '@/lib/api/mock/session'
import { mockStaffControls } from '@/lib/api/mock/staff'
import { mockSubmissionControls } from '@/lib/api/mock/submission'
import type { Role } from '@/lib/api/types'
import { routes } from '@/routes/router'

const LOAD = { timeout: 5000 }

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

const as = (role: Role | null) => mockSession.switchDemoRole?.(role)
const tile = (label: string) => screen.getByText(label, { selector: 'span' }).parentElement!

beforeEach(async () => {
  mockSubmissionControls.reset()
  mockStaffControls.reset()
  await as(null)
})

describe('D-08 committee view (status only)', () => {
  it('gives the committee counts by stage that match the seed', async () => {
    await as('committee_member')
    renderAt('/staff')
    expect(await screen.findByRole('heading', { name: 'Programme overview' }, LOAD)).toBeInTheDocument()
    expect(within(tile('Ideas submitted')).getByText('8')).toBeInTheDocument()
    expect(within(tile('Review')).getByText('3')).toBeInTheDocument()
    expect(within(tile('Award')).getByText('1')).toBeInTheDocument()
  })

  it('lists references, challenges and stages, and never proposal titles', async () => {
    await as('committee_member')
    renderAt('/staff/cases')
    expect(await screen.findByText(/^8 cases, most recently updated first\./, {}, LOAD)).toBeInTheDocument()
    expect(screen.getAllByText('CEDA-2026-0004').length).toBeGreaterThan(0)
    expect(screen.queryByText('Fog-net water harvesting')).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'CEDA-2026-0004' })).not.toBeInTheDocument()
  })

  it('is refused to people without status access', async () => {
    await as('reviewer')
    expect(await mockCommittee.listStatus()).toBeNull()
    expect(await mockCommittee.stageCounts()).toBeNull()
    await as('applicant')
    expect(await mockCommittee.listStatus()).toBeNull()
  })
})

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useRoutes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mockSession } from '@/lib/api/mock/session'
import { mockStaff, mockStaffControls } from '@/lib/api/mock/staff'
import { mockSubmissionControls } from '@/lib/api/mock/submission'
import type { Role } from '@/lib/api/types'
import { routes } from '@/routes/router'

const CASE_1 = '30000000-0000-4000-8000-000000000001'

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

async function openNotes() {
  const user = renderAt(`/staff/cases/${CASE_1}`)
  await user.click(await screen.findByRole('tab', { name: 'Internal notes' }))
  return user
}

afterEach(() => vi.restoreAllMocks())
beforeEach(async () => {
  mockSubmissionControls.reset()
  mockStaffControls.reset()
  window.localStorage.clear()
  await as(null)
})

describe('T08 internal notes', () => {
  it('adds a note, newest first, marked as yours, and says applicants never see notes', async () => {
    await as('screening_officer')
    const user = await openNotes()
    const panel = screen.getByRole('tabpanel')
    expect(within(panel).getByText('Only CEDA staff can see these notes. The applicant never sees them.')).toBeInTheDocument()
    expect(await within(panel).findByText('No notes yet.')).toBeInTheDocument()

    await user.click(within(panel).getByRole('button', { name: 'Add note' }))
    expect(within(panel).getByText('Write a note first')).toBeInTheDocument()

    await user.type(within(panel).getByLabelText('New note'), 'Checked the business plan.')
    await user.click(within(panel).getByRole('button', { name: 'Add note' }))
    expect(await within(panel).findByText('Checked the business plan.')).toBeInTheDocument()
    expect(within(panel).getByText('You')).toBeInTheDocument()
    expect(within(panel).getByLabelText('New note')).toHaveValue('')
  })

  it('shows other people’s names only to admins', async () => {
    await as('screening_officer')
    await mockStaff.addNote({ proposalId: CASE_1, body: 'From screening.' })
    await as('adjudicator')
    await openNotes()
    expect(await screen.findByText('From screening.')).toBeInTheDocument()
    expect(screen.getByText('Staff')).toBeInTheDocument()
    expect(screen.queryByText('Demo Screening Officer')).not.toBeInTheDocument()
  })

  it('an admin sees the author’s name', async () => {
    await as('screening_officer')
    await mockStaff.addNote({ proposalId: CASE_1, body: 'From screening.' })
    await as('admin')
    await openNotes()
    expect(await screen.findByText('Demo Screening Officer')).toBeInTheDocument()
  })

  it('a lost reply looks for the note: found means added; not found warns before adding twice', async () => {
    await as('screening_officer')
    const real = mockStaff.addNote.bind(mockStaff)
    vi.spyOn(mockStaff, 'addNote')
      .mockImplementationOnce(async (input) => {
        await real(input)
        throw new Error('network')
      })
      .mockRejectedValueOnce(new Error('network'))
    const user = await openNotes()
    const panel = screen.getByRole('tabpanel')
    await user.type(within(panel).getByLabelText('New note'), 'First.')
    await user.click(within(panel).getByRole('button', { name: 'Add note' }))
    expect(await within(panel).findByText('First.')).toBeInTheDocument()
    expect(within(panel).queryByText('Not confirmed yet')).not.toBeInTheDocument()

    await user.type(within(panel).getByLabelText('New note'), 'Second.')
    await user.click(within(panel).getByRole('button', { name: 'Add note' }))
    expect(await within(panel).findByText('Not confirmed yet')).toBeInTheDocument()
    expect(within(panel).getByText(/Check the list below before adding it again/)).toBeInTheDocument()
  })

  it('is not offered to roles without case.note, and the mock refuses them', async () => {
    await as('committee_member')
    expect(await mockStaff.listNotes(CASE_1)).toEqual([])
    expect(await mockStaff.addNote({ proposalId: CASE_1, body: 'x' })).toMatchObject({ kind: 'refused', code: 'FORBIDDEN' })
    await as('applicant')
    expect(await mockStaff.addNote({ proposalId: CASE_1, body: 'x' })).toMatchObject({ kind: 'refused', code: 'FORBIDDEN' })
  })
})

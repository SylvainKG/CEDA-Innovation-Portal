import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useRoutes } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import { mockAdmin, mockAdminControls } from '@/lib/api/mock/admin'
import { mockSession } from '@/lib/api/mock/session'
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
  return userEvent.setup()
}

const as = (role: Role | null) => mockSession.switchDemoRole?.(role)

beforeEach(async () => {
  mockAdminControls.reset()
  await as(null)
})

describe('T12 users and roles (IAM-01)', () => {
  it('grants a role, then removes it with a reason', async () => {
    await as('admin')
    const user = renderAt('/admin/users')
    const row = await screen.findByRole('listitem', { name: 'Demo Reviewer 2' }, LOAD)
    await user.selectOptions(within(row).getByLabelText('Add a role to Demo Reviewer 2'), 'adjudicator')
    await user.click(within(row).getByRole('button', { name: 'Grant role' }))
    expect(await screen.findByText('Demo Reviewer 2 now has the Adjudicator role.', {}, LOAD)).toBeInTheDocument()
    await waitFor(() => expect(within(screen.getByRole('list', { name: 'Roles of Demo Reviewer 2' })).getByText('Adjudicator')).toBeInTheDocument(), LOAD)

    await user.click(screen.getByRole('button', { name: 'Remove Adjudicator from Demo Reviewer 2' }))
    const dialog = await screen.findByRole('dialog')
    await user.type(within(dialog).getByLabelText(/^Reason/), 'Granted by mistake.')
    await user.click(within(dialog).getByRole('button', { name: 'Remove role' }))
    expect(await screen.findByText('Adjudicator removed from Demo Reviewer 2.', {}, LOAD)).toBeInTheDocument()
    await waitFor(() => expect(within(screen.getByRole('list', { name: 'Roles of Demo Reviewer 2' })).queryByText('Adjudicator')).not.toBeInTheDocument(), LOAD)
  })

  it("disables the administrator's own role controls, and the server refuses a self-change anyway", async () => {
    await as('admin')
    renderAt('/admin/users')
    const row = await screen.findByRole('listitem', { name: 'Demo Administrator' }, LOAD)
    expect(within(row).getByText("You can't change your own roles.", { selector: 'p' })).toBeInTheDocument()
    expect(within(row).getByRole('button', { name: 'Remove Administrator from Demo Administrator' })).toBeDisabled()
    expect(within(row).queryByRole('button', { name: 'Grant role' })).not.toBeInTheDocument()
    expect(await mockAdmin.grantRole({ userId: 'demo-admin', roleKey: 'reviewer' })).toMatchObject({ kind: 'refused', code: 'FORBIDDEN' })
    expect(await mockAdmin.revokeRole({ userId: 'demo-admin', roleKey: 'auditor', reason: 'x' })).toMatchObject({ kind: 'refused', code: 'FORBIDDEN' })
  })

  it('invites staff by email, shows field errors, and inviting twice is safe', async () => {
    await as('admin')
    const user = renderAt('/admin/users')
    // "Invite user" opens the invitation as a side sheet (Sandra's invite frame).
    await user.click(await screen.findByRole('button', { name: 'Invite user' }, LOAD))
    await screen.findByRole('heading', { name: 'Invite staff' }, LOAD)
    await user.type(screen.getByLabelText(/^Email/), 'not-an-email')
    await user.click(screen.getByRole('button', { name: 'Send invitation' }))
    expect(await screen.findByText('Enter an email address like name@example.org', {}, LOAD)).toBeInTheDocument()
    expect(screen.getByText('Choose a staff role')).toBeInTheDocument()

    await user.clear(screen.getByLabelText(/^Email/))
    await user.type(screen.getByLabelText(/^Email/), 'new.reviewer@demo.ceda-portal.test')
    await user.type(screen.getByLabelText(/^Full name/), 'Demo Reviewer 4')
    await user.selectOptions(within(screen.getByRole('dialog')).getByLabelText(/^Role/), 'reviewer')
    await user.click(screen.getByRole('button', { name: 'Send invitation' }))
    expect(await screen.findByText('Invitation sent to new.reviewer@demo.ceda-portal.test.', {}, LOAD)).toBeInTheDocument()
    expect(await screen.findByRole('listitem', { name: 'Demo Reviewer 4' }, LOAD)).toBeInTheDocument()
    expect(await mockAdmin.invite({ email: 'new.reviewer@demo.ceda-portal.test', fullName: 'Demo Reviewer 4', roleKey: 'reviewer' })).toMatchObject({
      kind: 'ok',
      data: { invited: false, already_had_role: true },
    })
  })

  it('is closed to everyone but administrators', async () => {
    await as('adjudicator')
    expect(await mockAdmin.listUsers()).toBeNull()
    expect(await mockAdmin.grantRole({ userId: 'demo-reviewer-2', roleKey: 'admin' })).toMatchObject({ kind: 'refused', code: 'FORBIDDEN' })
    expect(await mockAdmin.invite({ email: 'x@demo.test', fullName: 'X', roleKey: 'admin' })).toMatchObject({ kind: 'refused', code: 'FORBIDDEN' })
    renderAt('/admin/users')
    expect(await screen.findByRole('heading', { name: "You don't have access to this page" }, LOAD)).toBeInTheDocument()
  })
})

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useRoutes } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import { mockConfigAdmin, mockConfigAdminControls } from '@/lib/api/mock/config-admin'
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
  mockConfigAdminControls.reset()
  await as(null)
})

describe('T12 roles (ARC-01)', () => {
  it('adds a role as data, edits its permissions, and keeps built-in roles read only', async () => {
    await as('admin')
    const user = renderAt('/admin/settings/roles')
    await user.click(await screen.findByRole('button', { name: 'Add role' }, LOAD))
    const form = screen.getByRole('form', { name: 'Add role' })
    await user.type(within(form).getByLabelText(/^Role name/), 'Programme observer')
    await user.type(within(form).getByLabelText(/^Role key/), 'Observer!')
    await user.click(within(form).getByRole('checkbox', { name: /Read programme reports/ }))
    await user.click(within(form).getByRole('button', { name: 'Add role' }))
    expect(await screen.findByText('Use lowercase letters, numbers and underscores for the role key.', {}, LOAD)).toBeInTheDocument()
    expect(within(form).getByLabelText(/^Role key/)).toHaveAttribute('aria-invalid', 'true')
    await user.clear(within(form).getByLabelText(/^Role key/))
    await user.type(within(form).getByLabelText(/^Role key/), 'programme_observer')
    await user.click(within(form).getByRole('button', { name: 'Add role' }))
    expect(await screen.findByText('Role "Programme observer" added.', {}, LOAD)).toBeInTheDocument()

    const observer = (await screen.findByText('Programme observer', { selector: 'summary *' }, LOAD)).closest('li') as HTMLElement
    await user.click(within(observer).getByText('Programme observer', { selector: 'summary *' }))
    await user.click(within(observer).getByRole('checkbox', { name: /Read case reference, stage and counts only/ }))
    await user.click(screen.getByRole('button', { name: 'Save Programme observer' }))
    expect(await screen.findByText('Programme observer permissions saved.', {}, LOAD)).toBeInTheDocument()
    expect((await mockConfigAdmin.roleSetup()).roles.find((r) => r.key === 'programme_observer')!.permissions).toEqual(['case.read_status', 'report.read'])

    // Built-in roles: checkboxes disabled on screen, and the server refuses a change.
    const reviewer = screen.getByText('Reviewer', { selector: 'summary *' }).closest('li') as HTMLElement
    expect(within(reviewer).getByRole('checkbox', { name: /Score assigned cases/ })).toBeDisabled()
    expect(await mockConfigAdmin.setRolePermissions('reviewer', ['audit.read'])).toMatchObject({ kind: 'refused', code: 'INVALID_STATE' })
  }, JOURNEY)
})

describe('T12 content (HLP-01)', () => {
  it('publishes a new FAQ that then appears on the public FAQ page', async () => {
    await as('admin')
    let user = renderAt('/admin/content')
    await user.click(await screen.findByRole('button', { name: 'New page' }, LOAD))
    await user.type(screen.getByLabelText('Title'), 'Can I apply as a group?')
    await user.type(screen.getByLabelText(/^Address/), 'faq-groups')
    await user.type(screen.getByLabelText(/^Text \(Markdown\)/), 'Sample answer: yes, **one person** submits for the group.')
    expect(screen.getByText('one person').tagName).toBe('STRONG')
    await user.click(screen.getByRole('button', { name: 'Publish' }))
    expect(await screen.findByText('"Can I apply as a group?" published.', {}, LOAD)).toBeInTheDocument()
    cleanup()
    await as(null)
    user = renderAt('/help/faqs')
    expect(await screen.findByText('Can I apply as a group?', {}, LOAD)).toBeInTheDocument()
  }, JOURNEY)

  it('needs a new version when privacy or declaration wording changes, and keeps drafts off the public pages', async () => {
    await as('admin')
    expect(await mockConfigAdmin.saveContent({ slug: 'privacy-notice', kind: 'privacy', title: 'Privacy', bodyMd: 'v1 text', status: 'published', position: 0, isSample: true, version: null })).toMatchObject({
      kind: 'refused',
      fields: { version: 'Required' },
    })
    await mockConfigAdmin.saveContent({ slug: 'privacy-notice', kind: 'privacy', title: 'Privacy', bodyMd: 'v1 text', status: 'published', position: 0, isSample: true, version: '2026-11-v1' })
    expect(await mockConfigAdmin.saveContent({ slug: 'privacy-notice', kind: 'privacy', title: 'Privacy', bodyMd: 'new text', status: 'published', position: 0, isSample: true, version: '2026-11-v1' })).toMatchObject({
      kind: 'refused',
      fields: { version: 'Use a new version' },
    })
    expect(await mockConfigAdmin.saveContent({ slug: 'faq-draft', kind: 'faq', title: 'Draft question', bodyMd: 'x', status: 'draft', position: 9, isSample: true, version: null })).toMatchObject({ kind: 'ok' })
    await as(null)
    renderAt('/help/faqs')
    await screen.findByText('Who can apply?', {}, LOAD)
    expect(screen.queryByText('Draft question')).not.toBeInTheDocument()
  })

  it('is refused to everyone but administrators', async () => {
    await as('adjudicator')
    expect(await mockConfigAdmin.createRole({ key: 'x_role', label: 'X', permissions: [], requiresMfa: true })).toMatchObject({ kind: 'refused', code: 'FORBIDDEN' })
    expect(await mockConfigAdmin.saveContent({ slug: 'faq-x', kind: 'faq', title: 'X', bodyMd: '', status: 'published', position: 0, isSample: true, version: null })).toMatchObject({
      kind: 'refused',
      code: 'FORBIDDEN',
    })
    renderAt('/admin/content')
    expect(await screen.findByRole('heading', { name: "You don't have access to this page" }, LOAD)).toBeInTheDocument()
  })
})

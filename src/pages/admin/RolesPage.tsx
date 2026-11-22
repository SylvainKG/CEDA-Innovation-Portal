import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Banner, Button, TextField } from '@/components'
import { ErrorState, LoadingState } from '@/components/states/States'
import { api } from '@/lib/api'
import type { AdminRole, CommandOutcome, PermissionOption } from '@/lib/api/types'
import { SettingsNav } from './SettingsNav'

type Msg = { kind: 'success' | 'error' | 'warning'; text: string; fields?: Record<string, string> } | null
const KEY = ['admin', 'role-setup'] as const

/**
 * T12 roles (ARC-01), Provisional UI built from the written spec (BCR-003; design review pending). Every role
 * with its permission checklist. Built-in roles are read only (the server refuses changes); "Add role" creates a
 * new role as data, with its permissions and whether it needs two-step sign-in. Grant roles to people on
 * Users and roles.
 */
export function RolesPage() {
  const qc = useQueryClient()
  const setup = useQuery({ queryKey: KEY, queryFn: () => api.configAdmin.roleSetup() })
  const [msg, setMsg] = useState<Msg>(null)
  const [busy, setBusy] = useState(false)

  if (setup.isPending) return <LoadingState what="roles" />
  if (setup.isError) return <ErrorState level="h1" message="We couldn't load roles and permissions." onRetry={() => void setup.refetch()} />

  async function act(run: () => Promise<CommandOutcome<unknown>>, ok: string) {
    setBusy(true)
    let r: CommandOutcome<unknown>
    try {
      r = await run()
    } catch {
      r = { kind: 'unknown', requestKey: '' }
    }
    await qc.invalidateQueries({ queryKey: ['admin'] })
    setBusy(false)
    setMsg(r.kind === 'ok' ? { kind: 'success', text: ok } : r.kind === 'refused' ? { kind: 'error', text: r.message ?? 'The change was refused.', fields: r.fields } : { kind: 'warning', text: "We couldn't confirm the change. The list shows what is saved." })
    return r.kind === 'ok'
  }

  const { roles, permissions } = setup.data
  return (
    <div className="flex flex-col gap-6">
      <SettingsNav />
      <div className="flex flex-col gap-1">
        <h1 className="text-h1 font-semibold">Roles</h1>
        <p className="text-ink-muted">
          What each role can do. Give roles to people on <Link to="/admin/users">Users and roles</Link>.
        </p>
      </div>
      <div aria-live="polite">{msg ? <Banner kind={msg.kind}>{msg.text}</Banner> : null}</div>
      <NewRole permissions={permissions} busy={busy} fields={msg?.fields} onCreate={(i) => act(() => api.configAdmin.createRole(i), `Role "${i.label.trim()}" added.`)} />
      <ul className="flex flex-col gap-3">
        {roles.map((role) => (
          <RoleRow key={role.key} role={role} permissions={permissions} busy={busy} onSave={(p) => act(() => api.configAdmin.setRolePermissions(role.key, p), `${role.label} permissions saved.`)} />
        ))}
      </ul>
    </div>
  )
}

function Checklist({ id, permissions, value, onChange, disabled }: { id: string; permissions: PermissionOption[]; value: string[]; onChange?: (v: string[]) => void; disabled?: boolean }) {
  return (
    <div className="grid grid-cols-1 gap-1 md:grid-cols-2">
      {permissions.map((p) => (
        <div key={p.key} className="flex min-h-touch items-start gap-2 py-1">
          <input
            type="checkbox"
            className="mt-1 h-5 w-5 shrink-0"
            id={`${id}-${p.key}`}
            checked={value.includes(p.key)}
            disabled={disabled}
            onChange={(e) => onChange?.(e.target.checked ? [...value, p.key] : value.filter((x) => x !== p.key))}
          />
          <label htmlFor={`${id}-${p.key}`} className="flex flex-col">
            {p.description}
            <span className="font-mono text-xs text-ink-muted">{p.key}</span>
          </label>
        </div>
      ))}
    </div>
  )
}

function RoleRow({ role, permissions, busy, onSave }: { role: AdminRole; permissions: PermissionOption[]; busy: boolean; onSave: (p: string[]) => Promise<boolean> }) {
  const [value, setValue] = useState(role.permissions)
  // The checklist renders only while the role is open: ten roles × twenty permissions is a lot of controls.
  const [open, setOpen] = useState(false)
  const changed = [...value].sort().join() !== role.permissions.join()
  return (
    <li className="rounded-md bg-surface-card p-4 shadow-1">
      <details onToggle={(e) => setOpen((e.currentTarget as HTMLDetailsElement).open)}>
        <summary className="flex min-h-touch cursor-pointer flex-wrap items-baseline gap-x-3">
          <span className="font-semibold">{role.label}</span>
          <span className="text-sm text-ink-muted">
            {role.is_system ? 'Built-in' : 'Added'} · {role.permissions.length} permissions{role.requires_mfa ? ' · two-step sign-in' : ''}
          </span>
        </summary>
        {open ? (
          <div className="mt-3 flex flex-col gap-3">
          {role.is_system ? <p className="text-sm text-ink-muted">Built-in roles keep their permissions. Add a new role to combine them differently.</p> : null}
          <fieldset>
            <legend className="sr-only">{role.label} permissions</legend>
            <Checklist id={`role-${role.key}`} permissions={permissions} value={value} onChange={setValue} disabled={role.is_system} />
          </fieldset>
          {!role.is_system ? (
            <div>
              <Button size="sm" variant="secondary" disabled={!changed || busy} disabledReason={!changed ? 'No changes' : 'Saving…'} onClick={() => void onSave(value)}>
                Save {role.label}
              </Button>
            </div>
          ) : null}
          </div>
        ) : null}
      </details>
    </li>
  )
}

function NewRole({
  permissions,
  busy,
  fields,
  onCreate,
}: {
  permissions: PermissionOption[]
  busy: boolean
  fields?: Record<string, string>
  onCreate: (i: { key: string; label: string; permissions: string[]; requiresMfa: boolean }) => Promise<boolean>
}) {
  const [open, setOpen] = useState(false)
  const [v, setV] = useState({ key: '', label: '', permissions: [] as string[], requiresMfa: true })
  if (!open)
    return (
      <div>
        <Button onClick={() => setOpen(true)}>Add role</Button>
      </div>
    )
  return (
    <form
      noValidate
      aria-labelledby="new-role-h"
      className="flex flex-col gap-3 rounded-md bg-surface-card p-4 shadow-1"
      onSubmit={async (e) => {
        e.preventDefault()
        if (await onCreate({ ...v, key: v.key.trim() })) {
          setV({ key: '', label: '', permissions: [], requiresMfa: true })
          setOpen(false)
        }
      }}
    >
      <h2 id="new-role-h" className="text-h2 font-semibold">
        Add role
      </h2>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <TextField id="role-label" label="Role name" maxLength={80} value={v.label} onChange={(e) => setV({ ...v, label: e.target.value })} error={fields?.label} />
        <TextField id="role-key" label="Role key" help="Lowercase letters, numbers and underscores" value={v.key} onChange={(e) => setV({ ...v, key: e.target.value })} error={fields?.key} />
      </div>
      <label className="flex min-h-touch items-center gap-2">
        <input type="checkbox" className="h-5 w-5" checked={v.requiresMfa} onChange={(e) => setV({ ...v, requiresMfa: e.target.checked })} />
        Needs two-step sign-in
      </label>
      <fieldset className="flex flex-col gap-1">
        <legend className="font-semibold">Permissions</legend>
        <Checklist id="new-role" permissions={permissions} value={v.permissions} onChange={(p) => setV({ ...v, permissions: p })} />
        {fields?.permissions ? <p className="text-sm text-error">{fields.permissions}</p> : null}
      </fieldset>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" loading={busy} loadingLabel="Adding…">
          Add role
        </Button>
        <Button variant="tertiary" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </form>
  )
}

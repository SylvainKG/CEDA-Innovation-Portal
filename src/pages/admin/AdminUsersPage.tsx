import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Banner, Button, Dialog, TextField } from '@/components'
import { ErrorState, ForbiddenState, LoadingState } from '@/components/states/States'
import { api } from '@/lib/api'
import type { AdminUser, CommandOutcome, RoleOption } from '@/lib/api/types'
import { useSession } from '@/lib/session'

const keys = { users: ['admin', 'users'] as const, roles: ['admin', 'roles'] as const }

type Result = { kind: 'idle' } | { kind: 'busy' } | { kind: 'ok'; message: string } | { kind: 'refused'; message: string; fields?: Record<string, string> } | { kind: 'unknown' }

/**
 * T12 users and roles (IAM-01, ARC-01), Provisional UI built from the written spec (BCR-003; design review
 * pending). Everyone registered, with their roles as chips; grant a role, remove one (with a reason), and invite
 * staff by email. The administrator's own row has the role controls disabled: "You can't change your own roles."
 * Every change is checked by the server (role.manage) and audited there.
 */
export function AdminUsersPage() {
  const { data: me } = useSession()
  const qc = useQueryClient()
  const users = useQuery({ queryKey: keys.users, queryFn: () => api.admin.listUsers() })
  const roles = useQuery({ queryKey: keys.roles, queryFn: () => api.admin.listRoles(), staleTime: 5 * 60_000 })
  const [result, setResult] = useState<Result>({ kind: 'idle' })
  const [revoking, setRevoking] = useState<{ user: AdminUser; role: string } | null>(null)
  const [reason, setReason] = useState('')

  if (users.isPending || roles.isPending) return <LoadingState what="people and roles" />
  if (users.isError || roles.isError) return <ErrorState level="h1" message="We couldn't load people and roles." onRetry={() => void Promise.all([users.refetch(), roles.refetch()])} />
  if (users.data === null) return <ForbiddenState home="/staff" />
  const label = (key: string) => roles.data.find((r) => r.key === key)?.label ?? key

  async function act(run: () => Promise<CommandOutcome<unknown>>, ok: string): Promise<boolean> {
    setResult({ kind: 'busy' })
    let r: CommandOutcome<unknown>
    try {
      r = await run()
    } catch {
      r = { kind: 'unknown', requestKey: '' }
    }
    // Re-read in every case: the list shows what the server actually holds.
    await qc.invalidateQueries({ queryKey: keys.users })
    if (r.kind === 'ok') setResult({ kind: 'ok', message: ok })
    else if (r.kind === 'refused') setResult({ kind: 'refused', message: r.message ?? 'The change was refused.', fields: r.fields })
    else setResult({ kind: 'unknown' })
    return r.kind === 'ok'
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-h1 font-semibold">Users and roles</h1>
        <p className="text-ink-muted">Roles decide what each person can see and do. Every change is recorded in the audit log.</p>
      </div>
      <div aria-live="polite">
        {result.kind === 'ok' ? <Banner kind="success">{result.message}</Banner> : null}
        {result.kind === 'refused' && !result.fields ? <Banner kind="error">{result.message}</Banner> : null}
        {result.kind === 'unknown' ? <Banner kind="warning">We couldn&apos;t confirm the change. The list below shows what is saved; trying again is safe.</Banner> : null}
      </div>

      <Invite roles={roles.data} busy={result.kind === 'busy'} fields={result.kind === 'refused' ? result.fields : undefined} onInvite={(i) => act(() => api.admin.invite(i), `Invitation sent to ${i.email.trim()}.`)} />

      <section aria-labelledby="users-list" className="flex flex-col gap-3">
        <h2 id="users-list" className="text-h2 font-semibold">
          People ({users.data.length})
        </h2>
        <ul className="flex flex-col divide-y divide-line rounded-md bg-surface-card shadow-1">
          {users.data.map((u) => (
            <UserRow
              key={u.id}
              u={u}
              self={u.id === me?.id}
              roles={roles.data}
              label={label}
              busy={result.kind === 'busy'}
              onGrant={(role) => act(() => api.admin.grantRole({ userId: u.id, roleKey: role }), `${u.full_name} now has the ${label(role)} role.`)}
              onRevoke={(role) => {
                setReason('')
                setRevoking({ user: u, role })
              }}
            />
          ))}
        </ul>
      </section>

      <Dialog
        open={revoking !== null}
        onOpenChange={(o) => (o ? null : setRevoking(null))}
        title={revoking ? `Remove ${label(revoking.role)} from ${revoking.user.full_name}` : ''}
        consequence="They lose this role's access straight away and are told their access changed."
        primaryLabel="Remove role"
        primaryVariant="destructive"
        busy={result.kind === 'busy'}
        audited
        onPrimary={async () => {
          if (!revoking || !reason.trim()) return
          const done = await act(() => api.admin.revokeRole({ userId: revoking.user.id, roleKey: revoking.role, reason }), `${label(revoking.role)} removed from ${revoking.user.full_name}.`)
          if (done) setRevoking(null)
        }}
      >
        <TextField multiline rows={2} id="revoke-reason" label="Reason" required maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} error={result.kind === 'refused' ? result.fields?.reason : undefined} />
      </Dialog>
    </div>
  )
}

function UserRow({
  u,
  self,
  roles,
  label,
  busy,
  onGrant,
  onRevoke,
}: {
  u: AdminUser
  self: boolean
  roles: RoleOption[]
  label: (k: string) => string
  busy: boolean
  onGrant: (role: string) => void
  onRevoke: (role: string) => void
}) {
  const [add, setAdd] = useState('')
  const free = roles.filter((r) => !u.roles.includes(r.key))
  const why = "You can't change your own roles."
  return (
    <li className="flex flex-col gap-2 p-3" aria-label={u.full_name}>
      <div className="flex flex-wrap items-baseline gap-x-3">
        <span className="font-semibold">{u.full_name || 'No name'}</span>
        {u.email ? <span className="break-all text-sm text-ink-muted">{u.email}</span> : null}
        {u.organisation ? <span className="text-sm text-ink-muted">{u.organisation}</span> : null}
      </div>
      <ul className="flex flex-wrap gap-2" aria-label={`Roles of ${u.full_name}`}>
        {u.roles.length === 0 ? <li className="text-sm text-ink-muted">No roles</li> : null}
        {u.roles.map((r) => (
          <li key={r} className="flex items-center gap-1 rounded-full border border-line px-3 py-1 text-sm">
            {label(r)}
            <Button size="sm" variant="tertiary" aria-label={`Remove ${label(r)} from ${u.full_name}`} disabled={self || busy} disabledReason={self ? why : 'Saving…'} onClick={() => onRevoke(r)}>
              Remove
            </Button>
          </li>
        ))}
      </ul>
      {self ? (
        <p className="text-sm text-ink-muted">{why}</p>
      ) : (
        <div className="flex flex-wrap items-end gap-2">
          <label className="flex flex-col gap-1 text-sm font-semibold">
            Add a role
            <select className="min-h-touch rounded-sm border border-line-input bg-surface-card px-2 text-base font-normal" value={add} onChange={(e) => setAdd(e.target.value)} aria-label={`Add a role to ${u.full_name}`}>
              <option value="">Choose a role</option>
              {free.map((r) => (
                <option key={r.key} value={r.key}>
                  {r.label}
                </option>
              ))}
            </select>
          </label>
          <Button
            size="sm"
            variant="secondary"
            disabled={!add || busy}
            disabledReason={!add ? 'Choose a role' : 'Saving…'}
            onClick={() => {
              onGrant(add)
              setAdd('')
            }}
          >
            Grant role
          </Button>
        </div>
      )}
    </li>
  )
}

function Invite({ roles, busy, fields, onInvite }: { roles: RoleOption[]; busy: boolean; fields?: Record<string, string>; onInvite: (i: { email: string; fullName: string; roleKey: string }) => Promise<boolean> }) {
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [roleKey, setRoleKey] = useState('')
  return (
    <form
      noValidate
      aria-labelledby="invite-h"
      className="flex flex-col gap-3 rounded-md bg-surface-card p-4 shadow-1"
      onSubmit={async (e) => {
        e.preventDefault()
        if (await onInvite({ email, fullName, roleKey })) {
          setEmail('')
          setFullName('')
          setRoleKey('')
        }
      }}
    >
      <h2 id="invite-h" className="text-h2 font-semibold">
        Invite staff
      </h2>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <TextField id="invite-email" label="Email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} error={fields?.email} />
        <TextField id="invite-name" label="Full name" required value={fullName} onChange={(e) => setFullName(e.target.value)} error={fields?.full_name} />
        <div className="flex flex-col gap-1">
          <label htmlFor="invite-role" className="font-semibold">
            Role
          </label>
          <select
            id="invite-role"
            className="min-h-touch rounded-sm border border-line-input bg-surface-card px-2 text-base"
            value={roleKey}
            aria-invalid={fields?.role_key ? true : undefined}
            aria-describedby={fields?.role_key ? 'invite-role-err' : undefined}
            onChange={(e) => setRoleKey(e.target.value)}
          >
            <option value="">Choose a role</option>
            {roles
              .filter((r) => r.key !== 'applicant')
              .map((r) => (
                <option key={r.key} value={r.key}>
                  {r.label}
                </option>
              ))}
          </select>
          {fields?.role_key ? (
            <span id="invite-role-err" className="text-sm text-error">
              {fields.role_key}
            </span>
          ) : null}
        </div>
      </div>
      <div>
        <Button type="submit" loading={busy} loadingLabel="Sending…">
          Send invitation
        </Button>
      </div>
    </form>
  )
}

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { UserPlus, X } from 'lucide-react'
import { Banner, Button, Dialog, RequiredTag, TextField } from '@/components'
import { ErrorState, ForbiddenState, LoadingState } from '@/components/states/States'
import { api } from '@/lib/api'
import type { AdminUser, CommandOutcome, RoleOption } from '@/lib/api/types'
import { useSession } from '@/lib/session'

const keys = { users: ['admin', 'users'] as const, roles: ['admin', 'roles'] as const }

type Result = { kind: 'idle' } | { kind: 'busy' } | { kind: 'ok'; message: string } | { kind: 'refused'; message: string; fields?: Record<string, string> } | { kind: 'unknown' }

/** Name | Email | Roles | Actions: the frame's columns, shared by the header row and each person's row from 768 px. */
const GRID = 'md:grid md:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)_minmax(0,1.4fr)_minmax(0,1.3fr)] md:items-center md:gap-4'

/**
 * T12 users and roles (IAM-01, ARC-01), laid out to Sandra's 21 Nov frames ("ceda administrator users +roles",
 * "ceda administrator invite user" in `Figma pdf/`): "ADMIN SETTINGS" over the title, "Invite user" opening the
 * invitation as a side sheet, and everyone registered in table-like rows (name, email, roles as removable chips,
 * actions). On phones each person stacks. The administrator's own row has the role controls disabled: "You can't
 * change your own roles." Every change is checked by the server (role.manage) and audited there.
 */
export function AdminUsersPage() {
  const { data: me } = useSession()
  const qc = useQueryClient()
  const users = useQuery({ queryKey: keys.users, queryFn: () => api.admin.listUsers() })
  const roles = useQuery({ queryKey: keys.roles, queryFn: () => api.admin.listRoles(), staleTime: 5 * 60_000 })
  const [result, setResult] = useState<Result>({ kind: 'idle' })
  const [revoking, setRevoking] = useState<{ user: AdminUser; role: string } | null>(null)
  const [reason, setReason] = useState('')
  const [inviting, setInviting] = useState(false)

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
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <p className="text-xs font-bold uppercase tracking-wider text-brand-text">Admin settings</p>
          <h1 className="text-h1 font-semibold">Users and roles</h1>
          <p className="text-ink-muted">Manage accounts and role-based access. Every change is recorded in the audit log.</p>
        </div>
        <Button
          icon={UserPlus}
          onClick={() => {
            if (result.kind === 'refused') setResult({ kind: 'idle' })
            setInviting(true)
          }}
        >
          Invite user
        </Button>
      </div>
      <div aria-live="polite">
        {result.kind === 'ok' ? <Banner kind="success">{result.message}</Banner> : null}
        {result.kind === 'refused' && !result.fields && !inviting ? <Banner kind="error">{result.message}</Banner> : null}
        {result.kind === 'unknown' ? <Banner kind="warning">We couldn&apos;t confirm the change. The list below shows what is saved; trying again is safe.</Banner> : null}
      </div>

      <section aria-labelledby="users-list" className="flex flex-col gap-2">
        <h2 id="users-list" className="text-sm font-semibold text-ink-muted">
          People ({users.data.length})
        </h2>
        <div className="overflow-hidden rounded-md border border-line bg-surface-card shadow-1">
          <div aria-hidden className={`hidden bg-surface-sunken px-4 py-3 text-xs font-semibold uppercase tracking-wide text-ink-muted ${GRID}`}>
            <span>Name</span>
            <span>Email</span>
            <span>Roles</span>
            <span>Actions</span>
          </div>
          <ul className="flex flex-col divide-y divide-line">
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
        </div>
      </section>

      {/* Sandra's frame: the workflow's public stages are fixed for the MVP (handoff decision #11), so nothing to edit. */}
      <section aria-labelledby="stages-h" className="flex flex-col gap-1 rounded-md border border-line bg-surface-card p-4 shadow-1">
        <h2 id="stages-h" className="text-h3 font-semibold">
          Case stages (fixed for this MVP)
        </h2>
        <p className="text-sm text-ink-muted">Submission · Review · Feedback · Approval · Award</p>
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

      <InviteSheet
        open={inviting}
        onOpenChange={setInviting}
        roles={roles.data}
        busy={result.kind === 'busy'}
        fields={result.kind === 'refused' ? result.fields : undefined}
        message={result.kind === 'refused' && !result.fields ? result.message : undefined}
        onInvite={async (i) => {
          const done = await act(() => api.admin.invite(i), `Invitation sent to ${i.email.trim()}.`)
          if (done) setInviting(false)
          return done
        }}
      />
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
    <li className={`flex flex-col gap-2 px-4 py-3 ${GRID}`} aria-label={u.full_name}>
      <div className="min-w-0">
        <p className="font-semibold">{u.full_name || 'No name'}</p>
        {u.organisation ? <p className="text-sm text-ink-muted">{u.organisation}</p> : null}
      </div>
      <p className="min-w-0 break-all text-sm text-ink-muted md:text-ink">{u.email ?? '—'}</p>
      <ul className="flex flex-wrap gap-2" aria-label={`Roles of ${u.full_name}`}>
        {u.roles.length === 0 ? <li className="text-sm text-ink-muted">No roles</li> : null}
        {u.roles.map((r) => (
          <li key={r} className="inline-flex items-center rounded-full bg-brand-subtle pl-3 text-sm font-semibold text-brand-text">
            {label(r)}
            {/* No disabled-reason text in the chip: the row itself says why (your own row) or the change is saving. */}
            <Button size="sm" variant="tertiary" icon={X} aria-label={`Remove ${label(r)} from ${u.full_name}`} disabled={self || busy} onClick={() => onRevoke(r)}>
              <span className="sr-only">Remove</span>
            </Button>
          </li>
        ))}
      </ul>
      {self ? (
        <p className="text-sm text-ink-muted">{why}</p>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <select
            className="min-h-touch min-w-0 flex-1 rounded-sm border border-line-input bg-surface-card px-2 text-base"
            value={add}
            onChange={(e) => setAdd(e.target.value)}
            aria-label={`Add a role to ${u.full_name}`}
          >
            <option value="">Choose a role</option>
            {free.map((r) => (
              <option key={r.key} value={r.key}>
                {r.label}
              </option>
            ))}
          </select>
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

/** "Invite user" as a side sheet (Sandra's invite frame). The invite-staff function takes one staff role. */
function InviteSheet({
  open,
  onOpenChange,
  roles,
  busy,
  fields,
  message,
  onInvite,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  roles: RoleOption[]
  busy: boolean
  fields?: Record<string, string>
  message?: string
  onInvite: (i: { email: string; fullName: string; roleKey: string }) => Promise<boolean>
}) {
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [roleKey, setRoleKey] = useState('')
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Invite staff"
      consequence="A time-limited invitation is sent to the email address."
      primaryLabel="Send invitation"
      busy={busy}
      audited
      onPrimary={async () => {
        if (await onInvite({ email, fullName, roleKey })) {
          setEmail('')
          setFullName('')
          setRoleKey('')
        }
      }}
    >
      {message ? <Banner kind="error">{message}</Banner> : null}
      <TextField id="invite-email" label="Email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} error={fields?.email} />
      <TextField id="invite-name" label="Full name" required value={fullName} onChange={(e) => setFullName(e.target.value)} error={fields?.full_name} />
      <div className="flex flex-col gap-1">
        <label htmlFor="invite-role" className="flex items-baseline font-semibold">
          Role <RequiredTag />
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
    </Dialog>
  )
}

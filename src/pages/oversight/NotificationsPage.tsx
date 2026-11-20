import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Banner, Button, NotificationItem } from '@/components'
import { EmptyState, ErrorState, LoadingState } from '@/components/states/States'
import { useMarkRead, useNotifications } from '@/features/oversight/queries'
import { api } from '@/lib/api'
import type { AppNotification, CommandOutcome } from '@/lib/api/types'
import { formatDateCAT } from '@/lib/format'
import { useSession } from '@/lib/session'

/**
 * T11 notification centre (spec T11, NTF-01), Provisional UI built from the written spec (BCR-003; design review
 * pending). The reader's own notifications, newest first, grouped by day (CAT), with All / Unread and
 * "Mark all as read". Opening one marks it read. Texts never include proposal content. "Email alerts" turns the
 * person's own e-mail alerts on or off (NTF-02, `set_alert_preference`, migration 015).
 */
export function NotificationsPage() {
  const { data: user } = useSession()
  const list = useNotifications()
  const mark = useMarkRead()
  const [filter, setFilter] = useState<'all' | 'unread'>('all')

  if (list.isPending) return <LoadingState what="notifications" />
  if (list.isError) return <ErrorState level="h1" message="We couldn't load your notifications." onRetry={() => void list.refetch()} />

  const unread = list.data.filter((n) => !n.read_at).length
  const shown = filter === 'unread' ? list.data.filter((n) => !n.read_at) : list.data
  const days = new Map<string, AppNotification[]>()
  for (const n of shown) days.set(formatDateCAT(n.created_at), [...(days.get(formatDateCAT(n.created_at)) ?? []), n])
  const applicant = user?.roles.length === 1 && user.roles[0] === 'applicant'
  const linkFor = (n: AppNotification) => (n.proposal_id ? (applicant ? `/ideas/${n.proposal_id}` : `/staff/cases/${n.proposal_id}`) : undefined)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-h1 font-semibold">Notifications</h1>
        <p className="text-ink-muted" role="status">
          {unread === 0 ? 'No unread notifications.' : `${unread} unread`}
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="group" aria-label="Show" className="flex gap-2">
          {(['all', 'unread'] as const).map((f) => (
            <Button key={f} size="sm" variant={filter === f ? 'primary' : 'secondary'} aria-pressed={filter === f} onClick={() => setFilter(f)}>
              {f === 'all' ? 'All' : 'Unread'}
            </Button>
          ))}
        </div>
        <Button size="sm" variant="tertiary" disabled={unread === 0} disabledReason="Nothing unread" loading={mark.busy} loadingLabel="Marking…" onClick={() => void mark.run(null)}>
          Mark all as read
        </Button>
      </div>
      {mark.error ? <Banner kind="error">{mark.error}</Banner> : null}
      {shown.length === 0 ? (
        <EmptyState title="You're all caught up.">{filter === 'unread' ? 'You have no unread notifications.' : 'Updates on your work appear here.'}</EmptyState>
      ) : (
        [...days.entries()].map(([day, items]) => (
          <section key={day} aria-labelledby={`ntf-${day.replace(/\W/g, '')}`} className="flex flex-col gap-1">
            <h2 id={`ntf-${day.replace(/\W/g, '')}`} className="text-sm font-semibold text-ink-muted">
              {day}
            </h2>
            <ul className="flex flex-col gap-1">
              {items.map((n) => (
                <li key={n.id}>
                  <NotificationItem title={n.title} body={n.body} createdAt={n.created_at} unread={!n.read_at} to={linkFor(n)} onOpen={n.read_at ? undefined : () => void mark.run([n.id])} />
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
      <AlertToggle applicant={Boolean(applicant)} />
    </div>
  )
}

/**
 * NTF-02 e-mail alerts (spec T11): a switch that saves as soon as it changes. Setting the same value twice is
 * harmless, so after a lost reply the setting is re-read and the switch shows what is saved.
 */
function AlertToggle({ applicant }: { applicant: boolean }) {
  const qc = useQueryClient()
  const pref = useQuery({ queryKey: ['oversight', 'alerts'], queryFn: () => api.oversight.alertPreference() })
  const [pending, setPending] = useState<boolean | null>(null)
  const [note, setNote] = useState<{ kind: 'ok' | 'error' | 'warning'; text: string } | null>(null)

  async function change(next: boolean) {
    setPending(next)
    setNote(null)
    let r: CommandOutcome<{ alerts_opt_in: boolean }>
    try {
      r = await api.oversight.setAlertPreference(next)
    } catch {
      r = { kind: 'unknown', requestKey: '' }
    }
    const saved = await qc.fetchQuery({ queryKey: ['oversight', 'alerts'], queryFn: () => api.oversight.alertPreference() }).catch(() => undefined)
    setPending(null)
    if (r.kind === 'ok') setNote({ kind: 'ok', text: next ? 'Saved: e-mail alerts are on.' : 'Saved: e-mail alerts are off.' })
    else if (r.kind === 'refused') setNote({ kind: 'error', text: r.message ?? 'Your setting was not changed.' })
    else if (saved === next) setNote({ kind: 'ok', text: next ? 'Saved: e-mail alerts are on.' : 'Saved: e-mail alerts are off.' })
    else setNote({ kind: 'warning', text: "We couldn't confirm the change. The switch shows what is saved; try again." })
  }

  const on = pending ?? pref.data ?? false
  return (
    <section aria-labelledby="alerts-h" className="flex flex-col gap-3 rounded-md bg-surface-card p-4 shadow-1">
      <h2 id="alerts-h" className="text-h2 font-semibold">
        Email alerts
      </h2>
      {pref.isError ? (
        <p className="text-ink-muted">We couldn&apos;t load your e-mail setting.</p>
      ) : (
        <div className="flex min-h-touch items-start gap-3">
          <input
            id="alerts-switch"
            type="checkbox"
            role="switch"
            className="mt-1 h-5 w-5 shrink-0"
            checked={on}
            aria-checked={on}
            aria-describedby="alerts-why"
            disabled={pref.isPending || pending !== null}
            onChange={(e) => void change(e.target.checked)}
          />
          <div className="flex flex-col">
            <label htmlFor="alerts-switch" className="font-semibold">
              {applicant ? "Email me when there's an update on my ideas (free)" : 'Email me when something needs my attention'}
            </label>
            <span id="alerts-why" className="text-sm text-ink-muted">
              Emails say an update is waiting; they never include your idea&apos;s content.
            </span>
          </div>
        </div>
      )}
      <div aria-live="polite">{note ? <Banner kind={note.kind === 'ok' ? 'success' : note.kind}>{note.text}</Banner> : null}</div>
      {/* No SMTP is connected for the demo in either mode (claim C-22: Simulated); remove only when one is. */}
      <Banner kind="demo">Email delivery is simulated in this demo.</Banner>
    </section>
  )
}

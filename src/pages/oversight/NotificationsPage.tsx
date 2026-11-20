import { useState } from 'react'
import { Banner, Button, NotificationItem } from '@/components'
import { EmptyState, ErrorState, LoadingState } from '@/components/states/States'
import { useMarkRead, useNotifications } from '@/features/oversight/queries'
import type { AppNotification } from '@/lib/api/types'
import { formatDateCAT } from '@/lib/format'
import { useSession } from '@/lib/session'

/**
 * T11 notification centre (spec T11, NTF-01), Provisional UI built from the written spec (BCR-003; design review
 * pending). The reader's own notifications, newest first, grouped by day (CAT), with All / Unread and
 * "Mark all as read". Opening one marks it read. Texts never include proposal content. The email alert toggle
 * (NTF-02) is not built yet.
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
    </div>
  )
}

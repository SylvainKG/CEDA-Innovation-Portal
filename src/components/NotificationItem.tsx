import { Link } from 'react-router-dom'
import { cn } from '@/lib/cn'
import { formatDateTimeCAT } from '@/lib/format'

export interface NotificationItemProps {
  title: string
  /** Short plain text; notifications never include proposal content (spec §7 T11). */
  body?: string
  /** Case reference, e.g. CEDA-2026-0009. */
  reference?: string
  createdAt: string
  unread: boolean
  /** Where the notification leads; without one (e.g. "Your access changed") it is plain text. */
  to?: string
  /** Called when the person opens it (marks it read). */
  onOpen?: () => void
}

export function NotificationItem({ title, body, reference, createdAt, unread, to, onOpen }: NotificationItemProps) {
  const cls = cn('flex min-h-touch gap-3 rounded-md p-3 text-ink no-underline', to && 'hover:bg-surface-sunken', unread && 'bg-brand-subtle')
  const inner = (
    <>
      <span aria-hidden className={cn('mt-2 h-2 w-2 shrink-0 rounded-full', unread ? 'bg-brand' : 'bg-transparent')} />
      <span className="flex min-w-0 flex-col">
        <span className={cn(unread && 'font-semibold')}>
          {unread ? <span className="sr-only">Unread: </span> : null}
          {title}
        </span>
        {body ? <span className="break-words text-sm">{body}</span> : null}
        <span className="text-sm text-ink-muted">
          {reference ? <span className="font-mono">{reference}</span> : null}
          {reference ? ' · ' : null}
          {formatDateTimeCAT(createdAt)}
        </span>
      </span>
    </>
  )
  // Without a link there is nothing to open: "Mark all as read" covers it.
  if (!to) return <div className={cls}>{inner}</div>
  return (
    <Link to={to} className={cls} onClick={onOpen}>
      {inner}
    </Link>
  )
}

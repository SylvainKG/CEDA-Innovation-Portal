import { Link } from 'react-router-dom'
import { cn } from '@/lib/cn'
import { formatDateTimeCAT } from '@/lib/format'

export interface NotificationItemProps {
  title: string
  /** Case reference, e.g. CEDA-2026-0009. Notifications never include proposal content (spec §7 T11). */
  reference?: string
  createdAt: string
  unread: boolean
  to: string
}

export function NotificationItem({ title, reference, createdAt, unread, to }: NotificationItemProps) {
  return (
    <Link
      to={to}
      className={cn(
        'flex min-h-touch gap-3 rounded-md p-3 text-ink no-underline hover:bg-surface-sunken',
        unread && 'bg-brand-subtle',
      )}
    >
      <span aria-hidden className={cn('mt-2 h-2 w-2 shrink-0 rounded-full', unread ? 'bg-brand' : 'bg-transparent')} />
      <span className="flex flex-col">
        <span className={cn(unread && 'font-semibold')}>
          {unread ? <span className="sr-only">Unread: </span> : null}
          {title}
        </span>
        <span className="text-sm text-ink-muted">
          {reference ? <span className="font-mono">{reference}</span> : null}
          {reference ? ' · ' : null}
          {formatDateTimeCAT(createdAt)}
        </span>
      </span>
    </Link>
  )
}

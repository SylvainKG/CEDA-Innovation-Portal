import { Bell } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMarkRead, useNotifications } from '@/features/oversight/queries'
import { cn } from '@/lib/cn'
import { timeAgo } from '@/lib/format'

/** How many of the newest notifications the panel shows; the rest are on the notifications page. */
const SHOWN = 5

/**
 * The bell (spec T11, NTF-01) opens a small notifications panel under it, on every signed-in dashboard. It lists
 * the reader's newest notifications (own rows only, from the same query as the notifications page, so the count
 * and the list always agree). Choosing one marks it read, closes the panel and opens the notifications page;
 * "View all notifications" does the same without marking anything.
 *
 * Accessibility: the bell is a button with the unread count in its name and `aria-expanded`; the panel is a
 * labelled, non-modal dialog. Focus moves to the panel when it opens; Escape, a click outside or choosing an item
 * closes it, and Escape returns focus to the bell. Every target is at least 44 px.
 */
export function NotificationsPanel() {
  const list = useNotifications()
  const mark = useMarkRead()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const box = useRef<HTMLDivElement>(null)
  const bell = useRef<HTMLButtonElement>(null)
  const panel = useRef<HTMLDivElement>(null)
  const headingId = useId()

  const items = list.data ?? []
  const unread = items.filter((n) => !n.read_at).length
  const name = unread ? `Notifications, ${unread} unread` : 'Notifications'

  useEffect(() => {
    if (!open) return
    panel.current?.focus()
    const onDown = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false)
        bell.current?.focus()
      }
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  function choose(id: string, isUnread: boolean) {
    setOpen(false)
    if (isUnread) void mark.run([id])
    navigate('/notifications')
  }

  return (
    <div ref={box} className="relative" data-print="hide">
      <button
        ref={bell}
        type="button"
        aria-label={name}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((v) => !v)}
        className="relative inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-line text-ink hover:bg-surface-sunken"
      >
        <Bell aria-hidden className="h-5 w-5" />
        {unread ? (
          <span aria-hidden className="absolute -right-1 -top-1 min-w-[1.25rem] rounded-full bg-brand px-1 text-center text-xs font-semibold leading-5 text-brand-on">
            {unread > 9 ? '9+' : unread}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          ref={panel}
          role="dialog"
          aria-labelledby={headingId}
          tabIndex={-1}
          className="fixed inset-x-4 top-16 z-40 flex max-h-[calc(100vh-5rem)] flex-col overflow-hidden rounded-md border border-line bg-surface-card shadow-2 outline-none md:absolute md:inset-x-auto md:right-0 md:top-full md:mt-2 md:w-96"
        >
          <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
            <h2 id={headingId} className="text-h3 font-semibold">
              Notifications
            </h2>
            <span className="text-sm text-ink-muted">{unread ? `${unread} unread` : 'All read'}</span>
          </div>

          {list.isPending ? (
            <p className="px-4 py-6 text-sm text-ink-muted">Loading notifications…</p>
          ) : list.isError ? (
            <p className="px-4 py-6 text-sm text-ink-muted">We couldn&apos;t load your notifications.</p>
          ) : items.length === 0 ? (
            <p className="px-4 py-6 text-sm text-ink-muted">You&apos;re all caught up.</p>
          ) : (
            <ul aria-label="Latest notifications" className="flex flex-col overflow-y-auto">
              {items.slice(0, SHOWN).map((n) => (
                <li key={n.id} className="border-b border-line last:border-b-0">
                  <button
                    type="button"
                    onClick={() => choose(n.id, !n.read_at)}
                    className={cn('flex min-h-touch w-full gap-3 px-4 py-3 text-left text-ink hover:bg-surface-sunken', !n.read_at && 'bg-brand-subtle')}
                  >
                    <span aria-hidden className={cn('mt-2 h-2 w-2 shrink-0 rounded-full', n.read_at ? 'bg-transparent' : 'bg-brand')} />
                    <span className="flex min-w-0 flex-col">
                      <span className={cn('break-words', !n.read_at && 'font-semibold')}>
                        {n.read_at ? null : <span className="sr-only">Unread: </span>}
                        {n.title}
                      </span>
                      {n.body ? <span className="line-clamp-2 break-words text-sm text-ink-muted">{n.body}</span> : null}
                      <span className="text-xs text-ink-muted">{timeAgo(n.created_at)}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="border-t border-line p-2">
            <Link
              to="/notifications"
              onClick={() => setOpen(false)}
              className="flex min-h-touch items-center justify-center rounded-md text-sm font-semibold text-brand-text no-underline hover:bg-surface-sunken"
            >
              View all notifications
              {items.length > SHOWN ? <span className="ml-1 font-normal text-ink-muted">({items.length})</span> : null}
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  )
}

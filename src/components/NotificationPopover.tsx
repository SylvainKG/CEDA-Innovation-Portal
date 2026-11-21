import { Bell } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Button } from './Button'
import { NotificationItem } from './NotificationItem'
import { useMarkRead, useNotifications } from '@/features/oversight/queries'
import { cn } from '@/lib/cn'
import type { AppNotification } from '@/lib/api/types'
import { useSession } from '@/lib/session'

/**
 * T11 notification popover (spec T11, NTF-01): the bell with unread badge opens a popover with the 10 latest
 * notifications, "Mark all as read", and "See all" link to the full page. Click outside or Esc closes it.
 * Built from spec (BCR-003; design review pending).
 */
export function NotificationPopover() {
  const { data: user } = useSession()
  const list = useNotifications()
  const mark = useMarkRead()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  const unread = (list.data ?? []).filter((n) => !n.read_at).length
  const name = unread ? `Notifications, ${unread} unread` : 'Notifications'
  const applicant = user?.roles.length === 1 && user?.roles[0] === 'applicant'
  const linkFor = (n: AppNotification) =>
    n.proposal_id ? (applicant ? `/ideas/${n.proposal_id}` : `/staff/cases/${n.proposal_id}`) : undefined

  // Close on click outside or Escape
  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent) {
        if (e.key === 'Escape') setOpen(false)
      } else {
        if (ref.current && !ref.current.contains(e.target as Node) && !buttonRef.current?.contains(e.target as Node)) {
          setOpen(false)
        }
      }
    }
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', close)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('keydown', close)
    }
  }, [open])

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-label={name}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen(!open)}
        className="relative inline-flex min-h-touch min-w-touch items-center justify-center gap-2 rounded-md px-2 text-ink hover:bg-surface-sunken"
      >
        <span className="relative inline-flex">
          <Bell aria-hidden className="h-5 w-5" />
          {unread ? (
            <span
              aria-hidden
              className="absolute -right-2 -top-2 min-w-[1.25rem] rounded-full bg-brand px-1 text-center text-xs font-semibold leading-5 text-brand-on"
            >
              {unread > 9 ? '9+' : unread}
            </span>
          ) : null}
        </span>
        <span aria-hidden className="hidden md:inline">
          Notifications
        </span>
      </button>

      {open ? (
        <div
          ref={ref}
          role="dialog"
          aria-label="Recent notifications"
          className="absolute right-0 top-full z-50 mt-2 flex w-96 max-w-[calc(100vw-2rem)] flex-col gap-3 rounded-md border border-line bg-surface-card p-4 shadow-2"
        >
          <div className="flex items-baseline justify-between gap-2">
            <h2 className="text-h3 font-semibold">Notifications</h2>
            {unread > 0 ? (
              <button
                type="button"
                onClick={() => {
                  void mark.run(null)
                  setOpen(false)
                }}
                disabled={mark.busy}
                className={cn(
                  'text-sm text-brand hover:underline',
                  mark.busy && 'cursor-not-allowed opacity-50'
                )}
              >
                {mark.busy ? 'Marking…' : 'Mark all as read'}
              </button>
            ) : null}
          </div>

          {list.isPending ? (
            <div className="flex items-center justify-center py-8 text-sm text-ink-muted">Loading…</div>
          ) : list.isError ? (
            <div className="flex flex-col items-center gap-2 py-8">
              <p className="text-sm text-error">Couldn't load notifications</p>
              <Button size="sm" variant="secondary" onClick={() => void list.refetch()}>
                Try again
              </Button>
            </div>
          ) : list.data.length === 0 ? (
            <div className="flex flex-col items-center gap-1 py-8 text-center">
              <p className="font-semibold">You're all caught up</p>
              <p className="text-sm text-ink-muted">Updates on your work appear here</p>
            </div>
          ) : (
            <ul className="flex max-h-96 flex-col gap-1 overflow-y-auto">
              {list.data.slice(0, 10).map((n) => (
                <li key={n.id}>
                  <NotificationItem
                    title={n.title}
                    body={n.body}
                    createdAt={n.created_at}
                    unread={!n.read_at}
                    to={linkFor(n)}
                    onOpen={
                      n.read_at
                        ? undefined
                        : () => {
                            void mark.run([n.id])
                            setOpen(false)
                          }
                    }
                  />
                </li>
              ))}
            </ul>
          )}

          <Link
            to="/notifications"
            onClick={() => setOpen(false)}
            className="inline-flex min-h-touch items-center justify-center rounded-md border border-line-input bg-surface-card px-3 py-2 text-center font-semibold hover:bg-surface-sunken"
          >
            See all notifications
          </Link>
        </div>
      ) : null}
    </div>
  )
}

import { useEffect, useState, type ReactNode } from 'react'
import { AlertTriangle, Clock, Inbox, Lock, RotateCcw, SearchX, WifiOff, type LucideIcon } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '../Button'

/** Shared frame for full-area states (spec §7 "Shared states"). */
function StateFrame({ icon: Icon, title, children, role }: { icon: LucideIcon; title: string; children?: ReactNode; role?: 'alert' | 'status' }) {
  return (
    <section role={role} className="mx-auto flex max-w-form flex-col items-center gap-3 rounded-md bg-surface-card p-8 text-center shadow-1">
      <Icon aria-hidden className="h-10 w-10 text-ink-muted" />
      <h2 className="text-h2 font-semibold">{title}</h2>
      {children}
    </section>
  )
}

/** Skeleton of the real layout, announced as "Loading {what}" (spec §7). */
export function LoadingState({ what, lines = 4 }: { what: string; lines?: number }) {
  return (
    <div aria-busy="true" className="flex flex-col gap-3">
      <span role="status" className="sr-only">
        Loading {what}
      </span>
      {Array.from({ length: lines }, (_, i) => (
        <div key={i} aria-hidden className="h-6 animate-pulse rounded-sm bg-surface-sunken" style={{ width: `${90 - i * 12}%` }} />
      ))}
    </div>
  )
}

export function EmptyState({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <StateFrame icon={Inbox} title={title}>
      {children ? <p className="text-ink-muted">{children}</p> : null}
      {action}
    </StateFrame>
  )
}

/** Error with a way forward. Input on forms is kept by the form itself; this frame never clears it. */
export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <StateFrame icon={AlertTriangle} title="Something went wrong" role="alert">
      <p className="text-ink">{message}</p>
      <div className="flex flex-wrap justify-center gap-3">
        {onRetry ? (
          <Button icon={RotateCcw} onClick={onRetry}>
            Try again
          </Button>
        ) : null}
        <Link to="/help/support" className="inline-flex min-h-touch items-center">
          Contact support
        </Link>
      </div>
    </StateFrame>
  )
}

/**
 * Forbidden (403). The copy never confirms that the record exists (spec §6).
 * Hiding a page is not the control: the server refuses the data.
 */
export function ForbiddenState({ home = '/' }: { home?: string }) {
  return (
    <StateFrame icon={Lock} title="You don't have access to this page">
      <p className="text-ink">If you think this is wrong, contact the portal administrator.</p>
      <Link to={home} className="inline-flex min-h-touch items-center">
        Go to my home
      </Link>
    </StateFrame>
  )
}

/** Not found (404): same layout as Forbidden so it cannot be used to probe whether a record exists. */
export function NotFoundState({ home = '/' }: { home?: string }) {
  return (
    <StateFrame icon={SearchX} title="We can't find this page">
      <p className="text-ink">Check the address, or go back to your home page.</p>
      <Link to={home} className="inline-flex min-h-touch items-center">
        Go to my home
      </Link>
    </StateFrame>
  )
}

/** Offline banner for forms (spec §7): work is kept on this device until the connection returns. */
export function OfflineBanner() {
  const [offline, setOffline] = useState(() => typeof navigator !== 'undefined' && navigator.onLine === false)
  useEffect(() => {
    const on = () => setOffline(false)
    const off = () => setOffline(true)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])
  if (!offline) return null
  return (
    <div role="status" className="flex items-center gap-2 rounded-md bg-warning-subtle p-3 text-ink">
      <WifiOff aria-hidden className="h-5 w-5 shrink-0 text-warning" />
      You're offline. Changes are saved on this device and will sync when you reconnect.
    </div>
  )
}

/**
 * Unknown outcome (BCR-001 A8; evidence skill principle 12): the request may or may not have reached the server.
 * Never says "Failed". The caller keeps the same request key and offers a status check.
 */
export function UnknownOutcomeBanner({ what, onCheckStatus, checking = false }: { what: string; onCheckStatus: () => void; checking?: boolean }) {
  return (
    <div role="status" className="flex flex-col gap-3 rounded-md bg-warning-subtle p-4 text-ink md:flex-row md:items-center md:justify-between">
      <span className="flex items-start gap-2">
        <Clock aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-warning" />
        <span>
          <strong>Not confirmed yet.</strong> We couldn't confirm that your {what} reached us. Your work is kept. Check the status before
          trying again.
        </span>
      </span>
      <Button variant="secondary" loading={checking} loadingLabel="Checking…" onClick={onCheckStatus}>
        Check status
      </Button>
    </div>
  )
}

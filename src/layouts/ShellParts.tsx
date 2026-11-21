import { LogOut } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import cedaLogo from '@/assets/ceda-logo.png'
import { DemoBadge } from '@/components/DemoBadge'
import { NotificationPopover } from '@/components/NotificationPopover'
import { apiMode } from '@/lib/api'
import { MOCK_ROLE_OPTIONS, mockRoleOf } from '@/lib/api/mock/session'
import type { Role } from '@/lib/api/types'
import { roleLabel } from '@/navigation/role-labels'
import { useSession, useSignOut, useSwitchDemoRole } from '@/lib/session'

export function SkipLink() {
  return (
    <a
      href="#main"
      className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-surface-card focus:p-3"
    >
      Skip to main content
    </a>
  )
}

export function Brand() {
  return (
    <Link to="/" className="flex min-h-touch items-center gap-3 font-bold text-ink no-underline">
      {/* Official CEDA logo, upscaled from the supplied 447 px PNG; replace with CEDA's vector file when available. */}
      {/* Figma: logo only, no text (21 Nov). Text stays in accessible name. */}
      <img src={cedaLogo} alt="CEDA Innovation Portal" width={1432} height={900} className="h-10 w-auto" />
    </Link>
  )
}

export function Footer() {
  return (
    <footer className="mt-12 border-t border-line bg-surface-card">
      <div className="mx-auto flex max-w-content flex-wrap items-center justify-between gap-4 px-4 py-4 text-sm">
        <span className="text-ink-muted">CEDA Innovation Portal · Demo prototype</span>
        <nav aria-label="Footer" className="flex flex-wrap items-center gap-x-4">
          <Link to="/privacy" className="inline-flex min-h-touch min-w-touch items-center text-ink no-underline hover:text-brand-text">Privacy</Link>
          <Link to="/help/support" className="inline-flex min-h-touch min-w-touch items-center text-ink no-underline hover:text-brand-text">Fault support</Link>
          <Link to="/help/faqs" className="inline-flex min-h-touch min-w-touch items-center text-ink no-underline hover:text-brand-text">FAQs</Link>
          <Link to="/help/contacts" className="inline-flex min-h-touch min-w-touch items-center text-ink no-underline hover:text-brand-text">Contacts</Link>
        </nav>
      </div>
    </footer>
  )
}

/**
 * The bell (spec T11, NTF-01): the unread count as a badge, opens a popover with 10 latest notifications.
 * Refreshed every 30 seconds and on returning to the tab. The accessible name says the count
 * ("Notifications, 3 unread"); the badge is only a visual repeat of it.
 */
export function NotificationsLink() {
  return <NotificationPopover />
}

/**
 * Mock mode only: lets the team preview each role's shell. Clearly labelled as not authentication.
 * Renders nothing outside mock mode.
 */
export function MockRoleSwitcher({ compact = false }: { compact?: boolean }) {
  const { data: user } = useSession()
  const switchRole = useSwitchDemoRole()
  if (apiMode !== 'mock') return null
  const current = mockRoleOf(user?.id)
  return (
    <label data-print="hide" className="flex items-center gap-2 text-sm">
      <span className={compact ? 'sr-only' : 'text-ink-muted'}>Mock session (development only)</span>
      <select
        className="min-h-touch rounded-sm border border-line-input bg-surface-card px-2 text-base"
        value={current ?? ''}
        onChange={(e) => switchRole.mutate((e.target.value || null) as Role | null)}
      >
        <option value="">Signed out</option>
        {MOCK_ROLE_OPTIONS.map((r) => (
          <option key={r} value={r}>
            {roleLabel(r)}
          </option>
        ))}
      </select>
    </label>
  )
}

export function TopBarEnd() {
  const { data: user } = useSession()
  return (
    <div className="flex shrink-0 items-center gap-1 md:gap-2">
      <DemoBadge />
      {user ? <NotificationsLink /> : null}
      {user ? <span className="hidden text-sm text-ink-muted lg:inline">{user.displayName}</span> : null}
      {user ? <SignOutButton /> : null}
    </div>
  )
}

/** Ends the session and makes this device forget the person's drafts, pending keys and cached data. */
function SignOutButton() {
  const signOut = useSignOut()
  const navigate = useNavigate()
  return (
    <button
      type="button"
      data-print="hide"
      disabled={signOut.isPending}
      onClick={() => {
        // Leave the signed-in page first, so its guard does not bounce to sign-in when the session ends.
        navigate('/')
        signOut.mutate()
      }}
      className="inline-flex min-h-touch min-w-touch shrink-0 items-center justify-center gap-2 rounded-md px-2 text-ink hover:bg-surface-sunken"
    >
      {/* Icon only below md, like Notifications, so the 360 px staff header does not scroll sideways (#47 e2e). */}
      <LogOut aria-hidden className="h-5 w-5" />
      <span className="sr-only md:not-sr-only">Sign out</span>
    </button>
  )
}

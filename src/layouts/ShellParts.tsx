import { Bell } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { DemoBadge } from '@/components/DemoBadge'
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
    <Link to="/" className="flex min-h-touch items-center gap-2 font-bold text-ink no-underline">
      <span aria-hidden className="inline-block h-6 w-6 rounded-sm bg-brand" />
      CEDA Innovation Portal
    </Link>
  )
}

export function Footer() {
  return (
    <footer className="mt-12 border-t border-line bg-surface-card">
      <nav aria-label="Footer" className="mx-auto flex max-w-content flex-wrap items-center gap-x-4 px-4 py-4 text-sm">
        <Link to="/privacy" className="inline-flex min-h-touch min-w-touch items-center">Privacy</Link>
        <Link to="/help/support" className="inline-flex min-h-touch min-w-touch items-center">Fault support</Link>
        <Link to="/help/faqs" className="inline-flex min-h-touch min-w-touch items-center">FAQs</Link>
        <Link to="/help/contacts" className="inline-flex min-h-touch min-w-touch items-center">Contacts</Link>
        <span className="text-ink-muted">Demonstration prototype with fictional data.</span>
      </nav>
    </footer>
  )
}

export function NotificationsLink() {
  return (
    <Link to="/notifications" className="inline-flex min-h-touch min-w-touch items-center justify-center gap-2 rounded-md px-2 text-ink no-underline hover:bg-surface-sunken">
      <Bell aria-hidden className="h-5 w-5" />
      <span className="hidden md:inline">Notifications</span>
      <span className="sr-only md:hidden">Notifications</span>
    </Link>
  )
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
    <div className="flex items-center gap-2">
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
      className="inline-flex min-h-touch min-w-touch items-center justify-center rounded-md px-2 text-sm text-ink hover:bg-surface-sunken"
    >
      Sign out
    </button>
  )
}

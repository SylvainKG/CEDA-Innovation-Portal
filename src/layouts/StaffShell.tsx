import { useState } from 'react'
import { Menu, ShieldCheck, X } from 'lucide-react'
import { NavLink, Outlet } from 'react-router-dom'
import { DemoBadge } from '@/components/DemoBadge'
import { navFor } from '@/navigation/nav-config'
import { roleLabel } from '@/navigation/role-labels'
import { useSession } from '@/lib/session'
import { cn } from '@/lib/cn'
import { Brand, Footer, MockRoleSwitcher, SkipLink, TopBarEnd } from './ShellParts'

function StaffNav({ onNavigate }: { onNavigate?: () => void }) {
  const { data: user } = useSession()
  const items = navFor(user?.roles ?? [])
  const main = user?.roles.find((r) => r !== 'auditor') ?? user?.roles[0]
  return (
    <div className="flex h-full flex-col gap-3">
      {main ? <p className="rounded-md bg-surface-sunken px-3 py-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">{roleLabel(main)} portal</p> : null}
      <ul className="flex flex-col gap-1">
        {items.map((item) => (
          <li key={item.to}>
            <NavLink
              to={item.to}
              end={item.to === '/staff'}
              onClick={onNavigate}
              className={({ isActive }) =>
                cn('flex min-h-touch items-center gap-3 rounded-md px-3 text-ink no-underline hover:bg-surface-sunken', isActive && 'bg-brand-subtle font-semibold')
              }
            >
              <item.icon aria-hidden className="h-5 w-5" />
              {item.label}
            </NavLink>
          </li>
        ))}
      </ul>
      <p className="mt-auto flex items-start gap-2 rounded-md bg-surface-sunken p-3 text-xs">
        <ShieldCheck aria-hidden className="h-5 w-5 shrink-0" />
        <span>
          <span className="block font-semibold">Restricted staff area</span>
          <span className="text-ink-muted">Actions are recorded</span>
        </span>
      </p>
    </div>
  )
}

/**
 * Staff shell (spec §4), laid out to Sandra's 21 Nov frames: the logo, the portal label and the navigation in a left
 * sidebar from 1024 px (a drawer below), the DEMO pill, bell and account menu across the top.
 */
export function StaffShell() {
  const [open, setOpen] = useState(false)
  return (
    <div className="flex min-h-screen flex-col">
      <SkipLink />
      <div className="flex flex-1">
        <div className="hidden w-60 shrink-0 flex-col gap-3 border-r border-line bg-surface-card p-3 lg:flex">
          <Brand />
          <nav aria-label="Staff" className="flex flex-1 flex-col">
            <StaffNav />
          </nav>
        </div>
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="border-b border-line bg-surface-card">
            <div className="flex items-center justify-between gap-2 px-4 py-2 md:gap-4">
              <div className="flex min-w-0 items-center gap-1 md:gap-3">
                <button
                  type="button"
                  className="inline-flex min-h-touch min-w-touch items-center justify-center rounded-md lg:hidden"
                  aria-expanded={open}
                  aria-controls="staff-drawer"
                  onClick={() => setOpen((v) => !v)}
                >
                  {open ? <X aria-hidden className="h-6 w-6" /> : <Menu aria-hidden className="h-6 w-6" />}
                  <span className="sr-only">{open ? 'Close navigation' : 'Open navigation'}</span>
                </button>
                <div className="lg:hidden">
                  <Brand />
                </div>
                <DemoBadge />
              </div>
              <TopBarEnd badge={false} />
            </div>
          </header>
          {open ? (
            <nav id="staff-drawer" aria-label="Staff" className="fixed inset-x-0 top-16 bottom-0 z-20 overflow-y-auto bg-surface-card p-3 lg:hidden">
              <StaffNav onNavigate={() => setOpen(false)} />
            </nav>
          ) : null}
          <main id="main" className="mx-auto w-full max-w-content flex-1 px-4 py-6">
            <Outlet />
          </main>
          <div className="mx-auto w-full max-w-content px-4">
            <MockRoleSwitcher />
          </div>
          <Footer />
        </div>
      </div>
    </div>
  )
}

import { useState } from 'react'
import { Menu, X } from 'lucide-react'
import { NavLink, Outlet } from 'react-router-dom'
import { navFor } from '@/navigation/nav-config'
import { useSession } from '@/lib/session'
import { cn } from '@/lib/cn'
import { Brand, Footer, MockRoleSwitcher, SkipLink, TopBarEnd } from './ShellParts'

function StaffNav({ onNavigate }: { onNavigate?: () => void }) {
  const { data: user } = useSession()
  const items = navFor(user?.roles ?? [])
  return (
    <ul className="flex flex-col gap-1">
      {items.map((item) => (
        <li key={item.to}>
          <NavLink
            to={item.to}
            end={item.to === '/staff'}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                'flex min-h-touch items-center gap-3 rounded-md px-3 text-ink no-underline hover:bg-surface-sunken',
                isActive && 'bg-brand-subtle font-semibold',
              )
            }
          >
            <item.icon aria-hidden className="h-5 w-5" />
            {item.label}
          </NavLink>
        </li>
      ))}
    </ul>
  )
}

/** Staff shell (spec §4): left side navigation from 1024 px; drawer navigation below. */
export function StaffShell() {
  const [open, setOpen] = useState(false)
  return (
    <div className="flex min-h-screen flex-col">
      <SkipLink />
      <header className="border-b border-line bg-surface-card">
        <div className="flex items-center justify-between gap-2 px-4 py-2 md:gap-4">
          <div className="flex min-w-0 items-center gap-1 md:gap-2">
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
            <Brand />
          </div>
          <TopBarEnd />
        </div>
      </header>
      <div className="flex flex-1">
        <nav aria-label="Staff" className="hidden w-60 shrink-0 border-r border-line bg-surface-card p-3 lg:block">
          <StaffNav />
        </nav>
        {open ? (
          <nav id="staff-drawer" aria-label="Staff" className="fixed inset-x-0 top-16 bottom-0 z-20 overflow-y-auto bg-surface-card p-3 lg:hidden">
            <StaffNav onNavigate={() => setOpen(false)} />
          </nav>
        ) : null}
        <div className="flex min-w-0 flex-1 flex-col">
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

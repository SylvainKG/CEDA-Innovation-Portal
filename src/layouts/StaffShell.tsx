import { useEffect, useState } from 'react'
import { Menu, ShieldCheck, X } from 'lucide-react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { navFor } from '@/navigation/nav-config'
import { roleLabel } from '@/navigation/role-labels'
import { useSession } from '@/lib/session'
import { cn } from '@/lib/cn'
import { Brand, Footer, MockRoleSwitcher, SignOutButton, SkipLink, TopBarEnd } from './ShellParts'
import { PeolwaneAssistant, PeolwaneSidebarLauncher } from '@/features/assistant/PeolwaneAssistant'
import { PageTransition } from './PageTransition'

/** A staff navigation item: the current one has an orange bar on its left edge, a tinted background and an orange icon. */
const itemClass = (active: boolean) =>
  cn(
    'relative flex min-h-touch items-center gap-3 rounded-md px-3 text-ink no-underline transition-colors hover:bg-surface-sunken',
    active && 'bg-brand-subtle font-semibold before:absolute before:inset-y-2 before:left-0 before:w-1 before:rounded-full before:bg-brand before:content-[""]',
  )

function StaffNav({ onNavigate }: { onNavigate?: () => void }) {
  const { data: user } = useSession()
  const { pathname } = useLocation()
  const items = navFor(user?.roles ?? [])
  const main = user?.roles.find((r) => r !== 'auditor') ?? user?.roles[0]
  return (
    <div className="flex h-full flex-col gap-3">
      {main ? <p className="px-3 pt-1 text-sm font-bold uppercase tracking-wider text-brand-text">{roleLabel(main)} portal</p> : null}
      <ul className="flex flex-col gap-1">
        {items.map((item) => {
          const content = (active: boolean) => (
            <>
              <item.icon aria-hidden className={cn('h-5 w-5 shrink-0', active ? 'text-brand-text' : 'text-ink-muted')} />
              {item.label}
            </>
          )
          // Settings spans several pages (challenges, rubrics, content, roles, chat), so it is current on any of them.
          const current = item.activeFor?.some((p) => pathname.startsWith(p)) ?? false
          return (
            <li key={item.to}>
              {item.activeFor ? (
                <Link to={item.to} onClick={onNavigate} aria-current={current ? 'page' : undefined} className={itemClass(current)}>
                  {content(current)}
                </Link>
              ) : (
                <NavLink to={item.to} end={item.to === '/staff'} onClick={onNavigate} className={({ isActive }) => itemClass(isActive)}>
                  {({ isActive }) => content(isActive)}
                </NavLink>
              )}
            </li>
          )
        })}
      </ul>
      <PeolwaneSidebarLauncher onOpen={onNavigate} />
      <div className="mt-auto flex flex-col gap-2 border-t border-line pt-3">
        <SignOutButton
          onSignOut={onNavigate}
          className="flex min-h-touch w-full items-center gap-3 rounded-md px-3 text-ink transition-colors hover:bg-surface-sunken [&>svg]:text-ink-muted"
        />
        <p className="flex items-start gap-2 rounded-md border border-line bg-surface-sunken p-3 text-sm">
          <ShieldCheck aria-hidden className="h-5 w-5 shrink-0 text-[var(--ceda-maroon)]" />
          <span>
            <span className="block font-semibold">Restricted staff area</span>
            <span className="text-ink-muted">Actions are recorded</span>
          </span>
        </p>
      </div>
    </div>
  )
}

/**
 * Staff shell (spec §4), laid out to Sandra's 21 Nov frames, tidied after the freeze (ABM, 22 Nov):
 *
 * - From 1024 px the logo, the portal label and the navigation sit in a left sidebar that stays in view as the page
 *   scrolls (sticky, full window height). Peolwane AI is an item under the navigation, and the panel opens beside
 *   the sidebar; Sign out and "Restricted staff area" sit at its foot (team, 23 Nov). The top bar (bell, and who is
 *   signed in) stays in view too.
 * - Below 1024 px a menu button opens the same navigation in a drawer from the left, over a dimmed page. It closes
 *   on a link, Escape, a tap outside it, or a change of page.
 * - The page fills at least the window, so the slim workspace footer starts below the fold.
 */
export function StaffShell() {
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()

  useEffect(() => setOpen(false), [pathname])
  useEffect(() => {
    if (!open) return undefined
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open])

  return (
    <div className="flex min-h-screen">
      <SkipLink />
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-line bg-surface-card lg:flex">
        <div className="flex h-16 shrink-0 items-center border-b border-line px-4">
          <Brand />
        </div>
        <nav aria-label="Staff" className="flex flex-1 flex-col overflow-y-auto p-3">
          <StaffNav />
        </nav>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 h-16 border-b border-line bg-[color-mix(in_srgb,var(--surface-card)_92%,transparent)] backdrop-blur-md">
          <div className="flex h-full items-center justify-between gap-2 px-4 md:gap-4">
            <div className="flex min-w-0 items-center gap-1 md:gap-3">
              <button
                type="button"
                className="inline-flex min-h-touch min-w-touch items-center justify-center rounded-full hover:bg-surface-sunken lg:hidden"
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
            </div>
            <TopBarEnd badge={false} accountMenu={false} />
          </div>
        </header>
        {open ? (
          <div className="fixed inset-x-0 bottom-0 top-16 z-20 lg:hidden">
            <button type="button" aria-hidden tabIndex={-1} className="absolute inset-0 h-full w-full bg-black/30" onClick={() => setOpen(false)} />
            <nav id="staff-drawer" aria-label="Staff" className="staff-drawer relative flex h-full w-72 max-w-[85vw] flex-col overflow-y-auto border-r border-line bg-surface-card p-3 shadow-2">
              <StaffNav onNavigate={() => setOpen(false)} />
            </nav>
          </div>
        ) : null}
        <main id="main" className="mx-auto min-h-[calc(100svh-4rem)] w-full max-w-content flex-1 px-4 py-6">
          <PageTransition>
            <Outlet />
          </PageTransition>
        </main>
        <div className="mx-auto w-full max-w-content px-4">
          <MockRoleSwitcher />
        </div>
        <Footer variant="app" />
        <PeolwaneAssistant placement="sidebar" />
      </div>
    </div>
  )
}

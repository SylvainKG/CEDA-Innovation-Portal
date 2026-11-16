import { useState } from 'react'
import { Menu, X } from 'lucide-react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import { Brand, Footer, MockRoleSwitcher, SkipLink, TopBarEnd } from './ShellParts'

const LINKS = [
  { to: '/challenges', label: 'Challenges' },
  { to: '/help/faqs', label: 'Help' },
]

/** Public shell (spec §4): top bar with Challenges, Help, Sign in, Register; menu drawer on mobile. */
export function PublicShell() {
  const [open, setOpen] = useState(false)
  return (
    <div className="flex min-h-screen flex-col">
      <SkipLink />
      <header className="border-b border-line bg-surface-card">
        <div className="mx-auto flex max-w-content items-center justify-between gap-4 px-4 py-2">
          <Brand />
          <nav aria-label="Main" className="hidden items-center gap-4 md:flex">
            {LINKS.map((l) => (
              <NavLink key={l.to} to={l.to} className="inline-flex min-h-touch min-w-touch items-center justify-center px-2 text-ink">
                {l.label}
              </NavLink>
            ))}
            <Link to="/auth/sign-in" className="inline-flex min-h-touch min-w-touch items-center justify-center px-2 text-ink">
              Sign in
            </Link>
            <Link to="/auth/register" className="inline-flex min-h-touch items-center rounded-md bg-brand px-4 font-semibold text-brand-on no-underline">
              Register
            </Link>
          </nav>
          <div className="flex items-center gap-2">
            <TopBarEnd />
            <button
              type="button"
              className="inline-flex min-h-touch min-w-touch items-center justify-center rounded-md md:hidden"
              aria-expanded={open}
              aria-controls="public-menu"
              onClick={() => setOpen((v) => !v)}
            >
              {open ? <X aria-hidden className="h-6 w-6" /> : <Menu aria-hidden className="h-6 w-6" />}
              <span className="sr-only">{open ? 'Close menu' : 'Open menu'}</span>
            </button>
          </div>
        </div>
        {open ? (
          <nav id="public-menu" aria-label="Main" className="flex flex-col border-t border-line px-4 py-2 md:hidden">
            {[...LINKS, { to: '/auth/sign-in', label: 'Sign in' }, { to: '/auth/register', label: 'Register' }].map((l) => (
              <NavLink key={l.to} to={l.to} className="inline-flex min-h-touch min-w-touch items-center justify-center px-2 text-ink" onClick={() => setOpen(false)}>
                {l.label}
              </NavLink>
            ))}
          </nav>
        ) : null}
      </header>
      <main id="main" className="mx-auto w-full max-w-content flex-1 px-4 py-6">
        <Outlet />
      </main>
      <div className="mx-auto w-full max-w-content px-4">
        <MockRoleSwitcher />
      </div>
      <Footer />
    </div>
  )
}

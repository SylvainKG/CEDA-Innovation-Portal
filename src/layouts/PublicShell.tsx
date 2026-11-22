import { useState } from 'react'
import { Menu, X } from 'lucide-react'
import { ButtonLink } from '@/components/ButtonLink'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { cn } from '@/lib/cn'
import { Brand, Footer, MockRoleSwitcher, SkipLink, TopBarEnd } from './ShellParts'
import { useSession } from '@/lib/session'
import { PeolwaneAssistant } from '@/features/assistant/PeolwaneAssistant'

const LINKS = [
  { to: '/challenges', label: 'Challenges' },
  { to: '/#how-it-works', label: 'How it works' },
  { to: '/help/faqs', label: 'FAQs' },
]

/**
 * Public shell (spec §4), laid out to Sandra's home page reference: Challenges, How it works and FAQs, then
 * "Sign in" and "Submit an innovation"; a menu drawer below 1280 px, where the logo, the DEMO pill and five links don't fit on one line. The home page runs full width (its bands span
 * the screen); every other page keeps the content column.
 *
 * Styled like the applicant header and Sandra's 21 Nov sign-in frame: the DEMO pill beside the logo, bold text links
 * without underlines (the current page orange and underlined), and labels that never wrap onto two lines.
 */
const linkCls = (active: boolean) =>
  cn(
    'inline-flex min-h-touch min-w-touch items-center justify-center whitespace-nowrap px-1.5 font-semibold no-underline',
    active ? 'text-brand-text underline decoration-2 underline-offset-8' : 'text-ink hover:text-brand-text',
  )

export function PublicShell() {
  const [open, setOpen] = useState(false)
  const home = useLocation().pathname === '/'
  // A signed-in person (e.g. on two-step sign-in) has the account menu instead of "Sign in" / "Submit an innovation".
  const { data: user } = useSession()
  return (
    <div className="flex min-h-screen flex-col">
      <SkipLink />
      <header className="border-b border-line bg-surface-card">
        <div className="mx-auto flex max-w-content items-center justify-between gap-4 px-4 py-2">
          <div className="flex shrink-0 items-center gap-3">
            <Brand />
          </div>
          <nav aria-label="Main" className="hidden items-center gap-1 xl:flex">
            {LINKS.map((l) => (
              // "How it works" is a section of the home page, so it is never marked as the current page.
              <NavLink key={l.to} to={l.to} className={({ isActive }) => linkCls(isActive && !l.to.includes('#'))}>
                {l.label}
              </NavLink>
            ))}
            {user ? null : (
              <>
                <ButtonLink to="/auth/sign-in" variant="secondary" className="ml-1 whitespace-nowrap !border-brand !text-brand-text">
                  Sign in
                </ButtonLink>
                <ButtonLink to="/auth/register" variant="secondary" className="whitespace-nowrap !border-brand !text-brand-text">
                  Submit an innovation
                </ButtonLink>
              </>
            )}
          </nav>
          <div className="flex items-center gap-2">
            <TopBarEnd badge={false} />
            <button
              type="button"
              className="inline-flex min-h-touch min-w-touch items-center justify-center rounded-md xl:hidden"
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
          <nav id="public-menu" aria-label="Main" className="flex flex-col border-t border-line px-4 py-2 xl:hidden">
            {[...LINKS, ...(user ? [] : [{ to: '/auth/sign-in', label: 'Sign in' }, { to: '/auth/register', label: 'Submit an innovation' }])].map((l) => (
              <NavLink key={l.to} to={l.to} className="inline-flex min-h-touch min-w-touch items-center justify-center px-2 text-ink" onClick={() => setOpen(false)}>
                {l.label}
              </NavLink>
            ))}
          </nav>
        ) : null}
      </header>
      <main id="main" className={home ? 'w-full flex-1' : 'mx-auto w-full max-w-content flex-1 px-4 py-6'}>
        <Outlet />
      </main>
      <div className="mx-auto w-full max-w-content px-4">
        <MockRoleSwitcher />
      </div>
      <Footer chatSpace />
      <PeolwaneAssistant />
    </div>
  )
}

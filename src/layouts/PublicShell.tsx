import { useEffect, useState } from 'react'
import { ExternalLink, Mail, Menu, Phone, X } from 'lucide-react'
import { ButtonLink } from '@/components/ButtonLink'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { CEDA, telHref } from '@/brand/ceda-info'
import { cn } from '@/lib/cn'
import { Brand, Footer, MockRoleSwitcher, SkipLink, TopBarEnd } from './ShellParts'
import { useSession } from '@/lib/session'
import { homeFor } from '@/navigation/nav-config'
import { PeolwaneAssistant } from '@/features/assistant/PeolwaneAssistant'
import { PageTransition } from './PageTransition'

const LINKS = [
  { to: '/challenges', label: 'Challenges' },
  { to: '/how-it-works', label: 'How it works' },
  { to: '/about', label: 'About Us' },
  { to: '/help/contacts', label: 'Contact' },
]

/** People choose a challenge before starting an idea; the challenge brief explains the next step. */
const SUBMIT_TO = '/challenges'

/** Scrolled past the contact strip (desktop), so the bar floats as a pill. */
const FLOAT_AFTER = 44
/** A thumb's small wobble doesn't close the phone menu; a real scroll does. */
const SCROLL_TO_CLOSE = 10

function useScrolledPast(threshold: number) {
  const [past, setPast] = useState(() => typeof window !== 'undefined' && window.scrollY > threshold)
  useEffect(() => {
    let ticking = false
    const update = () => {
      setPast(window.scrollY > threshold)
      ticking = false
    }
    const onScroll = () => {
      if (!ticking) {
        ticking = true
        window.requestAnimationFrame(update)
      }
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [threshold])
  return past
}

/**
 * Public shell (spec §4). Post-freeze navigation (ABM, acting design lead, 22 Nov; not part of the judged build):
 *
 * - A slim strip with CEDA's global contact details (toll-free line, email, main website) above the bar from
 *   1024 px. It scrolls away with the page.
 * - The bar stays at the top. Once the page scrolls, it lifts into a floating, rounded, frosted bar with a soft
 *   shadow, the effect used on the First Minds website, in Peolwane's colours. Without motion (reduced-motion
 *   setting) it changes at once.
 * - Links: Challenges, How it works, About Us and Contact, with an orange underline that grows on hover and stays on
 *   the current page. FAQs remain in the footer. The Peolwane logo returns Home. "Sign in" is a quiet text link; "Browse challenges" is
 *   the one filled button.
 * - Below 1024 px a menu button opens a panel with the same links, both actions and the contact details. The panel
 *   closes on a link, Escape, a tap outside it, or as soon as the page scrolls.
 *
 * A signed-in person (e.g. on two-step sign-in) has the account menu instead of the sign-in and browse actions.
 */
export function PublicShell() {
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()
  const home = pathname === '/'
  // The home page and How it works run their heroes edge to edge, so they lay out their own width (team, 23 Nov).
  const fullWidth = home || pathname === '/how-it-works'
  const floating = useScrolledPast(FLOAT_AFTER)
  const { data: user } = useSession()
  // A signed-in person on a public page (the home page) gets one button back to their own workspace; not mid-sign-in.
  const workspace =
    user && !pathname.startsWith('/auth/') ? { to: homeFor(user.roles), label: user.roles.includes('applicant') ? 'My ideas' : 'My workspace' } : null

  // The panel closes when the page changes...
  useEffect(() => setOpen(false), [pathname])

  // ...and gets out of the way on a scroll, a tap outside it, or Escape.
  useEffect(() => {
    if (!open) return undefined
    const close = () => setOpen(false)
    const startY = window.scrollY
    const onScroll = () => {
      if (Math.abs(window.scrollY - startY) > SCROLL_TO_CLOSE) close()
    }
    const onPointerDown = (e: PointerEvent) => {
      if (!(e.target instanceof Element) || !e.target.closest('#public-menu, [aria-controls="public-menu"]')) close()
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('scroll', onScroll)
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  return (
    <div className="flex min-h-screen flex-col">
      <SkipLink />
      <ContactStrip />
      <header className={cn('site-nav shell-header', floating && 'site-nav--floating')}>
        <div className="site-nav__bar">
          <div className="mx-auto flex max-w-content items-center justify-between gap-4 px-4 py-2">
            <div className="flex shrink-0 items-center gap-3">
              <Brand />
            </div>
            <nav aria-label="Main" className="hidden items-center gap-1 lg:flex">
              {LINKS.map((l) => (
                <NavLink key={l.to} to={l.to} className={({ isActive }) => cn('site-nav__link', isActive && 'site-nav__link--active')}>
                  {l.label}
                </NavLink>
              ))}
            </nav>
            <div className="flex items-center gap-2">
              {user ? null : (
                <>
                  <Link to="/auth/sign-in" className="site-nav__link hidden lg:inline-flex">
                    Sign in
                  </Link>
                  <ButtonLink to={SUBMIT_TO} className="hidden whitespace-nowrap !rounded-full md:inline-flex">
                    Browse challenges
                  </ButtonLink>
                </>
              )}
              {workspace ? (
                <ButtonLink to={workspace.to} className="hidden whitespace-nowrap !rounded-full md:inline-flex">
                  {workspace.label}
                </ButtonLink>
              ) : null}
              <TopBarEnd badge={false} />
              <button
                type="button"
                className="inline-flex min-h-touch min-w-touch items-center justify-center rounded-full hover:bg-surface-sunken lg:hidden"
                aria-expanded={open}
                aria-controls="public-menu"
                onClick={() => setOpen((v) => !v)}
              >
                {open ? <X aria-hidden className="h-6 w-6" /> : <Menu aria-hidden className="h-6 w-6" />}
                <span className="sr-only">{open ? 'Close menu' : 'Open menu'}</span>
              </button>
            </div>
          </div>
        </div>
        {open ? (
          <div id="public-menu" className="site-nav__panel lg:hidden">
            <nav aria-label="Main" className="flex flex-col">
              {LINKS.map((l) => (
                <NavLink
                  key={l.to}
                  to={l.to}
                  className={({ isActive }) =>
                    cn(
                      'flex min-h-touch items-center rounded-md px-3 font-semibold no-underline hover:bg-surface-sunken',
                      isActive ? 'text-brand-text' : 'text-ink',
                    )
                  }
                  onClick={() => setOpen(false)}
                >
                  {l.label}
                </NavLink>
              ))}
            </nav>
            {user ? null : (
              <div className="flex flex-col gap-2 border-t border-line pt-3">
                <ButtonLink to={SUBMIT_TO} className="w-full !rounded-full" onClick={() => setOpen(false)}>
                  Browse challenges
                </ButtonLink>
                <ButtonLink to="/auth/sign-in" variant="secondary" className="w-full !rounded-full" onClick={() => setOpen(false)}>
                  Sign in
                </ButtonLink>
              </div>
            )}
            {workspace ? (
              <div className="flex flex-col gap-2 border-t border-line pt-3">
                <ButtonLink to={workspace.to} className="w-full !rounded-full" onClick={() => setOpen(false)}>
                  {workspace.label}
                </ButtonLink>
              </div>
            ) : null}
            <ContactLinks className="flex flex-col border-t border-line pt-2 text-sm" />
          </div>
        ) : null}
      </header>
      {/* Every page fills at least the window below the navigation, so the footer always starts below the fold. */}
      <main id="main" className={fullWidth ? 'w-full flex-1' : 'mx-auto min-h-[calc(100svh-4rem)] w-full max-w-content flex-1 px-4 py-6 lg:min-h-[calc(100svh-6.75rem)]'}>
        <PageTransition>
          <Outlet />
        </PageTransition>
      </main>
      <div className="mx-auto w-full max-w-content px-4 pt-4">
        <MockRoleSwitcher />
      </div>
      <Footer chatSpace />
      <PeolwaneAssistant />
    </div>
  )
}

/** CEDA's global contact details (real, from `src/brand/ceda-info.ts`), in the strip and the phone menu. */
function ContactLinks({ className }: { className?: string }) {
  const item = 'inline-flex min-h-touch items-center gap-2 text-ink-muted no-underline hover:text-brand-text'
  return (
    <div className={className}>
      <a href={telHref(CEDA.headOffice.tollFree)} className={item}>
        <Phone aria-hidden className="h-4 w-4" />
        Toll-free {CEDA.headOffice.tollFree}
      </a>
      <a href={`mailto:${CEDA.headOffice.email}`} className={item}>
        <Mail aria-hidden className="h-4 w-4" />
        {CEDA.headOffice.email}
      </a>
      <a href={CEDA.website} target="_blank" rel="noopener noreferrer" className={item}>
        <ExternalLink aria-hidden className="h-4 w-4" />
        {CEDA.shortName} website<span className="sr-only"> (opens in a new tab)</span>
      </a>
    </div>
  )
}

function ContactStrip() {
  return (
    <div className="hidden border-b border-line bg-surface-sunken text-sm lg:block" data-print="hide">
      <div className="mx-auto flex max-w-content items-center justify-between gap-6 px-4">
        <p className="text-ink-muted">
          {CEDA.name} ({CEDA.shortName}), Botswana
        </p>
        <ContactLinks className="flex items-center gap-5" />
      </div>
    </div>
  )
}

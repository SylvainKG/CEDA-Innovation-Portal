import { useEffect, useRef, useState } from 'react'
import { ArrowUp, Bell, ExternalLink, LogOut, Mail, MapPin, MessageSquare, Phone } from 'lucide-react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { BRANDS, brand } from '@/brand'
import { HorizonEdge } from '@/brand/Horizon'
import { CEDA, telHref } from '@/brand/ceda-info'
import { DemoBadge } from '@/components/DemoBadge'
import { useNotifications } from '@/features/oversight/queries'
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
      {/* The mark and names come from src/brand (one place to change the brand). */}
      <img src={brand.mark.src} alt="" width={brand.mark.width} height={brand.mark.height} className="h-10 w-auto" />
      {/* Read out as the full name at every width; the text shows from 768 px so it can't collide with the DEMO badge. */}
      <span className="sr-only">{brand.fullName}</span>
      <span aria-hidden className="hidden flex-col leading-tight md:flex">
        <span>{brand.header.title}</span>
        {brand.header.subtitle ? <span className="text-sm font-normal text-ink-muted">{brand.header.subtitle}</span> : null}
      </span>
    </Link>
  )
}

/** Footer links that the navigation doesn't already give (Challenges, How it works and Contact are up there). */
const FOOTER_LINKS = [
  { to: '/help/faqs', label: 'FAQs' },
  { to: '/help/support', label: 'Fault support' },
  { to: '/privacy', label: 'Privacy' },
]

/**
 * Footer. Post-freeze design (ABM, 22 Nov; not the judged build), on CEDA's sunrise: the land from the home page's
 * hero rises across the top and settles into CEDA's deep brown, so every page closes on the same horizon. Three
 * columns from 1024 px: Peolwane as a CEDA product (CEDA's logo on a white tile, a link to CEDA's main website);
 * CEDA's head office with its phone numbers and email, and CEDA's offices; and help (FAQs, fault support, privacy,
 * Peolwane AI). Links already in the navigation aren't repeated. `chatSpace` keeps the bottom row clear of the floating
 * buttons ("Peolwane AI" on every page, "Chat with CEDA" on applicant pages). CEDA's details come from
 * `src/brand/ceda-info.ts`; the team's 21 Nov decision stands: Peolwane is a CEDA product.
 */
export function Footer({ chatSpace = false }: { chatSpace?: boolean }) {
  const link = 'inline-flex min-h-touch items-center gap-2 text-white no-underline hover:text-[var(--ceda-gold)] hover:underline'
  const heading = 'text-xs font-bold uppercase tracking-wider text-[var(--ceda-gold)]'
  const toTop = () => {
    const reduce = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' })
  }
  return (
    <footer className="mt-12 text-sm" data-print="hide">
      <HorizonEdge className="block h-16 w-full md:h-24" />
      {/* Always dark (CEDA's night brown); white on it is above 15:1, the muted text above 9:1. */}
      <div className="bg-[var(--ceda-night)] text-[#e9dcd5]">
        <div className="mx-auto grid max-w-content grid-cols-1 gap-8 px-4 pb-8 pt-4 md:grid-cols-2 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1fr)]">
          <section aria-labelledby="footer-about" className="flex flex-col gap-3">
            <span className="self-start rounded-md bg-white p-2.5 shadow-1">
              <img src={BRANDS.ceda.logo.src} alt={`${CEDA.name} (${CEDA.shortName})`} width={BRANDS.ceda.logo.width} height={BRANDS.ceda.logo.height} className="h-12 w-auto" />
            </span>
            <h2 id="footer-about" className="text-base font-semibold text-white">
              {brand.header.title} · a {CEDA.shortName} product
            </h2>
            <p>
              The innovation portal of the {CEDA.name} ({CEDA.shortName}), Botswana: answer CEDA&apos;s challenges with your ideas and follow them from
              submission to award.
            </p>
            <a href={CEDA.website} target="_blank" rel="noopener noreferrer" className={link}>
              <ExternalLink aria-hidden className="h-4 w-4 shrink-0" />
              Visit {CEDA.shortName}&apos;s main website (www.ceda.co.bw)<span className="sr-only"> (opens in a new tab)</span>
            </a>
          </section>
          <section aria-labelledby="footer-office" className="flex flex-col gap-2">
            <h2 id="footer-office" className={heading}>
              {CEDA.shortName} head office
            </h2>
            <address className="flex gap-2 not-italic">
              <MapPin aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-[var(--ceda-gold)]" />
              <span>
                {CEDA.headOffice.lines.map((l) => (
                  <span key={l} className="block">
                    {l}
                  </span>
                ))}
                <span className="block">{CEDA.headOffice.postal}</span>
              </span>
            </address>
            <a href={telHref(CEDA.headOffice.phone)} className={link}>
              <Phone aria-hidden className="h-4 w-4 shrink-0 text-[var(--ceda-gold)]" />
              Tel {CEDA.headOffice.phone}
            </a>
            <a href={telHref(CEDA.headOffice.tollFree)} className={link}>
              <Phone aria-hidden className="h-4 w-4 shrink-0 text-[var(--ceda-gold)]" />
              Toll-free {CEDA.headOffice.tollFree}
            </a>
            <a href={`mailto:${CEDA.headOffice.email}`} className={`${link} break-all`}>
              <Mail aria-hidden className="h-4 w-4 shrink-0 text-[var(--ceda-gold)]" />
              {CEDA.headOffice.email}
            </a>
            <p className="mt-1">{CEDA.shortName} has offices across Botswana.</p>
            <a href={CEDA.contactPage} target="_blank" rel="noopener noreferrer" className={link}>
              <ExternalLink aria-hidden className="h-4 w-4 shrink-0" />
              Addresses and phone numbers on ceda.co.bw<span className="sr-only"> (opens in a new tab)</span>
            </a>
          </section>
          <section aria-labelledby="footer-help" className="flex flex-col gap-2">
            <h2 id="footer-help" className={heading}>
              Help
            </h2>
            <nav aria-label="Footer" className="flex flex-col">
              {FOOTER_LINKS.map((l) => (
                <Link key={l.to} to={l.to} className={link}>
                  {l.label}
                </Link>
              ))}
            </nav>
            <p className="mt-1">Questions about using the portal? Ask Peolwane AI, the assistant at the bottom right of every page.</p>
          </section>
        </div>
        <div className="border-t border-white/15">
          <div className={`mx-auto flex max-w-content flex-wrap items-center justify-between gap-x-6 gap-y-1 px-4 py-3 ${chatSpace ? 'md:pr-56' : ''}`}>
            <p className="flex flex-wrap gap-x-2">
              <span>© {new Date().getFullYear()} {CEDA.shortName}</span>
              <span>{brand.fullName} · Demo prototype with fictional data</span>
            </p>
            <button type="button" onClick={toTop} className="inline-flex min-h-touch items-center gap-2 font-semibold text-white hover:text-[var(--ceda-gold)]">
              <ArrowUp aria-hidden className="h-4 w-4" />
              Back to top
            </button>
          </div>
        </div>
      </div>
    </footer>
  )
}

/**
 * The bell (spec T11, NTF-01): the unread count as a badge, refreshed every 30 seconds and on returning to the tab.
 * The accessible name says the count ("Notifications, 3 unread"); the badge is only a visual repeat of it.
 */
export function NotificationsLink() {
  const list = useNotifications()
  const unread = (list.data ?? []).filter((n) => !n.read_at).length
  const name = unread ? `Notifications, ${unread} unread` : 'Notifications'
  return (
    // A round bell button (Sandra's 21 Nov frames); the touch target stays 44 × 44 px.
    <Link
      to="/notifications"
      aria-label={name}
      className="relative inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-line text-ink no-underline hover:bg-surface-sunken"
    >
      <Bell aria-hidden className="h-5 w-5" />
      {unread ? (
        <span aria-hidden className="absolute -right-1 -top-1 min-w-[1.25rem] rounded-full bg-brand px-1 text-center text-xs font-semibold leading-5 text-brand-on">
          {unread > 9 ? '9+' : unread}
        </span>
      ) : null}
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

/** The right end of a signed-in header: the bell and the account menu. `badge` keeps the DEMO pill here (public shell). */
export function TopBarEnd({ badge = false }: { badge?: boolean }) {
  const { data: user } = useSession()
  return (
    <div className="flex shrink-0 items-center gap-2 md:gap-3">
      {badge ? <DemoBadge /> : null}
      {user ? <NotificationsLink /> : null}
      {user ? <AccountMenu /> : null}
    </div>
  )
}

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter((w) => /^[A-Za-z]/.test(w))
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('') || '?'

/**
 * The avatar with the person's initials, name and role (Sandra's 21 Nov frames). It opens a small menu with
 * Sign out (decision #19, provisional default: "Put Sign out in a menu on the avatar"). Escape or a click
 * outside closes it.
 */
function AccountMenu() {
  const { data: user } = useSession()
  const [open, setOpen] = useState(false)
  const box = useRef<HTMLDivElement>(null)
  const button = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false)
        button.current?.focus()
      }
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])
  if (!user) return null
  const subtitle = user.roles.length ? roleLabel(user.roles.find((r) => r !== 'auditor') ?? user.roles[0]!) : ''
  return (
    <div ref={box} className="relative" data-print="hide">
      <button
        ref={button}
        type="button"
        aria-expanded={open}
        aria-controls="account-menu"
        aria-label={`Account: ${user.displayName}`}
        onClick={() => setOpen((v) => !v)}
        className="flex min-h-touch items-center gap-2 rounded-full pr-1 text-left text-ink hover:bg-surface-sunken md:pr-3"
      >
        <span aria-hidden className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ink text-sm font-semibold text-surface-card">
          {initials(user.displayName)}
        </span>
        <span aria-hidden className="hidden max-w-[11rem] flex-col leading-tight lg:flex">
          <span className="truncate text-sm font-semibold">{user.displayName}</span>
          <span className="truncate text-xs text-ink-muted">{subtitle}</span>
        </span>
      </button>
      {open ? (
        <div id="account-menu" className="absolute right-0 top-full z-30 mt-2 w-56 rounded-md border border-line bg-surface-card p-2 shadow-1">
          <p className="px-2 py-1 text-sm font-semibold">{user.displayName}</p>
          {subtitle ? <p className="px-2 pb-2 text-xs text-ink-muted">{subtitle}</p> : null}
          <SignOutButton />
        </div>
      ) : null}
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
      className="flex min-h-touch w-full items-center gap-2 rounded-md px-2 text-ink hover:bg-surface-sunken"
    >
      <LogOut aria-hidden className="h-5 w-5" />
      Sign out
    </button>
  )
}

/**
 * The floating "Chat with CEDA" button (Sandra's 21 Nov frames), for applicants. Hidden on the chat page itself.
 * On phones it sits above the bottom navigation.
 */
export function ChatLauncher() {
  const { pathname } = useLocation()
  if (pathname.startsWith('/support/chat')) return null
  return (
    <Link
      to="/support/chat"
      data-print="hide"
      className="fixed bottom-24 right-4 z-20 inline-flex min-h-touch items-center gap-2 rounded-full bg-[#333333] px-4 font-semibold text-white no-underline shadow-1 hover:bg-black md:bottom-6"
    >
      <MessageSquare aria-hidden className="h-5 w-5" />
      Chat with CEDA
    </Link>
  )
}

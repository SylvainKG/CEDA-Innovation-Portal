import { NavLink, Outlet } from 'react-router-dom'
import { APPLICANT_NAV } from '@/navigation/nav-config'
import { cn } from '@/lib/cn'
import { Brand, ChatLauncher, Footer, MockRoleSwitcher, SkipLink, TopBarEnd } from './ShellParts'
import { PeolwaneAssistant } from '@/features/assistant/PeolwaneAssistant'
import { PageTransition } from './PageTransition'

/**
 * Applicant shell (spec §4), laid out to Sandra's 21 Nov frames, tidied after the freeze (ABM, 22 Nov): the logo
 * (back to My ideas), text links with the public site's orange underline on the current one, the bell and the
 * account menu, in a bar that stays at the top as the page scrolls; the floating "Chat with CEDA" button; bottom
 * navigation on phones. Challenges, challenge briefs and help open inside this shell too (see SiteShell), so an
 * applicant never drops back to the public navigation. The page fills at least the window, so the slim workspace
 * footer starts below the fold.
 */
export function ApplicantShell() {
  return (
    <div className="flex min-h-screen flex-col pb-40 md:pb-0">
      <SkipLink />
      <header className="sticky top-0 z-30 border-b border-line bg-[color-mix(in_srgb,var(--surface-card)_92%,transparent)] backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-content items-center justify-between gap-4 px-4">
          <div className="flex min-w-0 items-center gap-3">
            <Brand />
          </div>
          <div className="flex items-center gap-4">
            <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
              {APPLICANT_NAV.map((item) => (
                <NavLink key={item.to} to={item.to} className={({ isActive }) => cn('site-nav__link', isActive && 'site-nav__link--active')}>
                  {item.label}
                </NavLink>
              ))}
            </nav>
            <TopBarEnd badge={false} />
          </div>
        </div>
      </header>
      <main id="main" className="mx-auto min-h-[calc(100svh-4rem)] w-full max-w-content flex-1 px-4 py-6">
        <PageTransition>
          <Outlet />
        </PageTransition>
      </main>
      <div className="mx-auto w-full max-w-content px-4">
        <MockRoleSwitcher />
      </div>
      <Footer variant="app" chatSpace />
      <ChatLauncher />
      <PeolwaneAssistant placement="applicant" />
      <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-3 border-t border-line bg-surface-card md:hidden">
        {APPLICANT_NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                'relative flex min-h-touch flex-col items-center justify-center gap-0.5 py-2 text-sm text-ink no-underline',
                isActive && 'font-semibold text-brand-text before:absolute before:inset-x-6 before:top-0 before:h-0.5 before:rounded-full before:bg-brand before:content-[""]',
              )
            }
          >
            <item.icon aria-hidden className="h-5 w-5" />
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}

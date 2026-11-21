import { NavLink, Outlet } from 'react-router-dom'
import { APPLICANT_NAV } from '@/navigation/nav-config'
import { cn } from '@/lib/cn'
import { FloatingChatButton } from '@/components/FloatingChatButton'
import { Brand, Footer, MockRoleSwitcher, SkipLink, TopBarEnd } from './ShellParts'

// Figma: Chat removed from nav, shown as floating button (21 Nov)
const NAV_ITEMS = APPLICANT_NAV.filter((item) => item.label !== 'Chat')

/** Applicant shell (spec §4): top bar on desktop; bottom navigation on mobile. Figma updates 21 Nov: text links with orange active state, floating chat button. */
export function ApplicantShell() {
  return (
    <div className="flex min-h-screen flex-col pb-20 md:pb-0">
      <SkipLink />
      <header className="border-b border-line bg-surface-card">
        <div className="mx-auto flex max-w-content items-center justify-between gap-4 px-4 py-2">
          <Brand />
          <nav aria-label="Main" className="hidden items-center gap-6 md:flex">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    'inline-flex min-h-touch items-center border-b-2 border-transparent pb-0.5 text-ink no-underline hover:text-brand-text',
                    isActive && 'border-brand-text font-semibold text-brand-text',
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          <TopBarEnd />
        </div>
      </header>
      <main id="main" className="mx-auto w-full max-w-content flex-1 px-4 py-6">
        <Outlet />
      </main>
      <div className="mx-auto w-full max-w-content px-4">
        <MockRoleSwitcher />
      </div>
      <Footer />
      <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-10 grid grid-cols-3 border-t border-line bg-surface-card md:hidden">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                'flex min-h-touch flex-col items-center justify-center gap-0.5 py-2 text-sm text-ink no-underline',
                isActive && 'font-semibold text-brand-text',
              )
            }
          >
            <item.icon aria-hidden className="h-5 w-5" />
            {item.label}
          </NavLink>
        ))}
      </nav>
      <FloatingChatButton to="/support/chat" />
    </div>
  )
}

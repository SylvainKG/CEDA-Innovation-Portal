import { NavLink, Outlet } from 'react-router-dom'
import { APPLICANT_NAV } from '@/navigation/nav-config'
import { cn } from '@/lib/cn'
import { DemoBadge } from '@/components/DemoBadge'
import { Brand, ChatLauncher, Footer, MockRoleSwitcher, SkipLink, TopBarEnd } from './ShellParts'

/**
 * Applicant shell (spec §4), laid out to Sandra's 21 Nov frames: logo and DEMO pill, text links (the current one
 * orange and underlined), the bell and the account menu; the floating "Chat with CEDA" button; bottom navigation on
 * mobile.
 */
export function ApplicantShell() {
  return (
    <div className="flex min-h-screen flex-col pb-40 md:pb-0">
      <SkipLink />
      <header className="border-b border-line bg-surface-card">
        <div className="mx-auto flex max-w-content items-center justify-between gap-4 px-4 py-2">
          <div className="flex min-w-0 items-center gap-3">
            <Brand />
            <DemoBadge />
          </div>
          <div className="flex items-center gap-4">
            <nav aria-label="Main" className="hidden items-center gap-2 md:flex">
              {APPLICANT_NAV.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    cn(
                      'inline-flex min-h-touch min-w-touch items-center px-2 font-semibold no-underline',
                      isActive ? 'text-brand-text underline decoration-2 underline-offset-8' : 'text-ink hover:text-brand-text',
                    )
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
            <TopBarEnd badge={false} />
          </div>
        </div>
      </header>
      <main id="main" className="mx-auto w-full max-w-content flex-1 px-4 py-6">
        <Outlet />
      </main>
      <div className="mx-auto w-full max-w-content px-4">
        <MockRoleSwitcher />
      </div>
      <Footer chatSpace />
      <ChatLauncher />
      <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-10 grid grid-cols-3 border-t border-line bg-surface-card md:hidden">
        {APPLICANT_NAV.map((item) => (
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
    </div>
  )
}

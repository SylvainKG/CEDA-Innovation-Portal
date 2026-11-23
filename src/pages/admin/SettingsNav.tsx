import { NavLink } from 'react-router-dom'
import { cn } from '@/lib/cn'

const PAGES = [
  { label: 'Challenges', to: '/admin/challenges' },
  { label: 'Roles', to: '/admin/settings/roles' },
  { label: 'Content', to: '/admin/content' },
  { label: 'Chat settings', to: '/admin/settings/chat' },
] as const

/**
 * The settings pages, one link each, above every settings page's title (handoff-notes #40). "Settings" in the staff
 * navigation opens Challenges; without these links Roles, Content and Chat settings could be reached only by address.
 * Users & roles has its own item in the navigation, as in Sandra's 21 Nov admin frame.
 */
export function SettingsNav() {
  return (
    <nav aria-label="Settings pages" className="flex flex-col gap-2">
      <p className="text-xs font-bold uppercase tracking-wider text-brand-text">Admin settings</p>
      <ul className="flex flex-wrap gap-2">
        {PAGES.map((p) => (
          <li key={p.to}>
            <NavLink
              to={p.to}
              className={({ isActive }) =>
                cn(
                  'inline-flex min-h-touch items-center rounded-md border border-line px-3 text-ink no-underline hover:bg-surface-sunken',
                  isActive && 'border-brand bg-brand-subtle font-semibold',
                )
              }
            >
              {p.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}

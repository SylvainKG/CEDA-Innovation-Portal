import type { LucideIcon } from 'lucide-react'
import {
  BarChart3,
  ClipboardCheck,
  FileSearch,
  Gavel,
  HelpCircle,
  Home,
  Inbox,
  Lightbulb,
  ListChecks,
  MessageCircle,
  ScrollText,
  Settings,
  Trophy,
} from 'lucide-react'
import type { Role } from '@/lib/api/types'

/**
 * Navigation by role, transcribed from docs/design/figma-handoff/navigation-map.md (spec §4).
 * This only decides what is SHOWN. Access is enforced by the server; hiding a link is not security.
 */
export interface NavItem {
  label: string
  to: string
  icon: LucideIcon
  roles: readonly Role[]
  /** Marked ◐ in the navigation map: restricted view, scope pending a decision (e.g. D-08). */
  restricted?: boolean
}

export const STAFF_NAV: readonly NavItem[] = [
  {
    label: 'Home',
    to: '/staff',
    icon: Home,
    roles: ['screening_officer', 'reviewer', 'adjudicator', 'admin', 'support_consultant', 'support_lead', 'committee_member'],
  },
  { label: 'Screening queue', to: '/staff/queue/screening', icon: ClipboardCheck, roles: ['screening_officer', 'admin'] },
  { label: 'My reviews', to: '/staff/reviews', icon: ListChecks, roles: ['reviewer'] },
  { label: 'Ready for decision', to: '/staff/queue/decision', icon: Gavel, roles: ['adjudicator', 'admin'] },
  { label: 'All cases', to: '/staff/cases', icon: FileSearch, roles: ['admin', 'committee_member'] },
  { label: 'Reports', to: '/reports', icon: BarChart3, roles: ['adjudicator', 'admin', 'support_lead', 'committee_member'] },
  { label: 'Audit log', to: '/audit', icon: ScrollText, roles: ['admin', 'auditor'] },
  { label: 'Support inbox', to: '/support/inbox', icon: Inbox, roles: ['support_consultant', 'support_lead'] },
  { label: 'Settings', to: '/admin/challenges', icon: Settings, roles: ['admin'] },
]

export const APPLICANT_NAV: readonly NavItem[] = [
  { label: 'My ideas', to: '/ideas', icon: Lightbulb, roles: ['applicant'] },
  { label: 'Challenges', to: '/challenges', icon: Trophy, roles: ['applicant'] },
  { label: 'Help', to: '/help/faqs', icon: HelpCircle, roles: ['applicant'] },
  { label: 'Chat', to: '/support/chat', icon: MessageCircle, roles: ['applicant'] },
]

/** Items a person may see, given all of their roles. */
export function navFor(roles: readonly Role[], items: readonly NavItem[] = STAFF_NAV): NavItem[] {
  return items.filter((item) => item.roles.some((r) => roles.includes(r)))
}

/** Where a signed-in person lands. Auditors have no Home (navigation map), so they land on the audit log. */
export function homeFor(roles: readonly Role[]): string {
  if (roles.includes('applicant')) return '/ideas'
  const items = navFor(roles)
  return items[0]?.to ?? '/'
}

import type { Role } from '@/lib/api/types'

const ROLE_LABELS: Record<Role, string> = {
  applicant: 'Applicant',
  screening_officer: 'Screening officer',
  reviewer: 'Reviewer',
  adjudicator: 'Adjudicator',
  admin: 'Administrator',
  support_consultant: 'Support consultant',
  support_lead: 'Support lead',
  committee_member: 'Committee member',
  auditor: 'Auditor',
}

export function roleLabel(role: Role): string {
  return ROLE_LABELS[role]
}

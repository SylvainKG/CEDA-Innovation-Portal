import type { CaseStatus } from '@/lib/api/types'

/** Whole days a case has waited since submission (screening queue "Waiting" column). */
export function daysWaiting(submittedAt: string, now: Date = new Date()): number {
  return Math.max(0, Math.floor((now.getTime() - Date.parse(submittedAt)) / 86_400_000))
}


/** What happened at a case event, worded as an event (the status label describes a state, not a change). */
const EVENT_LABEL: Record<CaseStatus, string> = {
  draft: 'Draft created',
  submitted: 'Submitted',
  in_evaluation: 'Moved to evaluation',
  action_required: 'Feedback requested from the applicant',
  in_adjudication: 'Ready for decision',
  approved: 'Approved',
  not_approved: 'Not approved',
  awarded: 'Award recorded',
  closed: 'Closed',
}

export function eventLabel(to: CaseStatus, from: CaseStatus | null): string {
  if (to === 'in_evaluation' && from === 'action_required') return 'Applicant responded; back in evaluation'
  return EVENT_LABEL[to]
}

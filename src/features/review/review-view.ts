import type { MyReviewStatus } from '@/lib/api/types'
import type { StatusTone } from '@/lib/status'

/** Spec T07 reviewer variant: "Not started · Declaration needed · In progress · Submitted". */
export const MY_STATUS: Record<MyReviewStatus, { label: string; tone: StatusTone }> = {
  declaration_needed: { label: 'Declaration needed', tone: 'action' },
  not_started: { label: 'Not started', tone: 'draft' },
  in_progress: { label: 'In progress', tone: 'review' },
  submitted: { label: 'Submitted', tone: 'approved' },
}

/** Tab order: what needs doing first. */
export const MY_STATUS_ORDER: MyReviewStatus[] = ['declaration_needed', 'not_started', 'in_progress', 'submitted']

/** A due date has passed (end of that moment) and the review is not submitted. */
export function isOverdue(dueAt: string | null, status: MyReviewStatus, now: Date = new Date()): boolean {
  return Boolean(dueAt) && status !== 'submitted' && Date.parse(dueAt as string) < now.getTime()
}

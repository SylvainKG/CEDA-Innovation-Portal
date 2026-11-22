import type { CaseStatus, FeedbackKind, PublicStage } from './api/types'

/** Tone names map to the status-* tokens in tokens.css. */
export type StatusTone = 'draft' | 'submitted' | 'review' | 'action' | 'approved' | 'closed' | 'awarded'

export interface StatusContext {
  /** Needed to word Action required (clarification vs revision). */
  feedbackKind?: FeedbackKind
  /** in_adjudication with a recorded but unpublished decision (staff see it; applicants never do). */
  decisionDrafted?: boolean
  /** Evaluation progress for the staff label, e.g. { scored: 1, required: 2 }. */
  scores?: { scored: number; required: number }
  /** Closure reason for the staff label. */
  closedReason?: string
}

export interface StatusPresentation {
  label: string
  tone: StatusTone
  stage: PublicStage | null
}

/**
 * Applicant-facing label (spec §6). Applicants never see internal stages or unpublished decisions:
 * a drafted decision still reads "Under review".
 */
export function applicantStatus(status: CaseStatus, ctx: StatusContext = {}): StatusPresentation {
  switch (status) {
    case 'draft':
      return { label: 'Draft', tone: 'draft', stage: null }
    case 'submitted':
      return { label: 'Submitted', tone: 'submitted', stage: 'submission' }
    case 'in_evaluation':
    case 'in_adjudication':
      return { label: 'Under review', tone: 'review', stage: 'review' }
    case 'action_required':
      return {
        label: ctx.feedbackKind === 'revision' ? 'Action required: revise your idea' : 'Action required: answer a question',
        tone: 'action',
        stage: 'feedback',
      }
    case 'approved':
      return { label: 'Approved', tone: 'approved', stage: 'approval' }
    case 'not_approved':
      return { label: 'Not approved', tone: 'closed', stage: 'approval' }
    case 'awarded':
      return { label: 'Awarded', tone: 'awarded', stage: 'award' }
    case 'closed':
      return { label: 'Closed', tone: 'closed', stage: null }
  }
}

/** Staff-facing label (spec §6). */
export function staffStatus(status: CaseStatus, ctx: StatusContext = {}): StatusPresentation {
  const base = applicantStatus(status, ctx)
  switch (status) {
    case 'draft':
      // Drafts are never visible to staff; this exists only for completeness.
      return { ...base, label: 'Draft' }
    case 'submitted':
      return { ...base, label: 'Awaiting screening' }
    case 'in_evaluation': {
      const s = ctx.scores
      return { ...base, label: s ? `In evaluation (${s.scored}/${s.required} scored)` : 'In evaluation' }
    }
    case 'action_required':
      // Lists don't carry the request's kind; say nothing rather than guess "clarification" (handoff-notes #39).
      return { ...base, label: ctx.feedbackKind ? `Waiting on applicant (${ctx.feedbackKind})` : 'Waiting on applicant' }
    case 'in_adjudication':
      return { ...base, label: ctx.decisionDrafted ? 'Decision drafted (unpublished)' : 'Ready for decision' }
    case 'closed':
      return { ...base, label: ctx.closedReason ? `Closed: ${ctx.closedReason}` : 'Closed' }
    default:
      return base
  }
}

export const PUBLIC_STAGES: { id: PublicStage; label: string }[] = [
  { id: 'submission', label: 'Submission' },
  { id: 'review', label: 'Review' },
  { id: 'feedback', label: 'Feedback' },
  { id: 'approval', label: 'Approval' },
  { id: 'award', label: 'Award' },
]

import type { IdeaCardModel, StageEntry } from '@/components'
import type { CaseStatus, MyIdea, PublicStage } from '@/lib/api/types'
import { PUBLIC_STAGES } from '@/lib/status'

/**
 * From the applicant's idea (API shape) to the IdeaCard view model (spec §7 T06, §6 status language).
 * Pure functions, so the rules are unit-tested without rendering.
 */

/** The stage a status sits in (spec §6). Draft and closed sit in none. */
const CURRENT_STAGE: Partial<Record<CaseStatus, PublicStage>> = {
  submitted: 'submission',
  in_evaluation: 'review',
  in_adjudication: 'review',
  action_required: 'feedback',
  approved: 'approval',
  not_approved: 'approval',
  awarded: 'award',
}

export function stagesFor(idea: Pick<MyIdea, 'status' | 'stages'>): StageEntry[] {
  const reached = new Map(idea.stages.map((s) => [s.stage, s.at]))
  const current = CURRENT_STAGE[idea.status]
  const order = PUBLIC_STAGES.map((p) => p.id)
  // The furthest stage the case is in or has reached; a stage before it that never happened was skipped
  // (Feedback when CEDA asked nothing, #100 decision 2).
  const furthest = Math.max(current ? order.indexOf(current) : -1, ...idea.stages.map((s) => order.indexOf(s.stage)))
  return PUBLIC_STAGES.map(({ id }, i) => {
    if (id === current) return { stage: id, state: 'current' as const, at: reached.get(id) }
    if (reached.has(id)) return { stage: id, state: 'done' as const, at: reached.get(id) }
    if (i < furthest) return { stage: id, state: 'skipped' as const }
    return { stage: id, state: 'upcoming' as const }
  })
}

export const EXPIRED_NOTICE = 'The response deadline has passed. CEDA will contact you.'

export function primaryActionFor(idea: Pick<MyIdea, 'id' | 'status' | 'open_feedback'>): IdeaCardModel['primaryAction'] {
  // Expired request (Stacey, #38): nothing to answer until staff extend the deadline, so no action button.
  if (idea.status === 'action_required' && idea.open_feedback?.status === 'expired') return undefined
  if (idea.status === 'draft') return { label: 'Continue draft', to: `/ideas/${idea.id}/edit` }
  if (idea.status === 'action_required' && idea.open_feedback?.kind === 'revision') return { label: 'Revise your idea', to: `/ideas/${idea.id}/revise` }
  if (idea.status === 'action_required') return { label: 'Answer the question', to: `/ideas/${idea.id}#feedback` }
  return { label: 'View idea', to: `/ideas/${idea.id}` }
}

export function toIdeaCard(idea: MyIdea): IdeaCardModel {
  const deadline =
    idea.status === 'action_required' && idea.open_feedback?.status === 'open'
      ? { deadline: idea.open_feedback.due_at }
      : idea.status === 'draft'
        ? { deadline: idea.challenge.closes_at, deadlineLabel: 'Submit by' }
        : {}
  return {
    id: idea.id,
    title: idea.title,
    challenge: idea.challenge.title,
    reference: idea.reference,
    status: idea.status,
    feedbackKind: idea.open_feedback?.kind,
    updatedAt: idea.updated_at,
    stages: stagesFor(idea),
    primaryAction: primaryActionFor(idea),
    notice: idea.status === 'action_required' && idea.open_feedback?.status === 'expired' ? EXPIRED_NOTICE : undefined,
    ...deadline,
  }
}

/** Spec T06: ideas needing action first (a response, then drafts to finish), then the most recently updated. */
export function sortIdeas(ideas: MyIdea[]): MyIdea[] {
  const rank = (i: MyIdea) => (i.status === 'action_required' ? 0 : i.status === 'draft' ? 1 : 2)
  return [...ideas].sort((a, b) => rank(a) - rank(b) || b.updated_at.localeCompare(a.updated_at))
}

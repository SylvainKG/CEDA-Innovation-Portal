import { useCallback, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { ApiErrorCode, CommandOutcome, ReviewWorkspace, ScoreItem, ScorecardResult } from '@/lib/api/types'
import { staffKeys } from '@/features/staff/queries'

/** Reviewer reads and actions (Slice 3). */
export const reviewKeys = {
  all: ['review'] as const,
  queue: ['review', 'queue'] as const,
  workspace: (assignmentId: string) => ['review', 'workspace', assignmentId] as const,
}

export function useReviewQueue() {
  return useQuery({ queryKey: reviewKeys.queue, queryFn: () => api.review.myQueue() })
}

export function useWorkspace(assignmentId: string | undefined) {
  return useQuery({
    queryKey: reviewKeys.workspace(assignmentId ?? ''),
    queryFn: () => api.review.getWorkspace(assignmentId as string),
    enabled: Boolean(assignmentId),
  })
}

export type ReviewActionState<T> =
  | { kind: 'idle' }
  | { kind: 'saving' }
  | { kind: 'refused'; code: ApiErrorCode; message?: string; fields?: Record<string, string> }
  | { kind: 'unconfirmed' }
  | { kind: 'done'; data: T | null }

/**
 * A reviewer action. All three (declare, save, submit) are safe to repeat (contract §4.3), so after a lost reply
 * the hook re-reads the workspace and asks `landed` whether the change is there; if not, the screen says to try
 * again, which cannot apply it twice.
 */
function useReviewAction<I, T>(
  assignmentId: string,
  send: (input: I) => Promise<CommandOutcome<T>>,
  landed: (fresh: ReviewWorkspace | null, input: I) => boolean,
) {
  const qc = useQueryClient()
  const [state, setState] = useState<ReviewActionState<T>>({ kind: 'idle' })
  const run = useCallback(
    async (input: I): Promise<ReviewActionState<T>> => {
      setState({ kind: 'saving' })
      let next: ReviewActionState<T>
      try {
        const outcome = await send(input)
        if (outcome.kind === 'ok') next = { kind: 'done', data: outcome.data }
        else if (outcome.kind === 'refused') next = { kind: 'refused', code: outcome.code, message: outcome.message, fields: outcome.fields }
        else next = { kind: 'unconfirmed' }
      } catch {
        const fresh = await api.review.getWorkspace(assignmentId).catch(() => undefined)
        next = fresh !== undefined && landed(fresh, input) ? { kind: 'done', data: null } : { kind: 'unconfirmed' }
      }
      setState(next)
      if (next.kind === 'done' || (next.kind === 'refused' && next.code === 'INVALID_STATE')) {
        await qc.invalidateQueries({ queryKey: reviewKeys.all })
        void qc.invalidateQueries({ queryKey: staffKeys.all })
      }
      return next
    },
    [assignmentId, landed, qc, send],
  )
  const reset = useCallback(() => setState({ kind: 'idle' }), [])
  return { state, run, reset }
}

export function useDeclare(assignmentId: string) {
  const send = useCallback(
    (input: { hasConflict: boolean; confidentialityAccepted: boolean }) => api.review.declare({ assignmentId, ...input }),
    [assignmentId],
  )
  // Declared without conflict: the workspace now has the proposal. With a conflict: the assignment is gone.
  const landed = useCallback(
    (fresh: ReviewWorkspace | null, input: { hasConflict: boolean }) => (input.hasConflict ? fresh === null : Boolean(fresh && fresh.row.my_status !== 'declaration_needed')),
    [],
  )
  return useReviewAction(assignmentId, send, landed)
}

interface ScoreInput {
  items: ScoreItem[]
  overallComment: string
}

export function useSaveScorecard(assignmentId: string) {
  const send = useCallback((input: ScoreInput) => api.review.saveScorecard({ assignmentId, ...input }), [assignmentId])
  const landed = useCallback(
    (fresh: ReviewWorkspace | null, input: ScoreInput) =>
      Boolean(fresh?.scorecard && input.items.every((i) => fresh.scorecard!.items.some((x) => x.criterion_id === i.criterion_id && x.score === i.score && x.reason === i.reason))),
    [],
  )
  return useReviewAction<ScoreInput, ScorecardResult>(assignmentId, send, landed)
}

export function usePanel(proposalId: string | undefined) {
  return useQuery({
    queryKey: [...reviewKeys.all, 'panel', proposalId ?? ''],
    queryFn: () => api.review.getPanel(proposalId as string),
    enabled: Boolean(proposalId),
  })
}

export function useSubmitScorecard(assignmentId: string) {
  const send = useCallback((input: ScoreInput) => api.review.submitScorecard({ assignmentId, ...input }), [assignmentId])
  const landed = useCallback((fresh: ReviewWorkspace | null) => fresh?.scorecard?.status === 'submitted', [])
  return useReviewAction<ScoreInput, ScorecardResult>(assignmentId, send, landed)
}

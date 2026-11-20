import { useCallback, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { ApiErrorCode, CommandOutcome, FeedbackKind, FeedbackRequest } from '@/lib/api/types'
import { staffKeys } from '@/features/staff/queries'
import { submissionKeys } from '@/features/submission/queries'

export const feedbackKeys = {
  roadmap: (proposalId: string) => ['feedback', 'roadmap', proposalId] as const,
}

export function useRoadmap(proposalId: string | undefined) {
  return useQuery({
    queryKey: feedbackKeys.roadmap(proposalId ?? ''),
    queryFn: () => api.feedback.getRoadmap(proposalId as string),
    enabled: Boolean(proposalId),
  })
}

export type FeedbackActionState =
  | { kind: 'idle' }
  | { kind: 'saving' }
  | { kind: 'refused'; code: ApiErrorCode; message?: string; fields?: Record<string, string> }
  | { kind: 'unconfirmed' }
  | { kind: 'done' }

/**
 * A feedback action with no request key. After an unexpected error the hook re-reads the roadmap and asks
 * `landed` whether the change is there; a repeat would be refused (a request is already open, the question is
 * already answered), so trying again cannot apply it twice.
 */
function useFeedbackAction<I>(proposalId: string, send: (input: I) => Promise<CommandOutcome<unknown>>, landed: (fresh: FeedbackRequest[], input: I) => boolean) {
  const qc = useQueryClient()
  const [state, setState] = useState<FeedbackActionState>({ kind: 'idle' })
  const run = useCallback(
    async (input: I): Promise<FeedbackActionState> => {
      setState({ kind: 'saving' })
      let next: FeedbackActionState
      try {
        const outcome = await send(input)
        if (outcome.kind === 'ok') next = { kind: 'done' }
        else if (outcome.kind === 'refused') next = { kind: 'refused', code: outcome.code, message: outcome.message, fields: outcome.fields }
        else next = { kind: 'unconfirmed' }
      } catch {
        const fresh = await api.feedback.getRoadmap(proposalId).catch(() => null)
        next = fresh && landed(fresh, input) ? { kind: 'done' } : { kind: 'unconfirmed' }
      }
      setState(next)
      if (next.kind === 'done' || (next.kind === 'refused' && next.code === 'INVALID_STATE')) {
        await qc.invalidateQueries({ queryKey: feedbackKeys.roadmap(proposalId) })
        void qc.invalidateQueries({ queryKey: staffKeys.all })
        void qc.invalidateQueries({ queryKey: ['my-case', proposalId] })
        void qc.invalidateQueries({ queryKey: submissionKeys.myIdeas })
      }
      return next
    },
    [landed, proposalId, qc, send],
  )
  const reset = useCallback(() => setState({ kind: 'idle' }), [])
  return { state, run, reset }
}

export interface RequestInput {
  kind: FeedbackKind
  message: string
  dueAt: string
  tasks: string[]
}

export function useRequestFeedback(proposalId: string) {
  const send = useCallback((input: RequestInput) => api.feedback.requestFeedback({ proposalId, ...input }), [proposalId])
  const landed = useCallback((fresh: FeedbackRequest[], input: RequestInput) => fresh.some((r) => r.status === 'open' && r.message === input.message.trim()), [])
  return useFeedbackAction(proposalId, send, landed)
}

export function useRespondClarification(proposalId: string) {
  const send = useCallback((input: { feedbackRequestId: string; text: string }) => api.feedback.respondClarification(input), [])
  const landed = useCallback(
    (fresh: FeedbackRequest[], input: { feedbackRequestId: string }) => fresh.some((r) => r.feedback_request_id === input.feedbackRequestId && r.status === 'answered'),
    [],
  )
  return useFeedbackAction(proposalId, send, landed)
}

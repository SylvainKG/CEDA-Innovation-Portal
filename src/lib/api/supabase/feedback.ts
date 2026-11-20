import type { SupabaseClient } from '@supabase/supabase-js'
import { ApiError, fromRpcError, isRefusal } from '../errors'
import type { FeedbackPort } from '../feedback'
import type { CaseStatus, FeedbackKind, FeedbackRequest } from '../types'

/** Supabase feedback adapter (Slice 4). */
export function createSupabaseFeedback(client: SupabaseClient): FeedbackPort {
  return {
    async getRoadmap(proposalId) {
      const { data, error } = await client.rpc('get_roadmap', { p_proposal_id: proposalId })
      if (error) {
        if (isRefusal(error)) return null
        throw new ApiError('Could not load the feedback', error)
      }
      return (Array.isArray(data) ? data : []) as FeedbackRequest[]
    },

    async requestFeedback({ proposalId, kind, message, dueAt, tasks }) {
      const { data, error } = await client.rpc('request_feedback', {
        p_proposal_id: proposalId,
        p_kind: kind,
        p_message: message,
        p_due_at: dueAt ?? null,
        // A clarification takes no tasks (the server refuses them).
        p_tasks: kind === 'revision' && tasks?.length ? tasks : null,
      })
      if (error) return fromRpcError(error)
      return { kind: 'ok', data: data as { feedback_request_id: string; kind: FeedbackKind; status: CaseStatus; return_stage: CaseStatus; due_at: string } }
    },

    async respondClarification({ feedbackRequestId, text }) {
      const { data, error } = await client.rpc('respond_clarification', { p_feedback_request_id: feedbackRequestId, p_text: text })
      if (error) return fromRpcError(error)
      return { kind: 'ok', data: data as { feedback_request_id: string; status: 'answered'; responded_at: string; case_status: CaseStatus } }
    },
  }
}

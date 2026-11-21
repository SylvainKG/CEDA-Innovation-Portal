import type { CaseStatus, CommandOutcome, FeedbackKind, FeedbackRequest } from './types'

/**
 * Feedback port, Slice 4 (REV-04, INN-02, D-21). Staff ask; the applicant answers. Screens depend on this only.
 *
 * | Method               | Contract                                                                         |
 * |----------------------|----------------------------------------------------------------------------------|
 * | getRoadmap           | RPC `get_roadmap` (\u00a74.4): anyone who can read the case                           |
 * | requestFeedback      | RPC `request_feedback` (\u00a74.4): screening officer, adjudicator, assigned reviewer  |
 * | respondClarification | RPC `respond_clarification` (\u00a74.4): the applicant; no new version (D-21)         |
 *
 * `null` from getRoadmap means "not visible". Neither command has a request key: a repeat is refused with
 * INVALID_STATE (a request is already open; the question is already answered), so the screen re-reads.
 */
export interface FeedbackPort {
  getRoadmap(proposalId: string): Promise<FeedbackRequest[] | null>
  requestFeedback(input: {
    proposalId: string
    kind: FeedbackKind
    message: string
    dueAt?: string
    tasks?: string[]
  }): Promise<CommandOutcome<{ feedback_request_id: string; kind: FeedbackKind; status: CaseStatus; return_stage: CaseStatus; due_at: string }>>
  respondClarification(input: { feedbackRequestId: string; text: string }): Promise<CommandOutcome<{ feedback_request_id: string; status: 'answered'; responded_at: string; case_status: CaseStatus }>>
}

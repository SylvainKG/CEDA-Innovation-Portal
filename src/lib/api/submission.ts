import type {
  AttachmentInfo,
  ChallengeBrief,
  ChallengeForm,
  ChallengeSummary,
  CommandOutcome,
  DeclarationText,
  DraftData,
  DraftView,
  MyCase,
  MyIdea,
  ReceiptLookup,
  SaveDraftResult,
  SubmissionReceipt,
} from './types'

/**
 * Slice 1 port: draft, attachments, submit and receipt. Screens depend on this interface only.
 *
 * Every method maps to something the contract documents (docs/blueprint/03-api-contracts-and-permissions.md):
 *
 * | Method                | Contract                                                                 |
 * |-----------------------|--------------------------------------------------------------------------|
 * | listChallenges        | read `challenges` (§3, published and closed; also anon)                   |
 * | getChallengeBrief     | read `challenges` + `challenge_versions` + `rubric_criteria` (§3, public) |
 * | getChallengeForm      | read `challenges` + `challenge_versions` (§3, published rows)             |
 * | getDeclaration        | read `content_pages` kind `declaration` (§3)                              |
 * | getDraft              | read `proposal_drafts` + `attachments` (§3, own only)                     |
 * | listMyIdeas           | RPC `list_my_ideas()` (migration 014: safe columns only, own cases)       |
 * | getMyCase             | read own `proposals`, current version, its files, public `case_events`,   |
 * |                       | published `decisions`, `awards` (§3; never staff-only columns)          |
 * | templateUrl           | public URL in the `challenge-files` bucket (§5; no request, no secrets)   |
 * | saveDraft             | RPC `save_draft` (§4)                                                     |
 * | uploadAttachment      | Storage upload to `proposal-files`, then RPC `register_attachment` (§5)   |
 * | removeAttachment      | RPC `remove_attachment` (§4)                                              |
 * | submitProposal        | RPC `submit_proposal` (§4, §4.1)                                          |
 * | submitRevision        | `save_draft` (the revision working copy, if edited), then RPC `submit_revision`  |
 * |                       | (§4.4): V2, V3 … with task answers and a change note; idempotent by request key  |
 * | getSubmissionReceipt  | RPC `get_submission_receipt` (§4)                                         |
 *
 * Commands return a `CommandOutcome`: `refused` means nothing changed; `unknown` means the reply was lost and
 * the caller must check with the same key (never treat it as failed). Reads return `null` for "not visible",
 * which includes "does not exist" (RLS; contract §1).
 */
export interface SubmissionPort {
  listChallenges(): Promise<ChallengeSummary[]>
  /** `null` when no published or closed challenge has this slug (an unpublished one renders Not found). */
  getChallengeBrief(slug: string): Promise<ChallengeBrief | null>
  getChallengeForm(challengeId: string): Promise<ChallengeForm | null>
  getDeclaration(): Promise<DeclarationText>
  getDraft(proposalId: string): Promise<DraftView | null>
  listMyIdeas(): Promise<MyIdea[]>
  /** The applicant's own submitted case; `null` when not theirs, a draft, or missing. */
  getMyCase(proposalId: string): Promise<MyCase | null>
  /** Download URL of a challenge template, or `null` when downloads are not available (the section is hidden). */
  templateUrl(path: string): string | null

  saveDraft(input: { data: DraftData; proposalId?: string; challengeId?: string }): Promise<CommandOutcome<SaveDraftResult>>
  uploadAttachment(input: { proposalId: string; file: File; docKey?: string }): Promise<CommandOutcome<AttachmentInfo>>
  removeAttachment(attachmentId: string): Promise<CommandOutcome<{ id: string; removed: true }>>

  submitProposal(input: {
    proposalId: string
    clientRequestId: string
    declarationVersion: string
  }): Promise<CommandOutcome<SubmissionReceipt>>
  /**
   * Submit a revision (T04 V2 mode, INN-02). `data` is the edited answers, or `null` if unchanged (the server then
   * reuses the current version). The request key works as for the first submission: reuse it until a receipt
   * arrives; a lost reply is `unknown`.
   */
  submitRevision(input: {
    proposalId: string
    clientRequestId: string
    data: DraftData | null
    changeNote: string
    taskResponses: { task_id: string; status: 'addressed' | 'not_addressed'; explanation: string }[]
    declarationVersion: string
  }): Promise<CommandOutcome<SubmissionReceipt>>
  /** `versionNo` picks a specific version's receipt (V2 receipts, Slice 4); omitted means the first. */
  getSubmissionReceipt(query: ({ proposalId: string } | { clientRequestId: string }) & { versionNo?: number }): Promise<ReceiptLookup>
}

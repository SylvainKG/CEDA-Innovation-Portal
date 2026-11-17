import type {
  AttachmentInfo,
  ChallengeForm,
  CommandOutcome,
  DeclarationText,
  DraftData,
  DraftView,
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
 * | getChallengeForm      | read `challenges` + `challenge_versions` (§3, published rows)             |
 * | getDeclaration        | read `content_pages` kind `declaration` (§3)                              |
 * | getDraft              | read `proposal_drafts` + `attachments` (§3, own only)                     |
 * | saveDraft             | RPC `save_draft` (§4)                                                     |
 * | uploadAttachment      | Storage upload to `proposal-files`, then RPC `register_attachment` (§5)   |
 * | removeAttachment      | RPC `remove_attachment` (§4)                                              |
 * | submitProposal        | RPC `submit_proposal` (§4, §4.1)                                          |
 * | getSubmissionReceipt  | RPC `get_submission_receipt` (§4)                                         |
 *
 * Commands return a `CommandOutcome`: `refused` means nothing changed; `unknown` means the reply was lost and
 * the caller must check with the same key (never treat it as failed). Reads return `null` for "not visible",
 * which includes "does not exist" (RLS; contract §1).
 */
export interface SubmissionPort {
  getChallengeForm(challengeId: string): Promise<ChallengeForm | null>
  getDeclaration(): Promise<DeclarationText>
  getDraft(proposalId: string): Promise<DraftView | null>

  saveDraft(input: { data: DraftData; proposalId?: string; challengeId?: string }): Promise<CommandOutcome<SaveDraftResult>>
  uploadAttachment(input: { proposalId: string; file: File; docKey?: string }): Promise<CommandOutcome<AttachmentInfo>>
  removeAttachment(attachmentId: string): Promise<CommandOutcome<{ id: string; removed: true }>>

  submitProposal(input: {
    proposalId: string
    clientRequestId: string
    declarationVersion: string
  }): Promise<CommandOutcome<SubmissionReceipt>>
  getSubmissionReceipt(query: { proposalId: string } | { clientRequestId: string }): Promise<ReceiptLookup>
}

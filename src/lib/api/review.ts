import type { CommandOutcome, DeclareResult, ReviewQueueRow, ReviewWorkspace, ScoreItem, ScorecardResult } from './types'

/**
 * Reviewer port, Slice 3 (REV-02, REV-03). Screens depend on this interface only.
 *
 * | Method          | Contract                                                                            |
 * |-----------------|-------------------------------------------------------------------------------------|
 * | myQueue         | RPC `my_review_queue()` (§4.3, `scorecard.submit`)                                   |
 * | getWorkspace    | the queue row; after declaring, the current `proposal_versions` row, submitted       |
 * |                 | `attachments`, the published `rubric_criteria` and the reviewer's own `scorecards`   |
 * | declare         | RPC `declare_assignment` (§4.3). The same answer twice is safe (`replayed`)          |
 * | saveScorecard   | RPC `save_scorecard` (§4.3). Items replace all items, so a repeat is safe            |
 * | submitScorecard | RPC `submit_scorecard` (§4.3). A repeat returns the recorded result (`replayed`)     |
 *
 * Before the declaration the reviewer reads no proposal text or files (RLS, N10); the workspace says so with
 * `proposal: null`.
 */
export interface ReviewPort {
  myQueue(): Promise<ReviewQueueRow[]>
  getWorkspace(assignmentId: string): Promise<ReviewWorkspace | null>
  declare(input: { assignmentId: string; hasConflict: boolean; confidentialityAccepted: boolean }): Promise<CommandOutcome<DeclareResult>>
  saveScorecard(input: { assignmentId: string; items: ScoreItem[]; overallComment: string }): Promise<CommandOutcome<ScorecardResult>>
  submitScorecard(input: { assignmentId: string; items: ScoreItem[]; overallComment: string }): Promise<CommandOutcome<ScorecardResult>>
}

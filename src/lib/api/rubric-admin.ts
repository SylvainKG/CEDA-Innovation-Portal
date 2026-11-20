import type { AdminRubric, CommandOutcome } from './types'

/**
 * Rubric admin port, T12 (REV-02, ARC-01, D-20: scores 1 to 5, anchors for 1, 3 and 5). config.manage only.
 *
 * | Method           | Contract                                                                      |
 * |------------------|-------------------------------------------------------------------------------|
 * | listRubrics      | read `rubrics` + `rubric_versions` + `rubric_criteria`                         |
 * | getRubric        | the same, for one rubric (versions newest first)                              |
 * | create           | RPC `create_rubric(p_key, p_title)` (with an empty draft v1)                  |
 * | createDraft      | RPC `create_rubric_draft`: copies the latest version; returns an open draft    |
 * | saveCriterion    | RPC `save_rubric_criterion` (add or replace by key, draft only)                |
 * | removeCriterion  | RPC `remove_rubric_criterion` (draft only)                                    |
 * | publish          | RPC `publish_rubric_version`: weights must total 100; then locked             |
 */
export interface RubricAdminPort {
  listRubrics(): Promise<AdminRubric[] | null>
  getRubric(id: string): Promise<AdminRubric | null>
  create(input: { key: string; title: string }): Promise<CommandOutcome<{ rubric_id: string }>>
  createDraft(rubricId: string): Promise<CommandOutcome<{ rubric_version_id: string; version_no: number; existing: boolean }>>
  saveCriterion(input: {
    versionId: string
    key: string
    label: string
    weight: number
    anchors: Record<string, string>
    guidance: string
    position: number
  }): Promise<CommandOutcome<{ weights_total: number }>>
  removeCriterion(versionId: string, key: string): Promise<CommandOutcome<{ weights_total: number }>>
  publish(versionId: string): Promise<CommandOutcome<{ published: true }>>
}

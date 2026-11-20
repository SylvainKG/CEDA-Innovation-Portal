import type { AdminChallenge, AdminChallengeVersion, ChallengeDetailsInput, ChallengeStatus, CommandOutcome, FormSchema, RequiredDoc, RubricVersionOption } from './types'

/**
 * Challenge admin port, T12 (ADM-01, ADM-02). All actions need config.manage (admin) and are audited.
 *
 * | Method              | Contract                                                                          |
 * |---------------------|-----------------------------------------------------------------------------------|
 * | listChallenges      | read `challenges` (RLS: config.manage sees drafts and unpublished too)            |
 * | getChallenge        | read `challenges` + `challenge_versions` (newest first)                           |
 * | listRubricVersions  | read `rubric_versions` + `rubrics(title)`                                         |
 * | create              | RPC `create_challenge` (draft)                                                    |
 * | update              | RPC `update_challenge` (details and dates)                                        |
 * | saveVersion         | RPC `save_challenge_version`: creates or updates the one unpublished form version |
 * | publish             | RPC `publish_challenge`: publishes the draft form (rubric must be published)      |
 * | setStatus           | RPC `set_challenge_status('unpublished' | 'closed')`                              |
 * | remove              | RPC `delete_challenge`: only an unused, never-published draft                      |
 */
export interface ChallengeAdminPort {
  listChallenges(): Promise<AdminChallenge[] | null>
  getChallenge(id: string): Promise<{ challenge: AdminChallenge; versions: AdminChallengeVersion[] } | null>
  listRubricVersions(): Promise<RubricVersionOption[]>
  create(input: ChallengeDetailsInput & { slug: string }): Promise<CommandOutcome<{ challenge_id: string }>>
  update(id: string, input: ChallengeDetailsInput): Promise<CommandOutcome<{ challenge_id: string }>>
  saveVersion(input: { challengeId: string; briefMd: string; formSchema: FormSchema; requiredDocs: RequiredDoc[]; rubricVersionId: string }): Promise<CommandOutcome<{ version_no: number }>>
  publish(id: string): Promise<CommandOutcome<{ form_version: number }>>
  setStatus(id: string, status: Extract<ChallengeStatus, 'unpublished' | 'closed'>): Promise<CommandOutcome<{ status: ChallengeStatus }>>
  remove(id: string): Promise<CommandOutcome<{ deleted: true }>>
}

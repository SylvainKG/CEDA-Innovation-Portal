import type { SupabaseClient } from '@supabase/supabase-js'
import { ApiError, fromRpcError, isRefusal } from '../errors'
import type { ReviewPort } from '../review'
import type { AttachmentInfo, DraftData, FeedbackRequest, FormSchema, MyScorecard, ReviewQueueRow, RubricCriterion, ScorecardResult, ScorePanel, TaskToVerify } from '../types'

/**
 * Supabase reviewer adapter (Slice 3). Explicit columns only. Proposal text, files and the rubric are read only
 * after the declaration; before it, RLS returns nothing for them anyway (N10).
 */
function readFailed(what: string, error: unknown): never {
  throw new ApiError(`Could not load ${what}`, error)
}

function toDraftData(value: unknown): DraftData {
  const out: DraftData = {}
  if (value && typeof value === 'object') for (const [k, v] of Object.entries(value)) if (typeof v === 'string') out[k] = v
  return out
}

export function createSupabaseReview(client: SupabaseClient): ReviewPort {
  async function myQueue(): Promise<ReviewQueueRow[]> {
    const { data, error } = await client.rpc('my_review_queue')
    if (error) readFailed('your reviews', error)
    return (Array.isArray(data) ? data : []) as ReviewQueueRow[]
  }

  return {
    myQueue,

    async getWorkspace(assignmentId) {
      const row = (await myQueue()).find((r) => r.assignment_id === assignmentId)
      if (!row) return null
      if (row.my_status === 'declaration_needed') return { row, proposal: null, criteria: [], scorecard: null, tasks: [] }

      const head = await client
        .from('proposals')
        .select('current_version_id, challenge_versions(form_schema, rubric_version_id)')
        .eq('id', row.proposal_id)
        .maybeSingle()
      if (head.error) readFailed('the proposal', head.error)
      const h = head.data as { current_version_id: string | null; challenge_versions: { form_schema: FormSchema; rubric_version_id: string } | null } | null
      if (!h?.current_version_id || !h.challenge_versions) return { row, proposal: null, criteria: [], scorecard: null, tasks: [] }

      const [version, files, criteria, cards, roadmap, checks] = await Promise.all([
        client.from('proposal_versions').select('version_no, data, change_note').eq('id', h.current_version_id).maybeSingle(),
        client
          .from('attachments')
          .select('id, filename, size_bytes, mime, doc_key')
          .eq('proposal_id', row.proposal_id)
          .eq('version_id', h.current_version_id)
          .is('deleted_at', null)
          .order('created_at', { ascending: true }),
        client
          .from('rubric_criteria')
          .select('id, key, label, weight, guidance, anchors')
          .eq('rubric_version_id', h.challenge_versions.rubric_version_id)
          .order('position', { ascending: true }),
        client
          .from('scorecards')
          .select('id, status, overall_comment, submitted_at, scorecard_items(criterion_id, score, reason)')
          .eq('assignment_id', assignmentId)
          .eq('version_id', h.current_version_id)
          .maybeSingle(),
        // INN-02: the tasks answered in this version, and this reviewer's own checks on them.
        client.rpc('get_roadmap', { p_proposal_id: row.proposal_id }),
        client.from('task_verifications').select('feedback_task_id, result, note').eq('assignment_id', assignmentId),
      ])
      for (const [what, res] of [
        ['the proposal', version],
        ['files', files],
        ['the rubric', criteria],
        ['your scorecard', cards],
        ['the roadmap', roadmap],
        ['your task checks', checks],
      ] as const)
        if (res.error) readFailed(what, res.error)

      const v = version.data as { version_no: number; data: unknown; change_note: string | null } | null
      const mine = new Map(((checks.data ?? []) as { feedback_task_id: string; result: 'verified' | 'not_verified'; note: string }[]).map((x) => [x.feedback_task_id, x]))
      const answered = ((roadmap.data ?? []) as FeedbackRequest[]).find((r) => v && r.answered_version_no === v.version_no)
      const tasks: TaskToVerify[] = (answered?.tasks ?? []).map((t) => ({
        task_id: t.task_id,
        position: t.position,
        text: t.text,
        applicant_status: t.applicant_status,
        applicant_explanation: t.applicant_explanation,
        my_result: mine.get(t.task_id)?.result ?? null,
        my_note: mine.get(t.task_id)?.note ?? null,
      }))
      const card = cards.data as (Omit<MyScorecard, 'items'> & { scorecard_items: MyScorecard['items'] | null }) | null
      return {
        row,
        proposal: v
          ? {
              version_no: v.version_no,
              data: toDraftData(v.data),
              form_schema: h.challenge_versions.form_schema,
              files: ((files.data ?? []) as Record<string, unknown>[]).map(
                (f): AttachmentInfo => ({
                  id: String(f.id),
                  filename: String(f.filename),
                  size_bytes: Number(f.size_bytes),
                  mime: String(f.mime),
                  doc_key: typeof f.doc_key === 'string' ? f.doc_key : null,
                }),
              ),
            }
          : null,
        criteria: ((criteria.data ?? []) as Record<string, unknown>[]).map(
          (c): RubricCriterion => ({
            id: String(c.id),
            key: String(c.key),
            label: String(c.label),
            weight: Number(c.weight),
            guidance: String(c.guidance ?? ''),
            anchors: c.anchors && typeof c.anchors === 'object' ? (c.anchors as Record<string, string>) : {},
          }),
        ),
        scorecard: card
          ? {
              id: card.id,
              status: card.status,
              overall_comment: card.overall_comment ?? '',
              submitted_at: card.submitted_at,
              items: (card.scorecard_items ?? []).map((i) => ({ criterion_id: i.criterion_id, score: Number(i.score), reason: i.reason })),
            }
          : null,
        tasks,
        change_note: v?.change_note ?? null,
      }
    },

    async declare({ assignmentId, hasConflict, confidentialityAccepted }) {
      const { data, error } = await client.rpc('declare_assignment', {
        p_assignment_id: assignmentId,
        p_has_conflict: hasConflict,
        p_confidentiality_accepted: confidentialityAccepted,
      })
      if (error) return fromRpcError(error)
      return { kind: 'ok', data: data as { assignment_id: string; has_conflict: boolean; revoked: boolean; replayed: boolean } }
    },

    async saveScorecard({ assignmentId, items, overallComment }) {
      const { data, error } = await client.rpc('save_scorecard', { p_assignment_id: assignmentId, p_items: items, p_overall_comment: overallComment })
      if (error) return fromRpcError(error)
      return { kind: 'ok', data: data as ScorecardResult }
    },

    async verifyTask({ taskId, assignmentId, result, note }) {
      const { data, error } = await client.rpc('verify_feedback_task', { p_task_id: taskId, p_assignment_id: assignmentId, p_result: result, p_note: note })
      if (error) return fromRpcError(error)
      return { kind: 'ok', data: data as { task_id: string; result: 'verified' | 'not_verified'; verified_at: string } }
    },

    async getPanel(proposalId) {
      const { data, error } = await client.rpc('get_score_panel', { p_proposal_id: proposalId })
      if (error) {
        // FORBIDDEN (not allowed yet, e.g. a reviewer before submitting) reads as "not visible".
        if (isRefusal(error)) return null
        readFailed('the score panel', error)
      }
      const panel = data as ScorePanel | null
      if (!panel) return null
      // numeric columns can arrive as text; the screen does arithmetic on them.
      return {
        ...panel,
        criteria: panel.criteria.map((c) => ({ ...c, weight: Number(c.weight) })),
        scorecards: panel.scorecards.map((s) => ({ ...s, weighted_score: s.weighted_score === null ? null : Number(s.weighted_score) })),
        criteria_summary: panel.criteria_summary.map((c) => ({ ...c, mean: Number(c.mean) })),
      }
    },

    async submitScorecard({ assignmentId, items, overallComment }) {
      const { data, error } = await client.rpc('submit_scorecard', { p_assignment_id: assignmentId, p_items: items, p_overall_comment: overallComment })
      if (error) return fromRpcError(error)
      return { kind: 'ok', data: data as ScorecardResult }
    },
  }
}

import type { SupabaseClient } from '@supabase/supabase-js'
import { ApiError, fromRpcError } from '../errors'
import type { ReviewPort } from '../review'
import type { AttachmentInfo, DraftData, FormSchema, MyScorecard, ReviewQueueRow, RubricCriterion, ScorecardResult } from '../types'

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
      if (row.my_status === 'declaration_needed') return { row, proposal: null, criteria: [], scorecard: null }

      const head = await client
        .from('proposals')
        .select('current_version_id, challenge_versions(form_schema, rubric_version_id)')
        .eq('id', row.proposal_id)
        .maybeSingle()
      if (head.error) readFailed('the proposal', head.error)
      const h = head.data as { current_version_id: string | null; challenge_versions: { form_schema: FormSchema; rubric_version_id: string } | null } | null
      if (!h?.current_version_id || !h.challenge_versions) return { row, proposal: null, criteria: [], scorecard: null }

      const [version, files, criteria, cards] = await Promise.all([
        client.from('proposal_versions').select('version_no, data').eq('id', h.current_version_id).maybeSingle(),
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
      ])
      for (const [what, res] of [['the proposal', version], ['files', files], ['the rubric', criteria], ['your scorecard', cards]] as const)
        if (res.error) readFailed(what, res.error)

      const v = version.data as { version_no: number; data: unknown } | null
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

    async submitScorecard({ assignmentId, items, overallComment }) {
      const { data, error } = await client.rpc('submit_scorecard', { p_assignment_id: assignmentId, p_items: items, p_overall_comment: overallComment })
      if (error) return fromRpcError(error)
      return { kind: 'ok', data: data as ScorecardResult }
    },
  }
}

import type { SupabaseClient } from '@supabase/supabase-js'
import { describe, expect, it } from 'vitest'
import { createSupabaseReview } from './review'

type Result = { data: unknown; error: unknown }
function fake(tables: Record<string, Result>, rpc: Record<string, Result>) {
  const reads: { table: string; columns?: string; filters: unknown[][] }[] = []
  const rpcs: { fn: string; args: unknown }[] = []
  const client = {
    from(table: string) {
      const read = { table, columns: undefined as string | undefined, filters: [] as unknown[][] }
      reads.push(read)
      const b: Record<string, unknown> = {
        select(cols: string) {
          read.columns = cols
          return b
        },
        then(resolve: (r: Result) => unknown) {
          return Promise.resolve(tables[table] ?? { data: null, error: null }).then(resolve)
        },
      }
      for (const op of ['eq', 'in', 'is', 'not', 'order', 'maybeSingle'])
        b[op] = (...args: unknown[]) => {
          read.filters.push([op, ...args])
          return b
        }
      return b
    },
    async rpc(fn: string, args?: unknown) {
      rpcs.push({ fn, args })
      return rpc[fn] ?? { data: null, error: null }
    },
  }
  return { client: client as unknown as SupabaseClient, reads, rpcs }
}

const ROW = {
  assignment_id: 'a1',
  proposal_id: 'p1',
  reference: 'CEDA-2026-0008',
  title: 'Rainwater tanks',
  challenge_title: 'Water-Smart',
  applicant_organisation: 'Lesedi Agro Demo',
  version_no: 1,
  due_at: null,
  case_status: 'in_evaluation',
}

describe('Supabase reviewer adapter', () => {
  it('reads nothing of the proposal before the declaration (N10)', async () => {
    const f = fake({}, { my_review_queue: { data: [{ ...ROW, my_status: 'declaration_needed' }], error: null } })
    const ws = await createSupabaseReview(f.client).getWorkspace('a1')
    expect(ws).toMatchObject({ proposal: null, criteria: [], scorecard: null })
    expect(f.reads).toHaveLength(0)
  })

  it('after the declaration reads the current version, its files, the rubric and the own scorecard, with explicit columns', async () => {
    const f = fake(
      {
        proposals: { data: { current_version_id: 'v1', challenge_versions: { form_schema: { sections: [] }, rubric_version_id: 'r1' } }, error: null },
        proposal_versions: { data: { version_no: 1, data: { title: 'Rainwater tanks' } }, error: null },
        attachments: { data: [], error: null },
        rubric_criteria: { data: [{ id: 'c1', key: 'innovation', label: 'Innovation', weight: '30.00', guidance: 'G', anchors: { '1': 'Not demonstrated' } }], error: null },
        scorecards: { data: { id: 's1', status: 'draft', overall_comment: '', submitted_at: null, scorecard_items: [{ criterion_id: 'c1', score: 4, reason: 'Reason' }] }, error: null },
      },
      { my_review_queue: { data: [{ ...ROW, my_status: 'in_progress' }], error: null } },
    )
    const ws = await createSupabaseReview(f.client).getWorkspace('a1')
    expect(ws?.criteria).toEqual([{ id: 'c1', key: 'innovation', label: 'Innovation', weight: 30, guidance: 'G', anchors: { '1': 'Not demonstrated' } }])
    expect(ws?.scorecard?.items).toEqual([{ criterion_id: 'c1', score: 4, reason: 'Reason' }])
    for (const r of f.reads) expect(r.columns, r.table).not.toMatch(/\*/)
    expect(f.reads.find((r) => r.table === 'scorecards')?.filters).toEqual(expect.arrayContaining([['eq', 'assignment_id', 'a1'], ['eq', 'version_id', 'v1']]))
    expect(f.reads.find((r) => r.table === 'attachments')?.filters).toContainEqual(['eq', 'version_id', 'v1'])
  })

  it('an assignment not in the reviewer’s queue is null', async () => {
    const f = fake({}, { my_review_queue: { data: [], error: null } })
    expect(await createSupabaseReview(f.client).getWorkspace('nope')).toBeNull()
  })

  it('declares, saves and submits with the contract arguments; a refusal keeps its fields', async () => {
    const f = fake(
      {},
      {
        declare_assignment: { data: { assignment_id: 'a1', has_conflict: false, revoked: false, replayed: false }, error: null },
        save_scorecard: { data: { scorecard_id: 's1', status: 'draft', saved_at: 'x', weighted_score: null }, error: null },
        submit_scorecard: { data: null, error: { message: 'VALIDATION', hint: 'Score every criterion.', details: JSON.stringify({ fields: { innovation: 'Choose a score from 1 to 5' } }) } },
      },
    )
    const port = createSupabaseReview(f.client)
    const items = [{ criterion_id: 'c1', score: 4, reason: 'A reason long enough here.' }]
    expect((await port.declare({ assignmentId: 'a1', hasConflict: false, confidentialityAccepted: true })).kind).toBe('ok')
    expect((await port.saveScorecard({ assignmentId: 'a1', items, overallComment: '' })).kind).toBe('ok')
    expect(await port.submitScorecard({ assignmentId: 'a1', items, overallComment: '' })).toMatchObject({ kind: 'refused', code: 'VALIDATION', fields: { innovation: 'Choose a score from 1 to 5' } })
    expect(f.rpcs).toEqual([
      { fn: 'declare_assignment', args: { p_assignment_id: 'a1', p_has_conflict: false, p_confidentiality_accepted: true } },
      { fn: 'save_scorecard', args: { p_assignment_id: 'a1', p_items: items, p_overall_comment: '' } },
      { fn: 'submit_scorecard', args: { p_assignment_id: 'a1', p_items: items, p_overall_comment: '' } },
    ])
  })

  it('reads the panel through get_score_panel, turns numeric text into numbers, and reads FORBIDDEN as not visible', async () => {
    const panel = {
      proposal_id: 'p1', reference: 'CEDA-2026-0004', version_id: 'v1', version_no: 1,
      criteria: [{ criterion_id: 'c1', key: 'innovation', label: 'Innovation', weight: '30.00', anchors: {} }],
      scorecards: [{ scorecard_id: 's1', assignment_id: 'a1', reviewer_id: 'r1', reviewer_name: 'Demo Reviewer 1', submitted_at: 'x', overall_comment: '', weighted_score: '4.30', items: [] }],
      criteria_summary: [{ criterion_id: 'c1', key: 'innovation', mean: '4.50', min: 4, max: 5, spread: 1, flagged: false }],
      aggregate: { mean_weighted: 4.03, min_weighted: 3.75, max_weighted: 4.3, spread: 0.55, flagged: false },
      submitted_count: 2, quorum: 2, spread_flag_threshold: 2,
    }
    const ok = fake({}, { get_score_panel: { data: panel, error: null } })
    const got = await createSupabaseReview(ok.client).getPanel('p1')
    expect(ok.rpcs[0]).toEqual({ fn: 'get_score_panel', args: { p_proposal_id: 'p1' } })
    expect(got?.criteria[0]?.weight).toBe(30)
    expect(got?.scorecards[0]?.weighted_score).toBe(4.3)
    expect(got?.criteria_summary[0]?.mean).toBe(4.5)
    const forbidden = fake({}, { get_score_panel: { data: null, error: { message: 'FORBIDDEN', hint: 'No access.', details: null } } })
    expect(await createSupabaseReview(forbidden.client).getPanel('p1')).toBeNull()
  })

  it('lists the tasks answered in the scored version with this reviewer’s checks, and verifies with the contract arguments', async () => {
    const f = fake(
      {
        proposals: { data: { current_version_id: 'v2', challenge_versions: { form_schema: { sections: [] }, rubric_version_id: 'r1' } }, error: null },
        proposal_versions: { data: { version_no: 2, data: {}, change_note: 'Added a budget.' }, error: null },
        attachments: { data: [], error: null },
        rubric_criteria: { data: [], error: null },
        scorecards: { data: null, error: null },
        task_verifications: { data: [{ feedback_task_id: 't1', result: 'verified', note: '' }], error: null },
      },
      {
        my_review_queue: { data: [{ ...ROW, version_no: 2, my_status: 'not_started' }], error: null },
        get_roadmap: {
          data: [
            { kind: 'revision', answered_version_no: 1, tasks: [{ task_id: 'old', position: 1, text: 'Old', applicant_status: 'addressed', applicant_explanation: 'x', verifications: [] }] },
            { kind: 'revision', answered_version_no: 2, tasks: [{ task_id: 't1', position: 1, text: 'Add a budget.', applicant_status: 'addressed', applicant_explanation: 'Done.', verifications: [] }, { task_id: 't2', position: 2, text: 'Name the site.', applicant_status: 'not_addressed', applicant_explanation: 'Later.', verifications: [] }] },
          ],
          error: null,
        },
        verify_feedback_task: { data: { task_id: 't2', result: 'not_verified', verified_at: 'x' }, error: null },
      },
    )
    const port = createSupabaseReview(f.client)
    const ws = await port.getWorkspace('a1')
    expect(ws?.change_note).toBe('Added a budget.')
    expect(ws?.tasks.map((t) => [t.task_id, t.my_result])).toEqual([
      ['t1', 'verified'],
      ['t2', null],
    ])
    expect(f.reads.find((r) => r.table === 'task_verifications')?.filters).toContainEqual(['eq', 'assignment_id', 'a1'])
    expect((await port.verifyTask({ taskId: 't2', assignmentId: 'a1', result: 'not_verified', note: 'Missing.' })).kind).toBe('ok')
    expect(f.rpcs).toContainEqual({ fn: 'verify_feedback_task', args: { p_task_id: 't2', p_assignment_id: 'a1', p_result: 'not_verified', p_note: 'Missing.' } })
  })
})

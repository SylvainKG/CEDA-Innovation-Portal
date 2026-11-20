import type { SupabaseClient } from '@supabase/supabase-js'
import { describe, expect, it } from 'vitest'
import { createSupabaseStaff } from './staff'

/** Recording fake: every table read (columns and filters) and RPC call, answered from a script. */
type Result = { data: unknown; error: unknown }
function fake(tables: Record<string, Result>, rpc: Record<string, Result> = {}) {
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
      for (const op of ['eq', 'neq', 'in', 'is', 'not', 'order', 'limit', 'maybeSingle'])
        b[op] = (...args: unknown[]) => {
          read.filters.push([op, ...args])
          return b
        }
      return b
    },
    async rpc(fn: string, args: unknown) {
      rpcs.push({ fn, args })
      return rpc[fn] ?? { data: null, error: null }
    },
  }
  return { client: client as unknown as SupabaseClient, reads, rpcs }
}

const ROW = {
  id: 'p1',
  reference: 'CEDA-2026-0001',
  title: 'Drip kits',
  status: 'submitted',
  submitted_at: '2026-11-10T07:15:00Z',
  updated_at: '2026-11-10T07:15:00Z',
  current_version_id: 'v1',
  challenge_versions: { challenge_id: 'c1', form_schema: { sections: [] }, required_docs: [], challenges: { id: 'c1', title: 'Water-Smart' } },
}

describe('Supabase staff adapter', () => {
  it('lists cases with explicit columns, never drafts, filtered by status in the query', async () => {
    const f = fake({ proposals: { data: [ROW], error: null } })
    const rows = await createSupabaseStaff(f.client).listCases({ statuses: ['submitted'] })
    expect(rows).toEqual([
      { id: 'p1', reference: 'CEDA-2026-0001', title: 'Drip kits', status: 'submitted', challenge: { id: 'c1', title: 'Water-Smart' }, submitted_at: ROW.submitted_at, updated_at: ROW.updated_at },
    ])
    expect(f.reads[0]?.columns).not.toContain('*')
    expect(f.reads[0]?.filters).toContainEqual(['neq', 'status', 'draft'])
    expect(f.reads[0]?.filters).toContainEqual(['in', 'status', ['submitted']])
  })

  it('assembles the case from its version, submitted files, events and assignments; never selects *', async () => {
    const f = fake({
      proposals: { data: ROW, error: null },
      proposal_versions: { data: { version_no: 1, data: { title: 'Drip kits', n: 3 }, submitted_at: ROW.submitted_at, declaration_version: 'v1' }, error: null },
      attachments: { data: [{ id: 'a1', filename: 'plan.pdf', size_bytes: '10', mime: 'application/pdf', doc_key: 'business_plan' }], error: null },
      case_events: { data: [{ from_status: 'draft', to_status: 'submitted', public_stage: 'submission', reason: null, at: ROW.submitted_at }], error: null },
      assignments: { data: [{ id: 's1', reviewer_id: 'r1', assigned_at: 'x', due_at: null, declared_at: null, has_conflict: null, revoked_at: null }], error: null },
      profiles: { data: [], error: null },
    })
    const c = await createSupabaseStaff(f.client).getCase('p1')
    expect(c?.version?.data).toEqual({ title: 'Drip kits' })
    expect(c?.files).toEqual([{ id: 'a1', filename: 'plan.pdf', size_bytes: 10, mime: 'application/pdf', doc_key: 'business_plan' }])
    expect(c?.assignments[0]?.reviewer_name).toBeNull()
    for (const r of f.reads) expect(r.columns, r.table).not.toMatch(/\*/)
    expect(f.reads.find((r) => r.table === 'attachments')?.filters).toContainEqual(['not', 'version_id', 'is', null])
    expect(f.reads.find((r) => r.table === 'attachments')?.columns).not.toContain('storage_path')
  })

  it('a case that is not visible is null', async () => {
    const f = fake({ proposals: { data: null, error: null } })
    expect(await createSupabaseStaff(f.client).getCase('nope')).toBeNull()
  })

  it('records screening with the contract arguments; a refusal is a refusal; an unexpected error throws', async () => {
    const ok = fake({}, { record_screening: { data: { proposal_id: 'p1', status: 'in_evaluation', result: 'eligible' }, error: null } })
    expect(await createSupabaseStaff(ok.client).recordScreening({ proposalId: 'p1', result: 'eligible', reason: 'Fits.' })).toEqual({
      kind: 'ok',
      data: { proposal_id: 'p1', status: 'in_evaluation', result: 'eligible' },
    })
    expect(ok.rpcs[0]).toEqual({ fn: 'record_screening', args: { p_proposal_id: 'p1', p_result: 'eligible', p_reason: 'Fits.' } })
    const refused = fake({}, { record_screening: { data: null, error: { message: 'INVALID_STATE', hint: 'Not submitted.', details: null } } })
    expect(await createSupabaseStaff(refused.client).recordScreening({ proposalId: 'p1', result: 'eligible', reason: 'x' })).toMatchObject({
      kind: 'refused',
      code: 'INVALID_STATE',
    })
    const lost = fake({}, { record_screening: { data: null, error: { message: 'TypeError: Failed to fetch', code: '' } } })
    await expect(createSupabaseStaff(lost.client).recordScreening({ proposalId: 'p1', result: 'eligible', reason: 'x' })).rejects.toThrow()
  })
})

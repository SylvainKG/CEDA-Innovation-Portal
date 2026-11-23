import type { SupabaseClient } from '@supabase/supabase-js'
import { describe, expect, it } from 'vitest'
import { readSupabaseConfig } from './client'
import { createSupabaseSession } from './session'
import { createSupabaseSubmission } from './submission'

/**
 * A fake Supabase client. It records every table read (columns and filters), RPC call and upload, and answers
 * from a script. These tests prove the adapter asks for the right things and maps the answers; what the server
 * allows is proved by Stacey's pgTAP suites, not here.
 */
type Result = { data: unknown; error: unknown }
interface Read {
  table: string
  columns?: string
  filters: [string, ...unknown[]][]
}

function fakeClient(script: {
  tables?: Record<string, Result | Result[]>
  rpc?: Record<string, Result | Result[]>
  upload?: Result
  session?: { user: { id: string; email?: string } } | null
}) {
  const reads: Read[] = []
  const rpcs: { fn: string; args: unknown }[] = []
  const uploads: { bucket: string; path: string; options: unknown }[] = []
  const take = (entry: Result | Result[] | undefined): Result => {
    if (!entry) return { data: null, error: null }
    if (Array.isArray(entry)) return entry.length > 1 ? (entry.shift() as Result) : (entry[0] as Result)
    return entry
  }

  const client = {
    from(table: string) {
      const read: Read = { table, filters: [] }
      reads.push(read)
      const builder: Record<string, unknown> = {
        select(columns: string) {
          read.columns = columns
          return builder
        },
        then(resolve: (r: Result) => unknown, reject: (e: unknown) => unknown) {
          return Promise.resolve(take(script.tables?.[table])).then(resolve, reject)
        },
      }
      for (const op of ['eq', 'neq', 'in', 'is', 'not', 'order', 'limit', 'maybeSingle'])
        builder[op] = (...args: unknown[]) => {
          read.filters.push([op, ...args])
          return builder
        }
      return builder
    },
    async rpc(fn: string, args?: unknown) {
      rpcs.push({ fn, args })
      return take(script.rpc?.[fn])
    },
    storage: {
      from(bucket: string) {
        return {
          getPublicUrl: (path: string) => ({ data: { publicUrl: `https://project.example.test/storage/v1/object/public/${bucket}/${path}` } }),
          upload: async (path: string, _file: unknown, options: unknown) => {
            uploads.push({ bucket, path, options })
            return script.upload ?? { data: { path }, error: null }
          },
        }
      },
    },
    auth: {
      getSession: async () => ({ data: { session: script.session ?? null }, error: null }),
    },
  }
  return { client: client as unknown as SupabaseClient, reads, rpcs, uploads }
}

const refusal = (code: string, hint: string, fields?: Record<string, string>) => ({
  data: null,
  error: { code: 'P0001', message: code, hint, details: fields ? JSON.stringify({ fields }) : null },
})
const networkError = { data: null, error: { message: 'TypeError: Failed to fetch', details: '', hint: '', code: '' } }

const CHALLENGE_ROW = {
  id: 'c1',
  slug: 'water-smart',
  title: 'Water-Smart',
  summary: 'S',
  audience: 'A',
  status: 'published',
  opens_at: '2026-10-01T00:00:00Z',
  closes_at: '2026-12-31T14:00:00Z',
}
const pdf = (size = 10) => new File([new Uint8Array(size)], 'plan.pdf', { type: 'application/pdf' })

describe('Supabase configuration', () => {
  it('needs both values and an https URL (http only for a local stack)', () => {
    expect(() => readSupabaseConfig({})).toThrow(/VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY/)
    expect(() => readSupabaseConfig({ VITE_SUPABASE_URL: 'http://evil.example', VITE_SUPABASE_ANON_KEY: 'k' })).toThrow(/https/)
    expect(() => readSupabaseConfig({ VITE_SUPABASE_URL: 'http://localhost.attacker.example', VITE_SUPABASE_ANON_KEY: 'k' })).toThrow(/https/)
    expect(() => readSupabaseConfig({ VITE_SUPABASE_URL: 'http://127.0.0.1.attacker.example', VITE_SUPABASE_ANON_KEY: 'k' })).toThrow(/https/)
    expect(() => readSupabaseConfig({ VITE_SUPABASE_URL: 'https://user:pass@project.supabase.co', VITE_SUPABASE_ANON_KEY: 'k' })).toThrow(/https/)
    expect(readSupabaseConfig({ VITE_SUPABASE_URL: 'http://localhost:54321', VITE_SUPABASE_ANON_KEY: 'k' }).url).toBe('http://localhost:54321')
    expect(readSupabaseConfig({ VITE_SUPABASE_URL: 'http://127.0.0.1:54321', VITE_SUPABASE_ANON_KEY: 'k' }).url).toBe('http://127.0.0.1:54321')
  })
})

describe('Supabase session adapter', () => {
  it('is signed out without an auth session, and never calls my_access', async () => {
    const f = fakeClient({ session: null })
    expect(await createSupabaseSession(f.client).getSession()).toBeNull()
    expect(f.rpcs).toHaveLength(0)
  })

  it('takes roles from my_access (dropping unknown keys) and the name from the own profile', async () => {
    const f = fakeClient({
      session: { user: { id: 'u1', email: 'a@example.test' } },
      rpc: { my_access: { data: { user_id: 'u1', is_demo: true, roles: ['applicant', 'not_a_role'] }, error: null } },
      tables: { profiles: { data: { full_name: 'Demo Applicant A' }, error: null } },
    })
    expect(await createSupabaseSession(f.client).getSession()).toEqual({
      id: 'u1',
      displayName: 'Demo Applicant A',
      roles: ['applicant'],
      isDemo: true,
    })
    expect(f.reads[0]).toMatchObject({ table: 'profiles', columns: 'full_name', filters: [['eq', 'id', 'u1'], ['maybeSingle']] })
  })
})

describe('Supabase submission adapter: reads', () => {
  it('lists only published and closed challenges, filtered in the query, with explicit columns', async () => {
    const f = fakeClient({ tables: { challenges: { data: [CHALLENGE_ROW, { ...CHALLENGE_ROW, id: 'c2', status: 'closed' }], error: null } } })
    const list = await createSupabaseSubmission(f.client).listChallenges()
    expect(list.map((c) => c.status)).toEqual(['published', 'closed'])
    expect(f.reads[0]?.columns).not.toContain('*')
    expect(f.reads[0]?.filters).toContainEqual(['in', 'status', ['published', 'closed']])
  })

  it('never selects * anywhere', async () => {
    const f = fakeClient({
      tables: {
        challenges: { data: CHALLENGE_ROW, error: null },
        challenge_versions: { data: { id: 'v1', version_no: 2, form_schema: { sections: [] }, required_docs: [], brief_md: '', template_files: [], rubric_version_id: 'r1' }, error: null },
        rubric_criteria: { data: [], error: null },
        content_pages: { data: { title: 'D', body_md: 'B', version: 'v1', is_sample: true }, error: null },
        proposals: { data: null, error: null },
      },
    })
    const port = createSupabaseSubmission(f.client)
    await port.getChallengeBrief('water-smart')
    await port.getChallengeForm('c1')
    await port.getDeclaration()
    await port.getDraft('p1')
    for (const read of f.reads) expect(read.columns, read.table).not.toMatch(/\*/)
  })

  it('builds the brief from the latest published version, criteria without anchors, and public template URLs', async () => {
    const f = fakeClient({
      tables: {
        challenges: { data: CHALLENGE_ROW, error: null },
        challenge_versions: {
          data: { brief_md: '**Brief**', template_files: [{ name: 'T.docx', path: 'water-smart/t.docx' }, { bad: true }], rubric_version_id: 'r1' },
          error: null,
        },
        rubric_criteria: { data: [{ key: 'impact', label: 'Impact', weight: '30.00', guidance: 'G' }], error: null },
      },
    })
    const port = createSupabaseSubmission(f.client)
    const brief = await port.getChallengeBrief('water-smart')
    expect(brief?.criteria).toEqual([{ key: 'impact', label: 'Impact', weight: 30, guidance: 'G' }])
    expect(brief?.templates).toEqual([{ name: 'T.docx', path: 'water-smart/t.docx' }])
    const versionRead = f.reads.find((r) => r.table === 'challenge_versions')
    expect(versionRead?.filters).toContainEqual(['not', 'published_at', 'is', null])
    expect(versionRead?.filters).toContainEqual(['order', 'version_no', { ascending: false }])
    expect(f.reads.find((r) => r.table === 'rubric_criteria')?.columns).not.toContain('anchors')
    expect(port.templateUrl('water-smart/t.docx')).toBe('https://project.example.test/storage/v1/object/public/challenge-files/water-smart/t.docx')
  })

  it('treats a missing challenge or version as Not found', async () => {
    const f = fakeClient({ tables: { challenges: { data: null, error: null } } })
    expect(await createSupabaseSubmission(f.client).getChallengeBrief('nope')).toBeNull()
    expect(await createSupabaseSubmission(f.client).getChallengeForm('nope')).toBeNull()
  })

  it('maps the form: version number, schema and required documents', async () => {
    const f = fakeClient({
      tables: {
        challenges: { data: { ...CHALLENGE_ROW, status: 'draft' }, error: null },
        challenge_versions: { data: { id: 'v1', version_no: 3, form_schema: { sections: [] }, required_docs: [{ key: 'budget', label: 'Budget', required: true }] }, error: null },
      },
    })
    const form = await createSupabaseSubmission(f.client).getChallengeForm('c1')
    expect(form).toMatchObject({ challenge_version_id: 'v1', form_version: 3, status: 'unpublished', required_docs: [{ key: 'budget' }] })
  })

  it('reads a draft with its unsubmitted files only, and returns null for a submitted or unreadable case', async () => {
    const draftRow = {
      id: 'p1',
      title: 'Mine',
      status: 'draft',
      challenge_versions: { challenge_id: 'c1' },
      proposal_drafts: { data: { title: 'Mine', count: 3 }, updated_at: '2026-11-18T10:00:00Z' },
    }
    const f = fakeClient({
      tables: {
        proposals: [{ data: draftRow, error: null }, { data: { ...draftRow, status: 'submitted' }, error: null }],
        attachments: { data: [{ id: 'a1', filename: 'plan.pdf', size_bytes: '10', mime: 'application/pdf', doc_key: null }], error: null },
      },
    })
    const port = createSupabaseSubmission(f.client)
    const draft = await port.getDraft('p1')
    expect(draft).toMatchObject({ proposal_id: 'p1', challenge_id: 'c1', data: { title: 'Mine' }, files: [{ id: 'a1', size_bytes: 10 }] })
    expect(draft?.data).not.toHaveProperty('count')
    const files = f.reads.find((r) => r.table === 'attachments')
    expect(files?.filters).toContainEqual(['is', 'version_id', null])
    expect(files?.columns).not.toContain('storage_path')
    expect(await port.getDraft('p1')).toBeNull()
  })

  it('reads My ideas through list_my_ideas()', async () => {
    const f = fakeClient({ rpc: { list_my_ideas: { data: [{ id: 'p1' }], error: null } } })
    expect(await createSupabaseSubmission(f.client).listMyIdeas()).toEqual([{ id: 'p1' }])
    expect(f.rpcs[0]?.fn).toBe('list_my_ideas')
  })

  it('throws for a failed read so the page shows its error state', async () => {
    const f = fakeClient({ tables: { challenges: networkError } })
    await expect(createSupabaseSubmission(f.client).listChallenges()).rejects.toThrow(/Could not load challenges/)
  })
})

describe('Supabase submission adapter: commands', () => {
  it('saves a new draft with the challenge id and an existing one without it', async () => {
    const f = fakeClient({ rpc: { save_draft: { data: { proposal_id: 'p1', saved_at: 'now', title: '' }, error: null } } })
    const port = createSupabaseSubmission(f.client)
    expect((await port.saveDraft({ data: { title: 'x' }, challengeId: 'c1' })).kind).toBe('ok')
    await port.saveDraft({ data: { title: 'y' }, proposalId: 'p1', challengeId: 'c1' })
    expect(f.rpcs.map((r) => r.args)).toEqual([
      { p_data: { title: 'x' }, p_proposal_id: null, p_challenge_id: 'c1' },
      { p_data: { title: 'y' }, p_proposal_id: 'p1', p_challenge_id: null },
    ])
  })

  it('a save refusal is a refusal; a lost save reply throws (autosave keeps the answers on the device)', async () => {
    const f = fakeClient({ rpc: { save_draft: [refusal('CHALLENGE_CLOSED', 'Closed.'), networkError] } })
    const port = createSupabaseSubmission(f.client)
    expect(await port.saveDraft({ data: {}, challengeId: 'c1' })).toMatchObject({ kind: 'refused', code: 'CHALLENGE_CLOSED', message: 'Closed.' })
    await expect(port.saveDraft({ data: {}, challengeId: 'c1' })).rejects.toThrow()
  })

  it('uploads to <proposal>/<uuid>.<ext> without the user file name, then registers it', async () => {
    const f = fakeClient({
      rpc: { register_attachment: { data: { id: 'a1', filename: 'plan.pdf', size_bytes: 10, mime: 'application/pdf', doc_key: 'budget', proposal_id: 'p1', uploaded_by: 'u1' }, error: null } },
    })
    const outcome = await createSupabaseSubmission(f.client).uploadAttachment({ proposalId: 'p1', file: pdf(), docKey: 'budget' })
    expect(outcome).toEqual({ kind: 'ok', data: { id: 'a1', filename: 'plan.pdf', size_bytes: 10, mime: 'application/pdf', doc_key: 'budget' } })
    const path = f.uploads[0]?.path ?? ''
    expect(f.uploads[0]?.bucket).toBe('proposal-files')
    expect(path).toMatch(/^p1\/[0-9a-f-]{36}\.pdf$/)
    expect(f.uploads[0]?.options).toEqual({ contentType: 'application/pdf', upsert: false })
    expect(f.rpcs[0]?.args).toEqual({ p_proposal_id: 'p1', p_storage_path: path, p_filename: 'plan.pdf', p_doc_key: 'budget' })
  })

  it('refuses a wrong type or size before uploading anything', async () => {
    const f = fakeClient({})
    const port = createSupabaseSubmission(f.client)
    const exe = new File(['x'], 'run.exe', { type: 'application/x-msdownload' })
    expect(await port.uploadAttachment({ proposalId: 'p1', file: exe })).toMatchObject({ kind: 'refused', code: 'VALIDATION', fields: { file: 'Unsupported file type' } })
    expect(await port.uploadAttachment({ proposalId: 'p1', file: pdf(10 * 1024 * 1024 + 1) })).toMatchObject({ fields: { file: 'Files must be 10 MB or smaller' } })
    expect(f.uploads).toHaveLength(0)
  })

  it('retries registration once after a lost reply (idempotent by path), with the same path', async () => {
    const f = fakeClient({
      rpc: { register_attachment: [networkError, { data: { id: 'a1', filename: 'plan.pdf', size_bytes: 10, mime: 'application/pdf', doc_key: null }, error: null }] },
    })
    expect((await createSupabaseSubmission(f.client).uploadAttachment({ proposalId: 'p1', file: pdf() })).kind).toBe('ok')
    expect(f.rpcs).toHaveLength(2)
    expect((f.rpcs[0]?.args as { p_storage_path: string }).p_storage_path).toBe((f.rpcs[1]?.args as { p_storage_path: string }).p_storage_path)
  })

  it('does not retry a refused registration, and maps a storage policy denial to a refusal', async () => {
    const f = fakeClient({ rpc: { register_attachment: refusal('INVALID_STATE', 'Files can only be added to a draft.') } })
    expect(await createSupabaseSubmission(f.client).uploadAttachment({ proposalId: 'p1', file: pdf() })).toMatchObject({ kind: 'refused', code: 'INVALID_STATE' })
    expect(f.rpcs).toHaveLength(1)
    // The body hosted Storage sends for a policy denial (HTTP 400), as observed by Stacey on 18 Nov.
    const denied = fakeClient({
      upload: { data: null, error: { statusCode: '403', error: 'Unauthorized', message: 'new row violates row-level security policy' } },
    })
    expect(await createSupabaseSubmission(denied.client).uploadAttachment({ proposalId: 'p1', file: pdf() })).toMatchObject({ kind: 'refused', code: 'INVALID_STATE' })
    expect(denied.rpcs).toHaveLength(0)
  })

  it('treats any other storage 4xx as a plain upload failure, not "your own draft"', async () => {
    const bad = fakeClient({ upload: { data: null, error: { statusCode: '400', error: 'Bad Request', message: 'Invalid key' } } })
    await expect(createSupabaseSubmission(bad.client).uploadAttachment({ proposalId: 'p1', file: pdf() })).rejects.toThrow(/did not upload/)
    expect(bad.rpcs).toHaveLength(0)
  })

  it('submits with the request key; a refusal is refused, a lost or odd reply is UNKNOWN with the same key', async () => {
    const receipt = { proposal_id: 'p1', reference: 'CEDA-2026-0009', status: 'submitted' }
    const f = fakeClient({
      rpc: { submit_proposal: [{ data: receipt, error: null }, refusal('VALIDATION', 'Some answers need attention.', { 'doc:budget': 'Required' }), networkError, { data: null, error: null }] },
    })
    const port = createSupabaseSubmission(f.client)
    const input = { proposalId: 'p1', clientRequestId: 'k1', declarationVersion: 'v1' }
    expect(await port.submitProposal(input)).toEqual({ kind: 'ok', data: receipt })
    expect(f.rpcs[0]?.args).toEqual({ p_proposal_id: 'p1', p_client_request_id: 'k1', p_declaration_version: 'v1' })
    expect(await port.submitProposal(input)).toMatchObject({ kind: 'refused', code: 'VALIDATION', fields: { 'doc:budget': 'Required' } })
    expect(await port.submitProposal(input)).toEqual({ kind: 'unknown', requestKey: 'k1' })
    expect(await port.submitProposal(input)).toEqual({ kind: 'unknown', requestKey: 'k1' })
  })

  it('a thrown submit is UNKNOWN, never failed', async () => {
    const f = fakeClient({})
    ;(f.client as unknown as { rpc: () => Promise<never> }).rpc = () => Promise.reject(new Error('offline'))
    expect(await createSupabaseSubmission(f.client).submitProposal({ proposalId: 'p1', clientRequestId: 'k1', declarationVersion: 'v1' })).toEqual({ kind: 'unknown', requestKey: 'k1' })
  })

  it('looks a receipt up by key or by case, passing exactly one; a refusal reads as not found', async () => {
    const f = fakeClient({
      rpc: { get_submission_receipt: [{ data: { found: true, proposal_id: 'p1' }, error: null }, { data: { found: false }, error: null }, refusal('FORBIDDEN', 'Sign in first.'), networkError] },
    })
    const port = createSupabaseSubmission(f.client)
    expect(await port.getSubmissionReceipt({ clientRequestId: 'k1' })).toMatchObject({ found: true, proposal_id: 'p1' })
    expect(await port.getSubmissionReceipt({ proposalId: 'p1', versionNo: 2 })).toEqual({ found: false })
    expect(f.rpcs.map((r) => r.args)).toEqual([
      { p_proposal_id: null, p_client_request_id: 'k1', p_version_no: null },
      { p_proposal_id: 'p1', p_client_request_id: null, p_version_no: 2 },
    ])
    expect(await port.getSubmissionReceipt({ proposalId: 'p1' })).toEqual({ found: false })
    await expect(port.getSubmissionReceipt({ proposalId: 'p1' })).rejects.toThrow()
  })

  it('removes an attachment through the RPC', async () => {
    const f = fakeClient({ rpc: { remove_attachment: [{ data: { id: 'a1', removed: true }, error: null }, refusal('INVALID_STATE', 'Submitted files cannot be removed.')] } })
    const port = createSupabaseSubmission(f.client)
    expect(await port.removeAttachment('a1')).toEqual({ kind: 'ok', data: { id: 'a1', removed: true } })
    expect(await port.removeAttachment('a1')).toMatchObject({ kind: 'refused', code: 'INVALID_STATE' })
  })
})

describe('Supabase submission adapter: the applicant’s own case', () => {
  it('never asks the case history for reasons except the closure one, and reads only a published decision', async () => {
    const f = fakeClient({
      tables: {
        proposals: { data: { id: 'p1', reference: 'CEDA-2026-0009', title: 'T', status: 'closed', submitted_at: 'a', current_version_id: 'v1', challenge_versions: { challenge_id: 'c1', form_schema: { sections: [] }, challenges: { id: 'c1', title: 'W' } } }, error: null },
        proposal_versions: { data: { version_no: 1, data: { title: 'T' } }, error: null },
        attachments: { data: [], error: null },
        case_events: [{ data: [{ public_stage: 'submission', at: 'a' }], error: null }, { data: { reason: 'Outside the scope.', at: 'b' }, error: null }],
        decisions: { data: null, error: null },
        awards: { data: null, error: null },
      },
    })
    const c = await createSupabaseSubmission(f.client).getMyCase('p1')
    expect(c?.closed_reason).toBe('Outside the scope.')
    const events = f.reads.filter((r) => r.table === 'case_events')
    expect(events[0]?.columns).toBe('public_stage, at')
    expect(events[1]?.filters).toContainEqual(['eq', 'to_status', 'closed'])
    const decision = f.reads.find((r) => r.table === 'decisions')
    expect(decision?.filters).toEqual(expect.arrayContaining([['not', 'published_at', 'is', null], ['is', 'superseded_at', null]]))
    expect(f.reads.find((r) => r.table === 'proposals')?.filters).toContainEqual(['neq', 'status', 'draft'])
    for (const r of f.reads) expect(r.columns, r.table).not.toMatch(/\*/)
  })
})

describe('Supabase submission adapter: revision (V2)', () => {
  const responses = [{ task_id: 't1', status: 'addressed' as const, explanation: 'Done.' }]
  const base = { proposalId: 'p1', clientRequestId: 'k2', changeNote: 'Changed.', taskResponses: responses, declarationVersion: 'v1' }

  it('saves the working copy only when edited, then submits with the contract arguments', async () => {
    const f = fakeClient({ rpc: { save_draft: { data: { proposal_id: 'p1' }, error: null }, submit_revision: { data: { proposal_id: 'p1', version_no: 2 }, error: null } } })
    const port = createSupabaseSubmission(f.client)
    expect(await port.submitRevision({ ...base, data: { summary: 'New' } })).toMatchObject({ kind: 'ok', data: { version_no: 2 } })
    expect(f.rpcs).toEqual([
      { fn: 'save_draft', args: { p_data: { summary: 'New' }, p_proposal_id: 'p1', p_challenge_id: null } },
      { fn: 'submit_revision', args: { p_proposal_id: 'p1', p_client_request_id: 'k2', p_change_note: 'Changed.', p_task_responses: responses, p_declaration_version: 'v1' } },
    ])
    const g = fakeClient({ rpc: { submit_revision: { data: { proposal_id: 'p1', version_no: 2 }, error: null } } })
    await createSupabaseSubmission(g.client).submitRevision({ ...base, data: null })
    expect(g.rpcs.map((r) => r.fn)).toEqual(['submit_revision'])
  })

  it('a refusal keeps its fields; a lost reply is UNKNOWN with the same key', async () => {
    const refusedOnce = fakeClient({ rpc: { submit_revision: refusal('VALIDATION', 'Answer every task.', { 'task:1': 'Mark this task Addressed or Not addressed' }) } })
    expect(await createSupabaseSubmission(refusedOnce.client).submitRevision({ ...base, data: null })).toMatchObject({ kind: 'refused', fields: { 'task:1': 'Mark this task Addressed or Not addressed' } })
    const lost = fakeClient({ rpc: { submit_revision: networkError } })
    expect(await createSupabaseSubmission(lost.client).submitRevision({ ...base, data: null })).toEqual({ kind: 'unknown', requestKey: 'k2' })
  })
})

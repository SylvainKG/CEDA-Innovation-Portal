import type { SupabaseClient } from '@supabase/supabase-js'
import { ApiError, fromRpcError } from '../errors'
import type { StaffPort } from '../staff'
import type {
  AttachmentInfo,
  CaseAssignment,
  CaseEvent,
  CaseStatus,
  DraftData,
  FormSchema,
  PublicStage,
  RequiredDoc,
  ScreeningOutcome,
  StaffCaseRow,
} from '../types'

/**
 * Supabase staff adapter (Slice 2). Explicit columns only (never `*`); drafts are filtered out in the query as
 * well as by RLS. Reviewer names come from `profiles`, which only `role.manage` holders (admins) may read; for
 * anyone else the names are simply absent and the screen says "Reviewer".
 */
const CASE_COLUMNS = 'id, reference, title, status, submitted_at, updated_at, challenge_versions(challenge_id, challenges(id, title))'
const CASE_DETAIL_COLUMNS =
  'id, reference, title, status, submitted_at, updated_at, current_version_id, challenge_versions(challenge_id, form_schema, required_docs, challenges(id, title))'

interface CaseRowRaw {
  id: string
  reference: string | null
  title: string
  status: CaseStatus
  submitted_at: string | null
  updated_at: string
  challenge_versions: { challenge_id: string; challenges: { id: string; title: string } | null } | null
}

function toRow(r: CaseRowRaw): StaffCaseRow {
  const challenge = r.challenge_versions?.challenges
  return {
    id: r.id,
    reference: r.reference ?? '',
    title: r.title,
    status: r.status,
    challenge: { id: challenge?.id ?? r.challenge_versions?.challenge_id ?? '', title: challenge?.title ?? '' },
    submitted_at: r.submitted_at ?? r.updated_at,
    updated_at: r.updated_at,
  }
}

function toDraftData(value: unknown): DraftData {
  const out: DraftData = {}
  if (value && typeof value === 'object') for (const [k, v] of Object.entries(value)) if (typeof v === 'string') out[k] = v
  return out
}

function readFailed(what: string, error: unknown): never {
  throw new ApiError(`Could not load ${what}`, error)
}

export function createSupabaseStaff(client: SupabaseClient): StaffPort {
  return {
    async listCases(filter) {
      let query = client.from('proposals').select(CASE_COLUMNS).neq('status', 'draft').is('deleted_at', null)
      if (filter?.statuses?.length) query = query.in('status', filter.statuses)
      const { data, error } = await query.order('submitted_at', { ascending: true }).limit(500)
      if (error) readFailed('cases', error)
      return ((data ?? []) as unknown as CaseRowRaw[]).map(toRow)
    },

    async getCase(proposalId) {
      const head = await client
        .from('proposals')
        .select(CASE_DETAIL_COLUMNS)
        .eq('id', proposalId)
        .neq('status', 'draft')
        .maybeSingle()
      if (head.error) readFailed('the case', head.error)
      if (!head.data) return null
      const raw = head.data as unknown as CaseRowRaw & {
        current_version_id: string | null
        challenge_versions: (CaseRowRaw['challenge_versions'] & { form_schema: FormSchema; required_docs: RequiredDoc[] }) | null
      }

      const [version, files, events, assignments] = await Promise.all([
        raw.current_version_id
          ? client
              .from('proposal_versions')
              .select('version_no, data, submitted_at, declaration_version')
              .eq('id', raw.current_version_id)
              .maybeSingle()
          : Promise.resolve({ data: null, error: null }),
        client
          .from('attachments')
          .select('id, filename, size_bytes, mime, doc_key')
          .eq('proposal_id', proposalId)
          .not('version_id', 'is', null)
          .is('deleted_at', null)
          .order('created_at', { ascending: true }),
        client
          .from('case_events')
          .select('from_status, to_status, public_stage, reason, at')
          .eq('proposal_id', proposalId)
          .order('at', { ascending: true }),
        client
          .from('assignments')
          .select('id, reviewer_id, assigned_at, due_at, declared_at, has_conflict, revoked_at')
          .eq('proposal_id', proposalId)
          .order('assigned_at', { ascending: true }),
      ])
      for (const [what, res] of [['the submitted version', version], ['files', files], ['the timeline', events], ['reviewers', assignments]] as const)
        if (res.error) readFailed(what, res.error)

      const assignmentRows = (assignments.data ?? []) as Omit<CaseAssignment, 'reviewer_name'>[]
      const names = new Map<string, string>()
      if (assignmentRows.length > 0) {
        // Only admins may read other people's profiles; for others this returns nothing, which is fine.
        const profiles = await client.from('profiles').select('id, full_name').in('id', [...new Set(assignmentRows.map((a) => a.reviewer_id))])
        for (const p of (profiles.data ?? []) as { id: string; full_name: string }[]) if (p.full_name?.trim()) names.set(p.id, p.full_name.trim())
      }

      const v = version.data as { version_no: number; data: unknown; submitted_at: string; declaration_version: string } | null
      return {
        ...toRow(raw),
        version: v ? { version_no: v.version_no, submitted_at: v.submitted_at, data: toDraftData(v.data), declaration_version: v.declaration_version } : null,
        form_schema: raw.challenge_versions?.form_schema ?? { sections: [] },
        required_docs: raw.challenge_versions?.required_docs ?? [],
        files: ((files.data ?? []) as Record<string, unknown>[]).map(
          (f): AttachmentInfo => ({
            id: String(f.id),
            filename: String(f.filename),
            size_bytes: Number(f.size_bytes),
            mime: String(f.mime),
            doc_key: typeof f.doc_key === 'string' ? f.doc_key : null,
          }),
        ),
        events: ((events.data ?? []) as Record<string, unknown>[]).map(
          (e): CaseEvent => ({
            from_status: (e.from_status as CaseStatus | null) ?? null,
            to_status: e.to_status as CaseStatus,
            public_stage: (e.public_stage as PublicStage | null) ?? null,
            reason: typeof e.reason === 'string' ? e.reason : null,
            at: String(e.at),
          }),
        ),
        assignments: assignmentRows.map((a) => ({ ...a, reviewer_name: names.get(a.reviewer_id) ?? null })),
      }
    },

    async recordScreening({ proposalId, result, reason }) {
      // No request key: an unexpected error throws, and the screen re-reads the case to see what happened.
      const { data, error } = await client.rpc('record_screening', { p_proposal_id: proposalId, p_result: result, p_reason: reason })
      if (error) return fromRpcError(error)
      return { kind: 'ok', data: data as ScreeningOutcome }
    },
  }
}

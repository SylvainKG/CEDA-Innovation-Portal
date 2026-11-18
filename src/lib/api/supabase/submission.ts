import type { SupabaseClient } from '@supabase/supabase-js'
import { ApiError, fromRpcError, isRefusal, rpcError } from '../errors'
import { newRequestId } from '../request-key'
import type { SubmissionPort } from '../submission'
import type {
  AttachmentInfo,
  ChallengeForm,
  ChallengeSummary,
  CommandOutcome,
  DraftData,
  FormSchema,
  MyIdea,
  ReceiptLookup,
  RequiredDoc,
  SaveDraftResult,
  SubmissionReceipt,
} from '../types'

/**
 * Supabase Slice 1 adapter. Each method is the read or RPC named in the port's table
 * (src/lib/api/submission.ts), so the screens behave the same as with the mock.
 *
 * Rules from the contract and Stacey's review of PR #38:
 * - explicit columns only, never `select *` (so a new staff-only column can never leak into the app);
 * - challenge lists filter `status in ('published','closed')` in the query, not only through RLS;
 * - a known error code is a refusal (nothing changed); anything else on a keyed command is UNKNOWN.
 */

const LISTED = ['published', 'closed'] as const
const CHALLENGE_COLUMNS = 'id, slug, title, summary, audience, status, opens_at, closes_at'
const ATTACHMENT_COLUMNS = 'id, filename, size_bytes, mime, doc_key'

/** Storage object names end in an extension the upload policy allows (migration 002). */
const EXT_BY_MIME: Record<string, string> = {
  'application/pdf': 'pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  'image/png': 'png',
  'image/jpeg': 'jpg',
}
const MAX_BYTES = 10 * 1024 * 1024

const ok = <T,>(data: T): CommandOutcome<T> => ({ kind: 'ok', data })
const refused = (...args: Parameters<typeof rpcError>): CommandOutcome<never> => fromRpcError(rpcError(...args))

/** `challenges.status` also has `draft`, which the app treats like `unpublished` (not accepting, not listed). */
function listedStatus(status: string): ChallengeSummary['status'] {
  return status === 'published' || status === 'closed' ? status : 'unpublished'
}

function toSummary(row: Record<string, unknown>): ChallengeSummary {
  return {
    id: String(row.id),
    slug: String(row.slug),
    title: String(row.title),
    summary: String(row.summary ?? ''),
    audience: String(row.audience ?? ''),
    status: listedStatus(String(row.status)),
    opens_at: String(row.opens_at),
    closes_at: String(row.closes_at),
  }
}

function toAttachment(row: Record<string, unknown>): AttachmentInfo {
  return {
    id: String(row.id),
    filename: String(row.filename),
    size_bytes: Number(row.size_bytes),
    mime: String(row.mime),
    doc_key: typeof row.doc_key === 'string' ? row.doc_key : null,
  }
}

/** `save_draft` stores only strings for schema keys; anything else is dropped rather than shown oddly. */
function toDraftData(value: unknown): DraftData {
  const out: DraftData = {}
  if (value && typeof value === 'object') for (const [k, v] of Object.entries(value)) if (typeof v === 'string') out[k] = v
  return out
}

function readFailed(what: string, error: unknown): never {
  throw new ApiError(`Could not load ${what}`, error)
}

export function createSupabaseSubmission(client: SupabaseClient): SubmissionPort {
  /** Latest published version of a challenge (RLS also lets an applicant read the version of their own case). */
  async function latestVersion(challengeId: string, columns: string) {
    const { data, error } = await client
      .from('challenge_versions')
      .select(columns)
      .eq('challenge_id', challengeId)
      .not('published_at', 'is', null)
      .order('version_no', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (error) readFailed('the challenge', error)
    return data as Record<string, unknown> | null
  }

  async function register(input: { proposalId: string; path: string; filename: string; docKey?: string }) {
    return client.rpc('register_attachment', {
      p_proposal_id: input.proposalId,
      p_storage_path: input.path,
      p_filename: input.filename,
      p_doc_key: input.docKey ?? null,
    })
  }

  return {
    async listChallenges() {
      const { data, error } = await client
        .from('challenges')
        .select(CHALLENGE_COLUMNS)
        .in('status', [...LISTED])
        .order('closes_at', { ascending: true })
      if (error) readFailed('challenges', error)
      return (data ?? []).map((row) => toSummary(row as Record<string, unknown>))
    },

    templateUrl(path) {
      // Public bucket (contract §5): a plain URL, no request and no secret.
      return client.storage.from('challenge-files').getPublicUrl(path).data.publicUrl || null
    },

    async getChallengeBrief(slug) {
      const challenge = await client.from('challenges').select(CHALLENGE_COLUMNS).eq('slug', slug).in('status', [...LISTED]).maybeSingle()
      if (challenge.error) readFailed('the challenge', challenge.error)
      if (!challenge.data) return null
      const summary = toSummary(challenge.data as Record<string, unknown>)

      const version = await latestVersion(summary.id, 'brief_md, template_files, rubric_version_id')
      if (!version) return null

      // Labels, weights and guidance only: the scoring anchors stay with the evaluators.
      const criteria = await client
        .from('rubric_criteria')
        .select('key, label, weight, guidance')
        .eq('rubric_version_id', String(version.rubric_version_id))
        .order('position', { ascending: true })
      if (criteria.error) readFailed('the criteria', criteria.error)

      const templates = Array.isArray(version.template_files) ? version.template_files : []
      return {
        challenge: summary,
        brief_md: String(version.brief_md ?? ''),
        templates: templates
          .filter((t): t is { name: string; path: string } => !!t && typeof t.name === 'string' && typeof t.path === 'string')
          .map((t) => ({ name: t.name, path: t.path })),
        criteria: (criteria.data ?? []).map((c) => {
          const row = c as Record<string, unknown>
          return { key: String(row.key), label: String(row.label), weight: Number(row.weight), guidance: String(row.guidance ?? '') }
        }),
      }
    },

    async getChallengeForm(challengeId) {
      const challenge = await client.from('challenges').select(CHALLENGE_COLUMNS).eq('id', challengeId).maybeSingle()
      if (challenge.error) readFailed('the challenge', challenge.error)
      if (!challenge.data) return null
      const summary = toSummary(challenge.data as Record<string, unknown>)
      const version = await latestVersion(challengeId, 'id, version_no, form_schema, required_docs')
      if (!version) return null
      const form: ChallengeForm = {
        challenge_id: summary.id,
        challenge_version_id: String(version.id),
        title: summary.title,
        status: summary.status,
        opens_at: summary.opens_at,
        closes_at: summary.closes_at,
        form_version: Number(version.version_no),
        form_schema: version.form_schema as FormSchema,
        required_docs: (Array.isArray(version.required_docs) ? version.required_docs : []) as RequiredDoc[],
      }
      return form
    },

    async getDeclaration() {
      // Same choice as the server's current_notice_version('declaration'): the latest published one.
      const { data, error } = await client
        .from('content_pages')
        .select('title, body_md, version, is_sample')
        .eq('kind', 'declaration')
        .eq('status', 'published')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (error) readFailed('the declaration', error)
      const row = data as { title: string; body_md: string; version: string | null; is_sample: boolean } | null
      if (!row?.version) throw new ApiError('No declaration is published')
      return { version: row.version, title: row.title, body_md: row.body_md, is_sample: row.is_sample }
    },

    async getDraft(proposalId) {
      const proposal = await client
        .from('proposals')
        .select('id, title, status, challenge_versions(challenge_id), proposal_drafts(data, updated_at)')
        .eq('id', proposalId)
        .maybeSingle()
      if (proposal.error) readFailed('your draft', proposal.error)
      const row = proposal.data as {
        id: string
        title: string
        status: string
        challenge_versions: { challenge_id: string } | null
        proposal_drafts: { data: unknown; updated_at: string } | null
      } | null
      // proposal_drafts is readable by the owner only, so a missing draft row also means "not yours".
      if (!row || row.status !== 'draft' || !row.proposal_drafts || !row.challenge_versions) return null

      const files = await client
        .from('attachments')
        .select(ATTACHMENT_COLUMNS)
        .eq('proposal_id', proposalId)
        .is('version_id', null)
        .is('deleted_at', null)
        .order('created_at', { ascending: true })
      if (files.error) readFailed('your files', files.error)

      return {
        proposal_id: row.id,
        challenge_id: row.challenge_versions.challenge_id,
        title: row.title,
        data: toDraftData(row.proposal_drafts.data),
        files: (files.data ?? []).map((f) => toAttachment(f as Record<string, unknown>)),
        saved_at: row.proposal_drafts.updated_at,
      }
    },

    async listMyIdeas() {
      // migration 014: own cases only, safe columns only, one call.
      const { data, error } = await client.rpc('list_my_ideas')
      if (error) readFailed('your ideas', error)
      return (Array.isArray(data) ? data : []) as MyIdea[]
    },

    async saveDraft({ data, proposalId, challengeId }) {
      // No request key (BCR-001 B3): an unexpected error throws, and autosave keeps the answers on the device.
      const { data: result, error } = await client.rpc('save_draft', {
        p_data: data,
        p_proposal_id: proposalId ?? null,
        p_challenge_id: proposalId ? null : (challengeId ?? null),
      })
      if (error) return fromRpcError(error)
      return ok(result as SaveDraftResult)
    },

    async uploadAttachment({ proposalId, file, docKey }) {
      // Friendly early checks. The bucket and register_attachment enforce the same limits from what Storage
      // recorded, so skipping these in a tampered client gains nothing.
      const ext = EXT_BY_MIME[file.type]
      if (!ext) return refused('VALIDATION', 'Use a PDF, DOCX, XLSX, PNG or JPG file.', { file: 'Unsupported file type' })
      if (file.size <= 0 || file.size > MAX_BYTES)
        return refused('VALIDATION', 'Files must be 10 MB or smaller.', { file: 'Files must be 10 MB or smaller' })

      // The user's file name never goes into the path (migration 002); it is kept in `attachments.filename`.
      const path = `${proposalId}/${newRequestId()}.${ext}`
      const upload = await client.storage.from('proposal-files').upload(path, file, { contentType: file.type, upsert: false })
      if (upload.error) {
        const status = Number((upload.error as { statusCode?: string | number }).statusCode)
        // The upload policy allows only the owner's own draft (can_upload_to).
        if (status === 400 || status === 403) return refused('INVALID_STATE', 'Files can only be added to your own draft.')
        throw new ApiError('The file did not upload. Try again.', upload.error)
      }

      // register_attachment is idempotent by storage path, so one retry after a lost reply cannot add a
      // second row for the same file.
      let reg = await register({ proposalId, path, filename: file.name, docKey })
      if (reg.error && !isRefusal(reg.error)) reg = await register({ proposalId, path, filename: file.name, docKey })
      if (reg.error) return fromRpcError(reg.error)
      return ok(toAttachment(reg.data as Record<string, unknown>))
    },

    async removeAttachment(attachmentId) {
      const { data, error } = await client.rpc('remove_attachment', { p_attachment_id: attachmentId })
      if (error) return fromRpcError(error)
      return ok(data as { id: string; removed: true })
    },

    async submitProposal({ proposalId, clientRequestId, declarationVersion }) {
      try {
        const { data, error } = await client.rpc('submit_proposal', {
          p_proposal_id: proposalId,
          p_client_request_id: clientRequestId,
          p_declaration_version: declarationVersion,
        })
        if (error) return fromRpcError(error, clientRequestId)
        if (!data || typeof data !== 'object') return { kind: 'unknown', requestKey: clientRequestId }
        return ok(data as SubmissionReceipt)
      } catch {
        // Whatever happened, the server may have applied it: check with the same key.
        return { kind: 'unknown', requestKey: clientRequestId }
      }
    },

    async getSubmissionReceipt(query): Promise<ReceiptLookup> {
      const { data, error } = await client.rpc('get_submission_receipt', {
        p_proposal_id: 'proposalId' in query ? query.proposalId : null,
        p_client_request_id: 'clientRequestId' in query ? query.clientRequestId : null,
        p_version_no: query.versionNo ?? null,
      })
      if (error) {
        fromRpcError(error) // throws for an unexpected error; a refusal (e.g. signed out) reads as "not found"
        return { found: false }
      }
      const result = data as ReceiptLookup | null
      return result && result.found ? result : { found: false }
    },
  }
}


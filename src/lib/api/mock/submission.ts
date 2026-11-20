import { formatDateTimeCAT } from '@/lib/format'
import { checkForm, isChallengeOpen, schemaKeys } from '@/lib/form-check'
import { fromRpcError, rpcError } from '../errors'
import { newRequestId } from '../request-key'
import type { SubmissionPort } from '../submission'
import type { AttachmentInfo, ChallengeForm, CommandOutcome, DraftData, SubmissionReceipt } from '../types'
import { mockSession } from './session'
import { FIRST_DEMO_REFERENCE_NUMBER, MOCK_CHALLENGE_FORMS, MOCK_DECLARATION } from './fixtures'

/**
 * MOCK Slice 1 adapter: development and demo-preview only. It follows the contract's rules (§4, §4.1, §5) so
 * screens can be built and tested before the Supabase stack runs, but it proves nothing about the server:
 * access control, RLS and real idempotency are evidenced only by Stacey's pgTAP suites and the N-tests.
 *
 * State is in memory and lasts until the page reloads. Files are not stored; only their metadata is kept.
 */

const ALLOWED_MIME = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/png',
  'image/jpeg',
])
const MAX_BYTES = 10 * 1024 * 1024
const MAX_FILES = 10

interface MockProposal {
  id: string
  ownerId: string
  challengeId: string
  status: 'draft' | 'submitted'
  data: DraftData
  savedAt: string
  files: AttachmentInfo[]
  receipt?: SubmissionReceipt
  clientRequestId?: string
}

const state = {
  proposals: new Map<string, MockProposal>(),
  nextReference: FIRST_DEMO_REFERENCE_NUMBER,
  latencyMs: import.meta.env.MODE === 'test' ? 0 : 250,
  loseNextSubmitReply: false,
}

/** Test and demo helpers. Not part of the port; screens must never import these. */
export const mockSubmissionControls = {
  reset() {
    state.proposals.clear()
    state.nextReference = FIRST_DEMO_REFERENCE_NUMBER
    state.loseNextSubmitReply = false
  },
  /** The next submit is applied on the "server" but its reply is lost, to exercise the unknown-outcome path. */
  loseNextSubmitReply() {
    state.loseNextSubmitReply = true
  },
}

const wait = () => new Promise<void>((resolve) => setTimeout(resolve, state.latencyMs))
const refused = (...args: Parameters<typeof rpcError>): CommandOutcome<never> => fromRpcError(rpcError(...args))
const ok = <T,>(data: T): CommandOutcome<T> => ({ kind: 'ok', data })

async function currentApplicantId(): Promise<string | null> {
  const user = await mockSession.getSession()
  return user && user.roles.includes('applicant') ? user.id : null
}

function formFor(challengeId: string): ChallengeForm | undefined {
  return MOCK_CHALLENGE_FORMS.find((c) => c.challenge_id === challengeId)
}

function gaboroneYear(date: Date): string {
  return new Intl.DateTimeFormat('en-GB', { timeZone: 'Africa/Gaborone', year: 'numeric' }).format(date)
}

/** Own proposal or nothing: another person's case is indistinguishable from a missing one (contract §1.1). */
function ownProposal(id: string, userId: string): MockProposal | undefined {
  const p = state.proposals.get(id)
  return p && p.ownerId === userId ? p : undefined
}

export const mockSubmission: SubmissionPort = {
  async getChallengeForm(challengeId) {
    await wait()
    return formFor(challengeId) ?? null
  },

  async getDeclaration() {
    await wait()
    return MOCK_DECLARATION
  },

  async getDraft(proposalId) {
    await wait()
    const userId = await currentApplicantId()
    const p = userId ? ownProposal(proposalId, userId) : undefined
    if (!p || p.status !== 'draft') return null
    return {
      proposal_id: p.id,
      challenge_id: p.challengeId,
      title: p.data.title ?? '',
      data: { ...p.data },
      files: [...p.files],
      saved_at: p.savedAt,
    }
  },

  async saveDraft({ data, proposalId, challengeId }) {
    await wait()
    const userId = await currentApplicantId()
    if (!userId) return refused('FORBIDDEN', "You don't have access to this.")

    let p: MockProposal | undefined
    if (proposalId) {
      p = ownProposal(proposalId, userId)
      if (!p) return refused('FORBIDDEN', "You don't have access to this.")
      if (p.status !== 'draft') return refused('INVALID_STATE', 'This idea has already been submitted.')
    } else {
      const form = challengeId ? formFor(challengeId) : undefined
      if (!form) return refused('VALIDATION', 'Choose a challenge.', { challenge: 'Required' })
      if (!isChallengeOpen(form)) return refused('CHALLENGE_CLOSED', 'This challenge is not accepting ideas.')
    }

    const form = formFor(p?.challengeId ?? (challengeId as string)) as ChallengeForm
    const keys = schemaKeys(form.form_schema)
    const kept: DraftData = {}
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      if (!keys.has(key) || value === null) continue
      if (typeof value !== 'string') return refused('VALIDATION', 'Form values must be text.', { [key]: 'Must be text' })
      kept[key] = value
    }

    const savedAt = new Date().toISOString()
    if (!p) {
      p = { id: newRequestId(), ownerId: userId, challengeId: form.challenge_id, status: 'draft', data: kept, savedAt, files: [] }
      state.proposals.set(p.id, p)
    } else {
      p.data = kept
      p.savedAt = savedAt
    }
    return ok({ proposal_id: p.id, saved_at: savedAt, title: kept.title ?? '' })
  },

  async uploadAttachment({ proposalId, file, docKey }) {
    await wait()
    const userId = await currentApplicantId()
    const p = userId ? ownProposal(proposalId, userId) : undefined
    if (!p) return refused('FORBIDDEN', "You don't have access to this.")
    if (p.status !== 'draft') return refused('INVALID_STATE', 'Files can only be added to a draft.')
    if (!ALLOWED_MIME.has(file.type)) return refused('VALIDATION', 'Use a PDF, DOCX, XLSX, PNG or JPG file.', { file: 'Unsupported file type' })
    if (file.size <= 0 || file.size > MAX_BYTES) return refused('VALIDATION', 'Files must be 10 MB or smaller.', { file: 'Files must be 10 MB or smaller' })
    if (p.files.length >= MAX_FILES) return refused('VALIDATION', 'You can attach up to 10 files.', { file: 'Too many files' })
    const form = formFor(p.challengeId) as ChallengeForm
    if (docKey && !form.required_docs.some((d) => d.key === docKey))
      return refused('VALIDATION', 'Choose which document this is.', { doc_key: 'Unknown document type' })

    const info: AttachmentInfo = { id: newRequestId(), filename: file.name, size_bytes: file.size, mime: file.type, doc_key: docKey ?? null }
    p.files.push(info)
    return ok(info)
  },

  async removeAttachment(attachmentId) {
    await wait()
    const userId = await currentApplicantId()
    const p = userId ? [...state.proposals.values()].find((x) => x.ownerId === userId && x.files.some((f) => f.id === attachmentId)) : undefined
    if (!p) return refused('FORBIDDEN', "You don't have access to this.")
    if (p.status !== 'draft') return refused('INVALID_STATE', 'Submitted files cannot be removed.')
    p.files = p.files.filter((f) => f.id !== attachmentId)
    return ok({ id: attachmentId, removed: true as const })
  },

  async submitProposal({ proposalId, clientRequestId, declarationVersion }) {
    await wait()
    // Contract §4.1 rule 2 order: permission → key → ownership → still a draft → (email, consent) → challenge open
    // → declaration version → form fields and required documents.
    const userId = await currentApplicantId()
    if (!userId) return refused('FORBIDDEN', "You don't have access to this.")

    const byKey = [...state.proposals.values()].find((x) => x.clientRequestId === clientRequestId)
    if (byKey) {
      if (byKey.id !== proposalId || byKey.ownerId !== userId)
        return refused('REQUEST_CONFLICT', 'This request was already used for something else.')
      return ok({ ...(byKey.receipt as SubmissionReceipt), replayed: true })
    }

    const p = ownProposal(proposalId, userId)
    if (!p) return refused('FORBIDDEN', "You don't have access to this.")
    if (p.status !== 'draft') return refused('INVALID_STATE', 'This idea has already been submitted.')
    // The demo applicant's email is verified and consent is recorded (seed), so those checks pass here. An
    // unverified email would be VALIDATION with fields.email = 'Verify your email address' (migration 011).
    const form = formFor(p.challengeId) as ChallengeForm
    if (!isChallengeOpen(form)) return refused('CHALLENGE_CLOSED', 'This challenge is no longer accepting submissions. Your draft is saved.')
    if (declarationVersion !== MOCK_DECLARATION.version)
      return refused('VALIDATION', 'Accept the declaration to submit. Your draft is saved.', { declaration: 'Accept the current declaration' })
    const attached = new Set(p.files.map((f) => f.doc_key).filter((k): k is string => k !== null))
    const errors = checkForm(form.form_schema, p.data, form.required_docs, attached)
    if (Object.keys(errors).length > 0) return refused('VALIDATION', 'Some answers need attention. Your draft is saved.', errors)

    const now = new Date()
    const receipt: SubmissionReceipt = {
      proposal_id: p.id,
      reference: `CEDA-${gaboroneYear(now)}-${String(state.nextReference++).padStart(4, '0')}`,
      status: 'submitted',
      version_no: 1,
      submitted_at: now.toISOString(),
      submitted_at_display: formatDateTimeCAT(now),
      timezone: 'Africa/Gaborone',
      challenge: { id: form.challenge_id, title: form.title },
      form_version: form.form_version,
      declaration_version: declarationVersion,
      declaration_accepted_at: now.toISOString(),
      files: [...p.files],
      replayed: false,
    }
    p.status = 'submitted'
    p.receipt = receipt
    p.clientRequestId = clientRequestId

    if (state.loseNextSubmitReply) {
      state.loseNextSubmitReply = false
      return fromRpcError(new Error('network: reply lost'), clientRequestId)
    }
    return ok(receipt)
  },

  async getSubmissionReceipt(query) {
    await wait()
    const userId = await currentApplicantId()
    if (!userId) return { found: false }
    const p =
      'proposalId' in query
        ? ownProposal(query.proposalId, userId)
        : [...state.proposals.values()].find((x) => x.ownerId === userId && x.clientRequestId === query.clientRequestId)
    if (!p?.receipt || (query.versionNo !== undefined && query.versionNo !== p.receipt.version_no)) return { found: false }
    return { ...p.receipt, replayed: undefined, found: true }
  },
}

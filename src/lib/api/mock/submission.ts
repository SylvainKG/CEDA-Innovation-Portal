import { formatDateTimeCAT } from '@/lib/format'
import { checkForm, isChallengeOpen, schemaKeys } from '@/lib/form-check'
import { fromRpcError, rpcError } from '../errors'
import { newRequestId } from '../request-key'
import type { SubmissionPort } from '../submission'
import type { AttachmentInfo, CaseEvent, CaseStatus, ChallengeForm, CommandOutcome, DraftData, MyCase, MyIdea, PublicStage, SubmissionReceipt } from '../types'
import { mockSession } from './session'
import { FIRST_DEMO_REFERENCE_NUMBER, MOCK_BRIEFS, MOCK_CHALLENGES, MOCK_CHALLENGE_FORMS, MOCK_DECLARATION, MOCK_SEEDED_IDEA } from './fixtures'

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
  status: CaseStatus
  data: DraftData
  savedAt: string
  files: AttachmentInfo[]
  receipt?: SubmissionReceipt
  clientRequestId?: string
  submittedTitle?: string
  /** Case events after submission (screening and later), oldest first. */
  events: CaseEvent[]
  updatedAt?: string
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

/**
 * Mock-only bridge for the mock staff adapter, so the demo journey works without a backend: an idea submitted
 * here appears in the staff queue, and a screening result shows on the applicant's "My ideas".
 */
export interface MockSubmittedCase {
  id: string
  reference: string
  title: string
  status: CaseStatus
  challengeId: string
  submittedAt: string
  updatedAt: string
  data: DraftData
  files: AttachmentInfo[]
  formVersion: number
  declarationVersion: string
  events: CaseEvent[]
}

export function mockSubmittedCases(): MockSubmittedCase[] {
  return [...state.proposals.values()]
    .filter((p) => p.status !== 'draft' && p.receipt)
    .map((p) => {
      const r = p.receipt as SubmissionReceipt
      return {
        id: p.id,
        reference: r.reference,
        title: p.submittedTitle?.trim() || 'Untitled idea',
        status: p.status,
        challengeId: p.challengeId,
        submittedAt: r.submitted_at,
        updatedAt: p.updatedAt ?? r.submitted_at,
        data: { ...p.data },
        files: [...r.files],
        formVersion: r.form_version,
        declarationVersion: r.declaration_version,
        events: [{ from_status: 'draft', to_status: 'submitted', public_stage: 'submission', reason: null, at: r.submitted_at }, ...p.events],
      }
    })
}

/** Move a submitted mock case on (used by the mock staff adapter only). Returns false if it isn't here. */
export function mockMoveCase(id: string, event: CaseEvent): boolean {
  const p = state.proposals.get(id)
  if (!p || p.status === 'draft') return false
  p.status = event.to_status
  p.events.push(event)
  p.updatedAt = event.at
  return true
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

/** The seeded earlier idea belongs to Demo Applicant A only. */
const SEEDED_OWNER = 'demo-applicant-a'

/**
 * The staff mock holds case state (screening, decisions, awards). It imports this module, so it is loaded lazily
 * here, at call time, to keep module start-up free of a circular import.
 */
async function staffCases() {
  const { mockStaffInternals } = await import('./staff')
  return mockStaffInternals.cases()
}

async function seededCaseNow() {
  return (await staffCases()).find((c) => c.id === MOCK_SEEDED_IDEA.id)
}

/** First event per public stage, oldest first (as `list_my_ideas` does). */
function firstStages(events: CaseEvent[]): { stage: PublicStage; at: string }[] {
  const out: { stage: PublicStage; at: string }[] = []
  for (const e of events) if (e.public_stage && !out.some((x) => x.stage === e.public_stage)) out.push({ stage: e.public_stage, at: e.at })
  return out
}

export const mockSubmission: SubmissionPort = {
  async listChallenges() {
    await wait()
    return MOCK_CHALLENGES.filter((c) => c.status !== 'unpublished')
  },

  templateUrl() {
    // The mock has no file store: the brief hides its Downloads section rather than show a dead link.
    return null
  },

  async getChallengeBrief(slug) {
    await wait()
    const challenge = MOCK_CHALLENGES.find((c) => c.slug === slug && c.status !== 'unpublished')
    const brief = challenge ? MOCK_BRIEFS[challenge.id] : undefined
    return challenge && brief ? { challenge, ...brief } : null
  },

  async listMyIdeas() {
    await wait()
    const userId = await currentApplicantId()
    if (!userId) return []
    const mine: MyIdea[] = [...state.proposals.values()]
      .filter((p) => p.ownerId === userId)
      .map((p) => {
        const form = formFor(p.challengeId) as ChallengeForm
        return {
          id: p.id,
          reference: p.receipt?.reference ?? null,
          title: (p.receipt ? p.submittedTitle : p.data.title)?.trim() || 'Untitled idea',
          status: p.status,
          challenge: { id: form.challenge_id, title: form.title, closes_at: form.closes_at },
          updated_at: p.updatedAt ?? p.receipt?.submitted_at ?? p.savedAt,
          open_feedback: null,
          // First event per public stage, like list_my_ideas (migration 014).
          stages: p.receipt
            ? [
                { stage: 'submission' as const, at: p.receipt.submitted_at },
                ...p.events
                  .filter((e) => e.public_stage && e.public_stage !== 'submission')
                  .map((e) => ({ stage: e.public_stage as NonNullable<CaseEvent['public_stage']>, at: e.at }))
                  .filter((s, i, all) => all.findIndex((x) => x.stage === s.stage) === i),
              ]
            : [],
        }
      })
    if (userId !== SEEDED_OWNER) return mine
    const seeded = await seededCaseNow()
    return [
      ...mine,
      seeded
        ? { ...MOCK_SEEDED_IDEA, status: seeded.status, updated_at: seeded.updated_at, stages: firstStages(seeded.events) }
        : MOCK_SEEDED_IDEA,
    ]
  },

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
      p = { id: newRequestId(), ownerId: userId, challengeId: form.challenge_id, status: 'draft', data: kept, savedAt, files: [], events: [] }
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
    p.submittedTitle = p.data.title
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

  async getMyCase(proposalId) {
    await wait()
    const userId = await currentApplicantId()
    if (!userId) return null
    const own = ownProposal(proposalId, userId)
    const isMine = (own && own.status !== 'draft') || (userId === SEEDED_OWNER && proposalId === MOCK_SEEDED_IDEA.id)
    if (!isMine) return null
    const c = (await staffCases()).find((x) => x.id === proposalId)
    if (!c) return null
    const published = c.decisions.find((d) => d.published_at && !d.superseded_at)
    const result: MyCase = {
      id: c.id,
      reference: c.reference,
      title: c.title,
      status: c.status,
      challenge: c.challenge,
      submitted_at: c.submitted_at,
      version: c.version ? { version_no: c.version.version_no, data: { ...c.version.data }, form_schema: c.form_schema, files: [...c.files] } : null,
      stages: firstStages(c.events),
      // Only the closure reason reaches the applicant; screening and other reasons stay with staff.
      closed_reason: c.status === 'closed' ? ([...c.events].reverse().find((e) => e.to_status === 'closed')?.reason ?? null) : null,
      decision: published ? { outcome: published.outcome, reason: published.reason, published_at: published.published_at! } : null,
      award: c.award ? { amount_minor: c.award.amount_minor, description: c.award.description, recorded_at: c.award.recorded_at } : null,
    }
    return result
  },
}

import { beforeEach, describe, expect, it } from 'vitest'
import { charLength, checkForm, completeness, isChallengeOpen } from '@/lib/form-check'
import { fromRpcError, parseFieldErrors, rpcError } from './errors'
import { WATER_SMART_ID, YOUTH_DIGITAL_ID, MOCK_CHALLENGE_FORMS, MOCK_DECLARATION } from './mock/fixtures'
import { mockSession } from './mock/session'
import { mockSubmission as api, mockSubmissionControls } from './mock/submission'
import { clearSubmitKey, pendingSubmitKey, submitKeyFor } from './request-key'
import type { CommandOutcome, DraftData } from './types'

// These tests prove the MOCK follows the contract's rules, so screens built on it behave correctly.
// They prove nothing about the server: that evidence is Stacey's pgTAP suites and the N-tests.

const COMPLETE: DraftData = {
  applicant_name: 'Demo Applicant A',
  contact_email: 'applicant.a@example.test',
  title: 'Solar drip irrigation kit (DEMO)',
  summary: 'A low-cost drip kit for smallholder farms.',
  sector: 'Horticulture',
  problem: 'Water is scarce.',
  solution: 'Drip lines driven by a small solar pump.',
  impact: 'Less water per hectare.',
}

function okData<T>(outcome: CommandOutcome<T>): T {
  if (outcome.kind !== 'ok') throw new Error(`expected ok, got ${JSON.stringify(outcome)}`)
  return outcome.data
}

function pdf(name = 'business-plan.pdf', size = 2048) {
  return new File([new Uint8Array(size)], name, { type: 'application/pdf' })
}

async function readyDraft() {
  const { proposal_id } = okData(await api.saveDraft({ challengeId: WATER_SMART_ID, data: COMPLETE }))
  okData(await api.uploadAttachment({ proposalId: proposal_id, file: pdf(), docKey: 'business_plan' }))
  return proposal_id
}

beforeEach(async () => {
  mockSubmissionControls.reset()
  window.localStorage.clear()
  await mockSession.switchDemoRole?.('applicant')
})

describe('RPC error mapping (contract §1.1)', () => {
  it('turns a known code into a refusal with field errors and the safe hint', () => {
    const outcome = fromRpcError(rpcError('VALIDATION', 'Some answers need attention.', { summary: 'Required', 'doc:business_plan': 'Attach this document' }))
    expect(outcome).toEqual({
      kind: 'refused',
      code: 'VALIDATION',
      message: 'Some answers need attention.',
      fields: { summary: 'Required', 'doc:business_plan': 'Attach this document' },
    })
  })

  it('treats a lost reply on a keyed command as unknown, never as failed', () => {
    expect(fromRpcError(new TypeError('Failed to fetch'), 'key-1')).toEqual({ kind: 'unknown', requestKey: 'key-1' })
  })

  it('throws for an unexpected error when there is nothing to reconcile', () => {
    expect(() => fromRpcError({ message: 'SOMETHING_NEW' })).toThrow('SOMETHING_NEW')
  })

  it('treats IMMUTABLE as a definite refusal, never as unknown', () => {
    expect(fromRpcError({ message: 'IMMUTABLE', hint: 'x' }, 'key-1')).toMatchObject({ kind: 'refused', code: 'IMMUTABLE' })
  })

  it('ignores malformed details', () => {
    expect(parseFieldErrors('not json')).toBeUndefined()
    expect(parseFieldErrors('{"fields":{"a":1}}')).toBeUndefined()
  })
})

describe('submit request keys (contract §4.1 rule 1)', () => {
  it('keeps one key per draft until it is cleared', () => {
    const first = submitKeyFor('p1')
    expect(submitKeyFor('p1')).toBe(first)
    expect(pendingSubmitKey('p1')).toBe(first)
    expect(submitKeyFor('p2')).not.toBe(first)
    clearSubmitKey('p1')
    expect(pendingSubmitKey('p1')).toBeUndefined()
    expect(submitKeyFor('p1')).not.toBe(first)
  })
})

describe('form check mirrors the server wording (migration 002)', () => {
  const form = MOCK_CHALLENGE_FORMS.find((c) => c.challenge_id === WATER_SMART_ID)!
  it('reports required, length, option, email and document problems', () => {
    const errors = checkForm(form.form_schema, { ...COMPLETE, summary: '', sector: 'Fishing', contact_email: 'nope', title: 'x'.repeat(121) }, form.required_docs)
    expect(errors).toEqual({
      summary: 'Required',
      sector: 'Choose one of the listed options',
      contact_email: 'Enter a valid email address',
      title: 'Use 120 characters or fewer',
      'doc:business_plan': 'Attach this document',
    })
  })
  it('counts characters like Postgres, so an emoji is one character', () => {
    expect(charLength('💧'.repeat(120))).toBe(120)
    expect(checkForm(form.form_schema, { ...COMPLETE, title: '💧'.repeat(120) }, form.required_docs, new Set(['business_plan']))).toEqual({})
  })

  it('decides "open" from status and dates, like private.challenge_is_open', () => {
    const base = { status: 'published' as const, opens_at: '2026-10-01T00:00:00Z', closes_at: '2026-12-31T14:00:00Z' }
    expect(isChallengeOpen(base, new Date('2026-11-17T10:00:00Z'))).toBe(true)
    expect(isChallengeOpen(base, new Date('2026-12-31T14:00:00Z'))).toBe(false) // still "published", but past the deadline
    expect(isChallengeOpen(base, new Date('2026-09-30T23:59:59Z'))).toBe(false)
    expect(isChallengeOpen({ ...base, status: 'unpublished' }, new Date('2026-11-17T10:00:00Z'))).toBe(false)
  })

  it('counts required items for the completeness meter', () => {
    expect(completeness(form.form_schema, COMPLETE, form.required_docs)).toEqual({ done: 8, total: 9 })
    expect(completeness(form.form_schema, COMPLETE, form.required_docs, new Set(['business_plan']))).toEqual({ done: 9, total: 9 })
  })
})

describe('mock Slice 1 adapter follows the contract', () => {
  it('saves a draft, keeping only schema keys', async () => {
    const saved = okData(await api.saveDraft({ challengeId: WATER_SMART_ID, data: { ...COMPLETE, injected: 'dropped' } }))
    expect(saved.title).toBe(COMPLETE.title)
    const draft = await api.getDraft(saved.proposal_id)
    expect(draft?.data).not.toHaveProperty('injected')
  })

  it('refuses a new draft on a closed challenge', async () => {
    const outcome = await api.saveDraft({ challengeId: YOUTH_DIGITAL_ID, data: {} })
    expect(outcome).toMatchObject({ kind: 'refused', code: 'CHALLENGE_CLOSED' })
  })

  it('refuses non-applicants', async () => {
    await mockSession.switchDemoRole?.('reviewer')
    expect(await api.saveDraft({ challengeId: WATER_SMART_ID, data: {} })).toMatchObject({ kind: 'refused', code: 'FORBIDDEN' })
  })

  it('uses the server wording and field keys (migration 002)', async () => {
    const { proposal_id } = okData(await api.saveDraft({ challengeId: WATER_SMART_ID, data: {} }))
    expect(await api.uploadAttachment({ proposalId: proposal_id, file: pdf(), docKey: 'nope' })).toMatchObject({
      kind: 'refused',
      message: 'Choose which document this is.',
      fields: { doc_key: 'Unknown document type' },
    })
    const exe = new File(['x'], 'run.exe', { type: 'application/x-msdownload' })
    expect(await api.uploadAttachment({ proposalId: proposal_id, file: exe })).toMatchObject({ fields: { file: 'Unsupported file type' } })
  })

  it('rejects disallowed and oversized files', async () => {
    const { proposal_id } = okData(await api.saveDraft({ challengeId: WATER_SMART_ID, data: {} }))
    const exe = new File(['x'], 'run.exe', { type: 'application/x-msdownload' })
    expect(await api.uploadAttachment({ proposalId: proposal_id, file: exe })).toMatchObject({ kind: 'refused', code: 'VALIDATION' })
    expect(await api.uploadAttachment({ proposalId: proposal_id, file: pdf('big.pdf', 10 * 1024 * 1024 + 1) })).toMatchObject({
      kind: 'refused',
      code: 'VALIDATION',
    })
  })

  it('refuses submit with field and document errors, keeping the draft', async () => {
    const { proposal_id } = okData(await api.saveDraft({ challengeId: WATER_SMART_ID, data: { title: 'Half done' } }))
    const outcome = await api.submitProposal({ proposalId: proposal_id, clientRequestId: submitKeyFor(proposal_id), declarationVersion: MOCK_DECLARATION.version })
    expect(outcome.kind).toBe('refused')
    if (outcome.kind === 'refused') expect(outcome.fields).toMatchObject({ summary: 'Required', 'doc:business_plan': 'Attach this document' })
    expect(await api.getDraft(proposal_id)).not.toBeNull()
  })

  it('refuses an out-of-date declaration version', async () => {
    const id = await readyDraft()
    expect(await api.submitProposal({ proposalId: id, clientRequestId: submitKeyFor(id), declarationVersion: 'old' })).toMatchObject({
      kind: 'refused',
      fields: { declaration: 'Accept the current declaration' },
    })
  })

  it('submits once, gives CEDA-2026-0009 first (BCR-001 B10) and replays the same receipt for the same key', async () => {
    const id = await readyDraft()
    const key = submitKeyFor(id)
    const first = okData(await api.submitProposal({ proposalId: id, clientRequestId: key, declarationVersion: MOCK_DECLARATION.version }))
    expect(first.reference).toMatch(/^CEDA-\d{4}-0009$/)
    expect(first.submitted_at_display).toMatch(/CAT$/)
    expect(first.files.map((f) => f.doc_key)).toEqual(['business_plan'])
    const again = okData(await api.submitProposal({ proposalId: id, clientRequestId: key, declarationVersion: MOCK_DECLARATION.version }))
    expect(again).toMatchObject({ reference: first.reference, replayed: true })
    expect(await api.getDraft(id)).toBeNull()
  })

  it('returns REQUEST_CONFLICT when a key is reused for another case (BCR-001 B2)', async () => {
    const a = await readyDraft()
    const b = await readyDraft()
    const key = submitKeyFor(a)
    okData(await api.submitProposal({ proposalId: a, clientRequestId: key, declarationVersion: MOCK_DECLARATION.version }))
    expect(await api.submitProposal({ proposalId: b, clientRequestId: key, declarationVersion: MOCK_DECLARATION.version })).toMatchObject({
      kind: 'refused',
      code: 'REQUEST_CONFLICT',
    })
  })

  it('reports a lost reply as unknown, and the receipt can be found with the same key', async () => {
    const id = await readyDraft()
    const key = submitKeyFor(id)
    mockSubmissionControls.loseNextSubmitReply()
    expect(await api.submitProposal({ proposalId: id, clientRequestId: key, declarationVersion: MOCK_DECLARATION.version })).toEqual({
      kind: 'unknown',
      requestKey: key,
    })
    const lookup = await api.getSubmissionReceipt({ clientRequestId: key })
    expect(lookup).toMatchObject({ found: true, reference: expect.stringMatching(/-0009$/) })
  })

  it('does not reveal another person’s case', async () => {
    const id = await readyDraft()
    okData(await api.submitProposal({ proposalId: id, clientRequestId: submitKeyFor(id), declarationVersion: MOCK_DECLARATION.version }))
    await mockSession.switchDemoRole?.('reviewer')
    expect(await api.getSubmissionReceipt({ proposalId: id })).toEqual({ found: false })
    expect(await api.getDraft(id)).toBeNull()
  })
})

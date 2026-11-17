import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { pendingSubmitKey, submitKeyFor } from '@/lib/api'
import { MOCK_DECLARATION, WATER_SMART_ID } from '@/lib/api/mock/fixtures'
import { mockSession } from '@/lib/api/mock/session'
import { mockSubmission, mockSubmissionControls } from '@/lib/api/mock/submission'
import type { DraftData } from '@/lib/api/types'
import { localDraftKey, readLocalDraft, useAutosave } from './useAutosave'
import { useSubmitIdea } from './useSubmitIdea'

const COMPLETE: DraftData = {
  applicant_name: 'Demo Applicant A',
  contact_email: 'applicant.a@example.test',
  title: 'Solar drip irrigation kit (DEMO)',
  summary: 'A low-cost drip kit.',
  sector: 'Crops',
  problem: 'Water is scarce.',
  solution: 'Solar drip.',
  impact: 'Less water.',
}

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: 0 } } })
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

async function readyDraft(data: DraftData = COMPLETE) {
  const saved = await mockSubmission.saveDraft({ challengeId: WATER_SMART_ID, data })
  if (saved.kind !== 'ok') throw new Error('save failed')
  const file = new File([new Uint8Array(100)], 'plan.pdf', { type: 'application/pdf' })
  await mockSubmission.uploadAttachment({ proposalId: saved.data.proposal_id, file, docKey: 'business_plan' })
  return saved.data.proposal_id
}

beforeEach(async () => {
  mockSubmissionControls.reset()
  window.localStorage.clear()
  await mockSession.switchDemoRole?.('applicant')
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('useSubmitIdea', () => {
  it('submits and returns the receipt, clearing the pending key', async () => {
    const id = await readyDraft()
    const { result } = renderHook(() => useSubmitIdea(id), { wrapper })
    await act(() => result.current.submit(MOCK_DECLARATION.version))
    expect(result.current.state).toMatchObject({ kind: 'submitted', receipt: { reference: expect.stringMatching(/-0009$/) } })
    expect(pendingSubmitKey(id)).toBeUndefined()
  })

  it('shows field errors on a refusal and starts a new action next time', async () => {
    const id = await readyDraft({ title: 'Half done' })
    const { result } = renderHook(() => useSubmitIdea(id), { wrapper })
    await act(() => result.current.submit(MOCK_DECLARATION.version))
    expect(result.current.state).toMatchObject({ kind: 'refused', code: 'VALIDATION', fields: { summary: 'Required' } })
    expect(pendingSubmitKey(id)).toBeUndefined()
  })

  it('treats a lost reply as unknown, keeps the key, and finds the receipt on a status check', async () => {
    const id = await readyDraft()
    const { result } = renderHook(() => useSubmitIdea(id), { wrapper })
    mockSubmissionControls.loseNextSubmitReply()
    await act(() => result.current.submit(MOCK_DECLARATION.version))
    expect(result.current.state).toEqual({ kind: 'unknown', checking: false })
    const key = pendingSubmitKey(id)
    expect(key).toBeDefined()
    await act(() => result.current.checkStatus())
    expect(result.current.state).toMatchObject({ kind: 'submitted' })
  })

  it('submitting again after a lost reply reuses the key and does not create a second idea', async () => {
    const id = await readyDraft()
    const { result } = renderHook(() => useSubmitIdea(id), { wrapper })
    mockSubmissionControls.loseNextSubmitReply()
    await act(() => result.current.submit(MOCK_DECLARATION.version))
    await act(() => result.current.submit(MOCK_DECLARATION.version))
    expect(result.current.state).toMatchObject({ kind: 'submitted', receipt: { reference: expect.stringMatching(/-0009$/), replayed: true } })
  })

  it('opened with a pending key, it checks before letting the applicant act', async () => {
    const id = await readyDraft()
    submitKeyFor(id) // a submit started before a reload; it never reached the server
    const { result } = renderHook(() => useSubmitIdea(id), { wrapper })
    expect(result.current.state).toEqual({ kind: 'unknown', checking: true })
    await waitFor(() => expect(result.current.state).toEqual({ kind: 'unknown', checking: false }))
  })
})

describe('useAutosave', () => {
  it('creates the draft on the first save, then updates it', async () => {
    const onCreated = vi.fn()
    const { result } = renderHook(() => useAutosave({ challengeId: WATER_SMART_ID, onCreated, debounceMs: 0 }), { wrapper })
    act(() => result.current.change({ title: 'First' }))
    await waitFor(() => expect(result.current.state.kind).toBe('saved'))
    expect(onCreated).toHaveBeenCalledTimes(1)
    const id = onCreated.mock.calls[0]?.[0] as string

    act(() => result.current.change({ title: 'Second' }))
    await waitFor(async () => expect((await mockSubmission.getDraft(id))?.title).toBe('Second'))
    expect(onCreated).toHaveBeenCalledTimes(1)
  })

  it('keeps answers on the device and says so when offline', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    const { result } = renderHook(() => useAutosave({ challengeId: WATER_SMART_ID, debounceMs: 0 }), { wrapper })
    act(() => result.current.change({ title: 'Offline work' }))
    await waitFor(() => expect(result.current.state.kind).toBe('local'))
    expect(readLocalDraft(WATER_SMART_ID)).toEqual({ title: 'Offline work' })
  })

  it('retries a lost update, but never retries the first (unkeyed) save blindly', async () => {
    const id = await readyDraft()
    const spy = vi.spyOn(mockSubmission, 'saveDraft').mockRejectedValueOnce(new TypeError('Failed to fetch'))
    const { result } = renderHook(() => useAutosave({ challengeId: WATER_SMART_ID, proposalId: id, debounceMs: 0 }), { wrapper })
    act(() => result.current.change({ ...COMPLETE, title: 'Retry me' }))
    await waitFor(() => expect(result.current.state.kind).toBe('retrying'))
    expect(window.localStorage.getItem(localDraftKey(WATER_SMART_ID, id))).toContain('Retry me')

    spy.mockRejectedValueOnce(new TypeError('Failed to fetch'))
    const create = renderHook(() => useAutosave({ challengeId: WATER_SMART_ID, debounceMs: 0 }), { wrapper })
    act(() => create.result.current.change({ title: 'New' }))
    await waitFor(() => expect(create.result.current.state.kind).toBe('local'))
  })

  it('does not retry a refusal', async () => {
    const id = await readyDraft()
    await mockSubmission.submitProposal({ proposalId: id, clientRequestId: submitKeyFor(id), declarationVersion: MOCK_DECLARATION.version })
    const spy = vi.spyOn(mockSubmission, 'saveDraft')
    const { result } = renderHook(() => useAutosave({ challengeId: WATER_SMART_ID, proposalId: id, debounceMs: 0 }), { wrapper })
    act(() => result.current.change({ title: 'Too late' }))
    await waitFor(() => expect(result.current.state.kind).toBe('local'))
    expect(spy).toHaveBeenCalledTimes(1)
  })
})

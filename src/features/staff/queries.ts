import { useCallback, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { ApiErrorCode, CaseStatus, CommandOutcome, ScreeningResult, StaffCase } from '@/lib/api/types'
import { submissionKeys } from '@/features/submission/queries'

/** Read hooks for the staff screens (Slice 2). `null` means "not visible", which includes "does not exist". */
export const staffKeys = {
  all: ['staff'] as const,
  cases: (statuses: readonly CaseStatus[]) => ['staff', 'cases', [...statuses].sort().join(',')] as const,
  case: (id: string) => ['staff', 'case', id] as const,
}

export function useStaffCases(statuses: readonly CaseStatus[]) {
  return useQuery({ queryKey: staffKeys.cases(statuses), queryFn: () => api.staff.listCases({ statuses: [...statuses] }) })
}

export function useStaffCase(id: string | undefined) {
  return useQuery({ queryKey: staffKeys.case(id ?? ''), queryFn: () => api.staff.getCase(id as string), enabled: Boolean(id) })
}

/**
 * Record a screening result (T10). There is no request key, so after an unexpected error the hook re-reads the
 * case: if it has left `submitted`, the result was recorded (by this attempt or someone else) and the screen
 * shows the case as it now is. A refusal changed nothing.
 */
export type ScreeningState =
  | { kind: 'idle' }
  | { kind: 'saving' }
  | { kind: 'refused'; code: ApiErrorCode; message?: string; fields?: Record<string, string> }
  | { kind: 'unconfirmed' }
  | { kind: 'done'; status: CaseStatus }

export function useRecordScreening(proposalId: string) {
  const qc = useQueryClient()
  const [state, setState] = useState<ScreeningState>({ kind: 'idle' })

  const refreshAll = useCallback(async () => {
    await qc.invalidateQueries({ queryKey: staffKeys.all })
    void qc.invalidateQueries({ queryKey: submissionKeys.myIdeas })
  }, [qc])

  /** Records the result and resolves with the final state, so the caller can act on it directly. */
  const record = useCallback(
    async (result: ScreeningResult, reason: string): Promise<ScreeningState> => {
      setState({ kind: 'saving' })
      let next: ScreeningState
      try {
        const outcome = await api.staff.recordScreening({ proposalId, result, reason })
        if (outcome.kind === 'ok') next = { kind: 'done', status: outcome.data.status }
        else if (outcome.kind === 'refused') next = { kind: 'refused', code: outcome.code, message: outcome.message, fields: outcome.fields }
        else next = { kind: 'unconfirmed' }
      } catch {
        // Lost reply or server error: look at the case before saying anything.
        const fresh = await api.staff.getCase(proposalId).catch(() => null)
        next = fresh && fresh.status !== 'submitted' ? { kind: 'done', status: fresh.status } : { kind: 'unconfirmed' }
      }
      setState(next)
      if (next.kind === 'done' || (next.kind === 'refused' && next.code === 'INVALID_STATE')) await refreshAll()
      return next
    },
    [proposalId, refreshAll],
  )

  const reset = useCallback(() => setState({ kind: 'idle' }), [])
  return { state, record, reset }
}

export function useReviewers(enabled: boolean) {
  return useQuery({ queryKey: [...staffKeys.all, 'reviewers'], queryFn: () => api.staff.listReviewers(), enabled })
}

/** State of a staff action that has no request key (assign, remove). */
export type CaseCommandState =
  | { kind: 'idle' }
  | { kind: 'saving' }
  | { kind: 'refused'; code: ApiErrorCode; message?: string; fields?: Record<string, string> }
  | { kind: 'unconfirmed' }
  | { kind: 'done' }

/**
 * Run a staff action on one case. After an unexpected error the hook re-reads the case and asks `landed` whether
 * the change is there; only then does it report success. A refusal changed nothing.
 */
export function useCaseCommand<I>(
  proposalId: string,
  send: (input: I) => Promise<CommandOutcome<unknown>>,
  landed: (fresh: StaffCase, input: I) => boolean,
) {
  const qc = useQueryClient()
  const [state, setState] = useState<CaseCommandState>({ kind: 'idle' })

  const run = useCallback(
    async (input: I): Promise<CaseCommandState> => {
      setState({ kind: 'saving' })
      let next: CaseCommandState
      try {
        const outcome = await send(input)
        if (outcome.kind === 'ok') next = { kind: 'done' }
        else if (outcome.kind === 'refused') next = { kind: 'refused', code: outcome.code, message: outcome.message, fields: outcome.fields }
        else next = { kind: 'unconfirmed' }
      } catch {
        const fresh = await api.staff.getCase(proposalId).catch(() => null)
        next = fresh && landed(fresh, input) ? { kind: 'done' } : { kind: 'unconfirmed' }
      }
      setState(next)
      if (next.kind === 'done' || (next.kind === 'refused' && next.code === 'INVALID_STATE')) await qc.invalidateQueries({ queryKey: staffKeys.all })
      return next
    },
    [landed, proposalId, qc, send],
  )
  const reset = useCallback(() => setState({ kind: 'idle' }), [])
  return { state, run, reset }
}

export function useNotes(proposalId: string, enabled: boolean) {
  return useQuery({ queryKey: [...staffKeys.case(proposalId), 'notes'], queryFn: () => api.staff.listNotes(proposalId), enabled })
}

/**
 * Add an internal note. There is no request key, and unlike the other actions a repeat would add a second note,
 * so after a lost reply the hook looks for the note in a fresh list and never suggests that retrying is safe.
 */
export function useAddNote(proposalId: string) {
  const qc = useQueryClient()
  const [state, setState] = useState<CaseCommandState>({ kind: 'idle' })
  const add = useCallback(
    async (body: string): Promise<CaseCommandState> => {
      setState({ kind: 'saving' })
      const started = Date.now() - 60_000
      let next: CaseCommandState
      try {
        const outcome = await api.staff.addNote({ proposalId, body })
        if (outcome.kind === 'ok') next = { kind: 'done' }
        else if (outcome.kind === 'refused') next = { kind: 'refused', code: outcome.code, message: outcome.message, fields: outcome.fields }
        else next = { kind: 'unconfirmed' }
      } catch {
        const fresh = await api.staff.listNotes(proposalId).catch(() => [])
        const found = fresh.some((n) => n.mine && n.body === body.trim() && Date.parse(n.created_at) >= started)
        next = found ? { kind: 'done' } : { kind: 'unconfirmed' }
      }
      setState(next)
      if (next.kind === 'done' || next.kind === 'unconfirmed') await qc.invalidateQueries({ queryKey: [...staffKeys.case(proposalId), 'notes'] })
      return next
    },
    [proposalId, qc],
  )
  const reset = useCallback(() => setState({ kind: 'idle' }), [])
  return { state, add, reset }
}

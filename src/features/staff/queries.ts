import { useCallback, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { ApiErrorCode, CaseStatus, ScreeningResult } from '@/lib/api/types'
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

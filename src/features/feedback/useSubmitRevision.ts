import { useCallback, useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { api, clearSubmitKey, pendingSubmitKey, submitKeyFor } from '@/lib/api'
import type { ApiErrorCode, DraftData, SubmissionReceipt } from '@/lib/api/types'
import { submissionKeys } from '@/features/submission/queries'
import { staffKeys } from '@/features/staff/queries'
import { feedbackKeys } from './queries'

/**
 * Submit a revision (T04 V2 mode; contract §4.4 `submit_revision`) with the same honest-outcome rules as the
 * first submission (useSubmitIdea): one request key per revision request, reused for every retry, reload or
 * second tab until a receipt arrives; a lost reply is "not confirmed yet" and checked by that key.
 */
export type RevisionState =
  | { kind: 'idle' }
  | { kind: 'submitting' }
  | { kind: 'refused'; code: ApiErrorCode; message?: string; fields?: Record<string, string> }
  | { kind: 'unknown'; checking: boolean }
  | { kind: 'submitted'; receipt: SubmissionReceipt }

export interface RevisionInput {
  data: DraftData | null
  changeNote: string
  taskResponses: { task_id: string; status: 'addressed' | 'not_addressed'; explanation: string }[]
  declarationVersion: string
}

export function useSubmitRevision(proposalId: string, requestId: string | undefined) {
  const qc = useQueryClient()
  // A key slot per revision request, so it never collides with the first submission's key.
  const slot = requestId ? `${proposalId}:revision:${requestId}` : undefined
  const [state, setState] = useState<RevisionState>(() => (slot && pendingSubmitKey(slot) ? { kind: 'unknown', checking: true } : { kind: 'idle' }))
  const busy = useRef(false)

  const finish = useCallback(
    (receipt: SubmissionReceipt) => {
      if (slot) clearSubmitKey(slot)
      qc.setQueryData(submissionKeys.receipt(proposalId, receipt.version_no), { ...receipt, found: true })
      void qc.invalidateQueries({ queryKey: ['my-case', proposalId] })
      void qc.invalidateQueries({ queryKey: feedbackKeys.roadmap(proposalId) })
      void qc.invalidateQueries({ queryKey: submissionKeys.myIdeas })
      void qc.invalidateQueries({ queryKey: staffKeys.all })
      setState({ kind: 'submitted', receipt })
    },
    [proposalId, qc, slot],
  )

  const checkStatus = useCallback(async () => {
    if (!slot) return
    const key = pendingSubmitKey(slot)
    if (!key) {
      setState({ kind: 'idle' })
      return
    }
    setState({ kind: 'unknown', checking: true })
    try {
      const lookup = await api.submission.getSubmissionReceipt({ clientRequestId: key })
      if (lookup.found && lookup.proposal_id === proposalId) finish(lookup)
      else setState({ kind: 'unknown', checking: false })
    } catch {
      setState({ kind: 'unknown', checking: false })
    }
  }, [finish, proposalId, slot])

  const submit = useCallback(
    async (input: RevisionInput) => {
      if (!slot || busy.current) return
      busy.current = true
      setState({ kind: 'submitting' })
      const clientRequestId = submitKeyFor(slot)
      try {
        const outcome = await api.submission.submitRevision({ proposalId, clientRequestId, ...input })
        if (outcome.kind === 'ok') finish(outcome.data)
        else if (outcome.kind === 'unknown') setState({ kind: 'unknown', checking: false })
        else {
          // A refusal changed nothing on the server; the next attempt is a new action.
          clearSubmitKey(slot)
          if (outcome.code === 'INVALID_STATE') void qc.invalidateQueries({ queryKey: ['my-case', proposalId] })
          setState({ kind: 'refused', code: outcome.code, message: outcome.message, fields: outcome.fields })
        }
      } catch {
        setState({ kind: 'unknown', checking: false })
      } finally {
        busy.current = false
      }
    },
    [finish, proposalId, qc, slot],
  )

  useEffect(() => {
    if (slot && pendingSubmitKey(slot)) void checkStatus()
  }, [checkStatus, slot])

  return { state, submit, checkStatus }
}

import { useCallback, useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { api, clearSubmitKey, pendingSubmitKey, submitKeyFor } from '@/lib/api'
import type { ApiErrorCode, SubmissionReceipt } from '@/lib/api/types'
import { submissionKeys } from './queries'

/**
 * Submit an idea with an honest outcome (contract §1.1 and §4.1; evidence skill principles 2, 7 and 8).
 *
 * - The request key is created on the first press and reused for every retry, reload or second tab until a
 *   receipt arrives, so the server replays the original receipt instead of creating a second submission.
 * - A lost reply is `unknown`, never failed. The screen shows "Not confirmed yet" and a status check, which
 *   looks the receipt up by the same key. "Submit again" is safe: it resends the same key.
 * - If a key is still pending when the screen opens (the reply was lost before a reload), the hook starts in
 *   `unknown` and checks once, so the applicant never submits blind.
 */
export type SubmitState =
  | { kind: 'idle' }
  | { kind: 'submitting' }
  | { kind: 'refused'; code: ApiErrorCode; message?: string; fields?: Record<string, string> }
  | { kind: 'unknown'; checking: boolean }
  | { kind: 'submitted'; receipt: SubmissionReceipt }

export function useSubmitIdea(proposalId: string | undefined) {
  const qc = useQueryClient()
  const [state, setState] = useState<SubmitState>(() =>
    proposalId && pendingSubmitKey(proposalId) ? { kind: 'unknown', checking: true } : { kind: 'idle' },
  )
  const busy = useRef(false)

  const finish = useCallback(
    (receipt: SubmissionReceipt) => {
      if (!proposalId) return
      clearSubmitKey(proposalId)
      qc.setQueryData(submissionKeys.receipt(proposalId), { ...receipt, found: true })
      qc.removeQueries({ queryKey: submissionKeys.draft(proposalId) })
      setState({ kind: 'submitted', receipt })
    },
    [proposalId, qc],
  )

  const checkStatus = useCallback(async () => {
    if (!proposalId) return
    const key = pendingSubmitKey(proposalId)
    if (!key) {
      setState({ kind: 'idle' })
      return
    }
    setState({ kind: 'unknown', checking: true })
    try {
      const lookup = await api.submission.getSubmissionReceipt({ clientRequestId: key })
      if (lookup.found) finish(lookup)
      else {
        // Not received (yet). Keep the key: submitting again with it cannot create a duplicate.
        setState({ kind: 'unknown', checking: false })
      }
    } catch {
      setState({ kind: 'unknown', checking: false })
    }
  }, [finish, proposalId])

  const submit = useCallback(
    async (declarationVersion: string) => {
      if (!proposalId || busy.current) return
      busy.current = true
      setState({ kind: 'submitting' })
      const clientRequestId = submitKeyFor(proposalId)
      try {
        const outcome = await api.submission.submitProposal({ proposalId, clientRequestId, declarationVersion })
        if (outcome.kind === 'ok') finish(outcome.data)
        else if (outcome.kind === 'unknown') setState({ kind: 'unknown', checking: false })
        else {
          // A refusal changed nothing on the server (contract §4.1 rule 3); the next attempt is a new action.
          clearSubmitKey(proposalId)
          setState({ kind: 'refused', code: outcome.code, message: outcome.message, fields: outcome.fields })
        }
      } catch {
        setState({ kind: 'unknown', checking: false })
      } finally {
        busy.current = false
      }
    },
    [finish, proposalId],
  )

  // Opened with a pending key: check once before letting the applicant act.
  useEffect(() => {
    if (proposalId && pendingSubmitKey(proposalId)) void checkStatus()
  }, [checkStatus, proposalId])

  return { state, submit, checkStatus }
}

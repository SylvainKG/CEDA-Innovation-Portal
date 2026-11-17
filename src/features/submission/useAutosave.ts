import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '@/lib/api'
import type { DraftData } from '@/lib/api/types'
import type { AutosaveState } from '@/components/AutosaveIndicator'

/**
 * Draft autosave (spec §7 T04, contract §4 `save_draft`). The indicator only says "Saved" after the server
 * confirms; otherwise it says the work is on this device.
 *
 * - Saves are debounced and serialised: one request at a time, and the latest answers win.
 * - Every change is also kept in local storage, so a reload or lost connection never loses typing.
 * - Updates to an existing draft whose reply was lost are retried with back-off: `save_draft` with a `proposal_id` replaces the
 *   whole draft, so repeating it is harmless.
 * - The FIRST save (which creates the draft) is not retried automatically: it carries no request key
 *   (BCR-001 B3), so a blind retry after a lost reply could create a second draft. It is tried again on the
 *   next edit or by `saveNow`. Known debt, recorded in PR #16.
 */
export interface AutosaveOptions {
  challengeId: string
  proposalId?: string
  /** Called once when the first save creates the draft. */
  onCreated?: (proposalId: string) => void
  debounceMs?: number
}

const RETRY_DELAYS_MS = [2_000, 5_000, 15_000, 30_000]

export function localDraftKey(challengeId: string, proposalId?: string) {
  return `ceda.draft.local.${proposalId ?? `new-${challengeId}`}`
}

function keepLocally(key: string, data: DraftData) {
  try {
    window.localStorage.setItem(key, JSON.stringify({ data, at: new Date().toISOString() }))
  } catch {
    // Storage unavailable: nothing more we can do on this device.
  }
}

export function readLocalDraft(challengeId: string, proposalId?: string): DraftData | null {
  try {
    const raw = window.localStorage.getItem(localDraftKey(challengeId, proposalId))
    if (!raw) return null
    const parsed = JSON.parse(raw) as { data?: unknown }
    return parsed.data && typeof parsed.data === 'object' ? (parsed.data as DraftData) : null
  } catch {
    return null
  }
}

export function useAutosave({ challengeId, proposalId: initialId, onCreated, debounceMs = 1_500 }: AutosaveOptions) {
  const [state, setState] = useState<AutosaveState>({ kind: 'idle' })
  // The id lives in a ref for the save loop and in state for the caller, so a re-render always sees it.
  const [proposalId, setProposalId] = useState(initialId)
  const idRef = useRef(initialId)
  const latest = useRef<DraftData | null>(null)
  const inFlight = useRef(false)
  const dirty = useRef(false)
  const timer = useRef<ReturnType<typeof setTimeout>>()
  const attempt = useRef(0)
  const onCreatedRef = useRef(onCreated)
  onCreatedRef.current = onCreated

  const flush = useCallback(async () => {
    clearTimeout(timer.current)
    if (inFlight.current || !dirty.current || !latest.current) return
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      setState({ kind: 'local' })
      return
    }
    const data = latest.current
    dirty.current = false
    inFlight.current = true
    setState({ kind: 'saving' })
    const creating = !idRef.current
    let result: 'saved' | 'refused' | 'lost' = 'lost'
    try {
      const outcome = await api.submission.saveDraft({ data, proposalId: idRef.current, challengeId: creating ? challengeId : undefined })
      if (outcome.kind === 'refused') result = 'refused'
      else if (outcome.kind === 'ok') {
        result = 'saved'
        attempt.current = 0
        if (creating) {
          idRef.current = outcome.data.proposal_id
          setProposalId(outcome.data.proposal_id)
          // Move the device copy from the "new" slot to the draft's own slot. Typing that happened while this
          // first save was in flight went to the "new" slot, so copy the latest answers across before removing
          // it; otherwise "Saved on this device" could be shown with nothing stored (Stacey's #18 review).
          if (dirty.current && latest.current) keepLocally(localDraftKey(challengeId, idRef.current), latest.current)
          try {
            window.localStorage.removeItem(localDraftKey(challengeId))
          } catch {
            // ignore
          }
          onCreatedRef.current?.(outcome.data.proposal_id)
        }
        if (!dirty.current) {
          try {
            window.localStorage.removeItem(localDraftKey(challengeId, idRef.current))
          } catch {
            // ignore
          }
        }
        setState({ kind: 'saved', at: outcome.data.saved_at })
      }
    } catch {
      // Lost reply or server error: handled below.
    } finally {
      inFlight.current = false
    }
    if (result === 'saved') {
      if (dirty.current) void flush()
      return
    }
    // Not confirmed: the answers are still on this device.
    dirty.current = true
    // A refusal (for example the idea was already submitted) will not change on retry; a first save is not
    // retried blindly (see above). Both wait for the next edit or saveNow.
    if (creating || result === 'refused') {
      setState({ kind: 'local' })
      return
    }
    const delay = RETRY_DELAYS_MS[Math.min(attempt.current, RETRY_DELAYS_MS.length - 1)]
    attempt.current += 1
    setState({ kind: 'retrying' })
    timer.current = setTimeout(() => void flush(), delay)
  }, [challengeId])

  const change = useCallback(
    (data: DraftData) => {
      latest.current = data
      dirty.current = true
      keepLocally(localDraftKey(challengeId, idRef.current), data)
      clearTimeout(timer.current)
      timer.current = setTimeout(() => void flush(), debounceMs)
    },
    [challengeId, debounceMs, flush],
  )

  // Save when the connection returns, and stop timers on unmount.
  useEffect(() => {
    const online = () => void flush()
    window.addEventListener('online', online)
    return () => {
      window.removeEventListener('online', online)
      clearTimeout(timer.current)
    }
  }, [flush])

  return { state, change, saveNow: flush, proposalId }
}

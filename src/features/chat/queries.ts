import { useCallback, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { ApiErrorCode, CommandOutcome } from '@/lib/api/types'

/** Live chat reads (Slice 6b). Polled every few seconds; Realtime can replace the polling later. */
export const chatKeys = {
  all: ['chat'] as const,
  status: ['chat', 'status'] as const,
  mine: ['chat', 'mine'] as const,
  messages: (id: string) => ['chat', 'messages', id] as const,
  inbox: ['chat', 'inbox'] as const,
  stats: ['chat', 'stats'] as const,
}

const LIVE = 4000

export function useChatStatus() {
  return useQuery({ queryKey: chatKeys.status, queryFn: () => api.chat.status(), refetchInterval: 60_000 })
}

export function useMyChat() {
  return useQuery({ queryKey: chatKeys.mine, queryFn: () => api.chat.mySession(), refetchInterval: LIVE })
}

export function useChatMessages(sessionId: string | undefined) {
  return useQuery({
    queryKey: chatKeys.messages(sessionId ?? ''),
    queryFn: () => api.chat.messages(sessionId as string),
    enabled: Boolean(sessionId),
    refetchInterval: LIVE,
  })
}

export function useChatInbox() {
  return useQuery({ queryKey: chatKeys.inbox, queryFn: () => api.chat.inbox(), refetchInterval: LIVE })
}

export function useChatStats(enabled = true) {
  return useQuery({ queryKey: chatKeys.stats, queryFn: () => api.chat.statistics({}), enabled })
}

export type ChatActionState =
  | { kind: 'idle' }
  | { kind: 'busy' }
  | { kind: 'refused'; code: ApiErrorCode; message?: string; fields?: Record<string, string> }
  | { kind: 'unconfirmed' }
  | { kind: 'done' }

/**
 * A chat action. Sending carries no request key on the server, so after an unexpected error the hook re-reads
 * the thread and asks `landed` whether the message is there before saying anything; it never claims "sent" or
 * "not sent" without that check, and the person decides whether to send again.
 */
export function useChatAction<I>(send: (input: I) => Promise<CommandOutcome<unknown>>, landed?: (input: I) => Promise<boolean>) {
  const qc = useQueryClient()
  const [state, setState] = useState<ChatActionState>({ kind: 'idle' })
  const run = useCallback(
    async (input: I): Promise<ChatActionState> => {
      setState({ kind: 'busy' })
      let next: ChatActionState
      try {
        const r = await send(input)
        next = r.kind === 'ok' ? { kind: 'done' } : r.kind === 'refused' ? { kind: 'refused', code: r.code, message: r.message, fields: r.fields } : { kind: 'unconfirmed' }
      } catch {
        next = landed && (await landed(input).catch(() => false)) ? { kind: 'done' } : { kind: 'unconfirmed' }
      }
      setState(next)
      await qc.invalidateQueries({ queryKey: chatKeys.all })
      return next
    },
    [landed, qc, send],
  )
  const reset = useCallback(() => setState({ kind: 'idle' }), [])
  return { state, run, reset }
}

/** Did a message with this text from me arrive in the thread? (the re-read after a lost reply) */
export async function messageLanded(sessionId: string, myId: string, body: string) {
  const msgs = await api.chat.messages(sessionId)
  const mine = msgs.filter((m) => m.sender_id === myId)
  return mine.at(-1)?.body === body.trim()
}

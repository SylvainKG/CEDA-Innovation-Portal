import type { SupabaseClient } from '@supabase/supabase-js'
import type { ChatPort } from '../chat'
import { ApiError, fromRpcError } from '../errors'
import type { ChatInboxRow, ChatMessage, ChatSession, ChatSessionStatus, ChatStatistics, ChatStatus } from '../types'

const forbidden = (error: { message?: string }) => error.message === 'FORBIDDEN'

/** Supabase chat adapter (Slice 6b). Reads go through RLS with explicit columns; actions are RPCs. */
export function createSupabaseChat(client: SupabaseClient): ChatPort {
  return {
    async status() {
      const { data, error } = await client.rpc('chat_status')
      if (error) throw new ApiError('Could not check chat opening hours', error)
      return data as ChatStatus
    },

    async mySession() {
      const { data: auth } = await client.auth.getUser()
      if (!auth.user) return null
      const { data, error } = await client
        .from('chat_sessions')
        .select('id, status, queued_at, accepted_at, closed_at')
        .eq('applicant_id', auth.user.id)
        .order('queued_at', { ascending: false })
        .limit(1)
      if (error) throw new ApiError('Could not load your chat', error)
      return ((data ?? [])[0] as ChatSession | undefined) ?? null
    },

    async messages(sessionId) {
      const { data, error } = await client
        .from('chat_messages')
        .select('id, sender_id, body, created_at')
        .eq('session_id', sessionId)
        .is('deleted_at', null)
        .order('created_at', { ascending: true })
      if (error) throw new ApiError('Could not load the conversation', error)
      return (data ?? []) as ChatMessage[]
    },

    async start(message) {
      const { data, error } = await client.rpc('start_chat', { p_message: message })
      if (error) return fromRpcError(error)
      return { kind: 'ok', data: data as { session_id: string; status: ChatSessionStatus; queued_at: string } }
    },

    async send(sessionId, body) {
      const { data, error } = await client.rpc('send_chat_message', { p_session_id: sessionId, p_body: body })
      if (error) return fromRpcError(error)
      return { kind: 'ok', data: data as { message_id: string; session_id: string } }
    },

    async accept(sessionId) {
      const { data, error } = await client.rpc('accept_chat', { p_session_id: sessionId })
      if (error) return fromRpcError(error)
      return { kind: 'ok', data: data as { session_id: string; status: 'active'; accepted_at: string } }
    },

    async close(sessionId) {
      const { data, error } = await client.rpc('close_chat', { p_session_id: sessionId })
      if (error) return fromRpcError(error)
      return { kind: 'ok', data: data as { session_id: string; status: ChatSessionStatus; replayed: boolean } }
    },

    async inbox() {
      const { data, error } = await client.rpc('my_chat_inbox')
      if (error) {
        if (forbidden(error)) return null
        throw new ApiError('Could not load the chat inbox', error)
      }
      return (data ?? []) as ChatInboxRow[]
    },

    async statistics({ from, to }) {
      const { data, error } = await client.rpc('chat_statistics', { p_from: from ?? null, p_to: to ?? null })
      if (error) {
        if (forbidden(error)) return null
        throw new ApiError('Could not load chat statistics', error)
      }
      const s = data as ChatStatistics
      return { ...s, average_wait_seconds: s.average_wait_seconds === null ? null : Number(s.average_wait_seconds) }
    },
  }
}

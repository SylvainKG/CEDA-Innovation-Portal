import type { ChatInboxRow, ChatMessage, ChatSession, ChatStatistics, ChatStatus, CommandOutcome, ChatSessionStatus } from './types'

/**
 * Chat port, Slice 6b (contract §4.6; CHT-01..03).
 *
 * | Method         | Contract                                                                          |
 * |----------------|-----------------------------------------------------------------------------------|
 * | status         | RPC `chat_status` (open now?, hours in CAT, demo override)                        |
 * | mySession      | read own latest `chat_sessions` row (RLS: applicant's own)                        |
 * | messages       | read `chat_messages` of a session the reader may see (RLS), oldest first          |
 * | start          | RPC `start_chat(p_message)`; joins the open session if there is one               |
 * | send           | RPC `send_chat_message(p_session_id, p_body)`                                     |
 * | accept         | RPC `accept_chat` (chat.handle); INVALID_STATE if another consultant took it      |
 * | close          | RPC `close_chat`; closing an ended chat is a replay, not an error                 |
 * | inbox          | RPC `my_chat_inbox` (chat.handle)                                                  |
 * | statistics     | RPC `chat_statistics` (chat.stats: support lead)                                   |
 *
 * `start` and `send` carry no request key: after a lost reply the screen re-reads the thread before saying
 * whether the message was sent, rather than sending it again blindly.
 */
export interface ChatPort {
  status(): Promise<ChatStatus>
  mySession(): Promise<ChatSession | null>
  messages(sessionId: string): Promise<ChatMessage[]>
  start(message: string): Promise<CommandOutcome<{ session_id: string; status: ChatSessionStatus; queued_at: string }>>
  send(sessionId: string, body: string): Promise<CommandOutcome<{ message_id: string; session_id: string }>>
  accept(sessionId: string): Promise<CommandOutcome<{ session_id: string; status: 'active'; accepted_at: string }>>
  close(sessionId: string): Promise<CommandOutcome<{ session_id: string; status: ChatSessionStatus; replayed: boolean }>>
  /** `null` when the person may not handle chats. */
  inbox(): Promise<ChatInboxRow[] | null>
  /** `null` when the person may not read chat statistics. */
  statistics(range: { from?: string; to?: string }): Promise<ChatStatistics | null>
}

import type { ChatPort } from '../chat'
import { fromRpcError, rpcError } from '../errors'
import type { ChatMessage, ChatSessionStatus, ChatStatus, CommandOutcome, Role } from '../types'
import { mockSession } from './session'

/**
 * MOCK chat adapter (Slice 6b): development and demo preview only. Follows the contract's rules: applicants start
 * and write in their own chat; consultants see the queue and their own active chats; a chat can be accepted once;
 * starting is refused while chat is closed; a queued chat is missed after 30 minutes. The demo opens chat by
 * default (like the server's `chat_demo_override`); `mockChatControls.setOpen(false)` shows the closed state.
 */

interface Stored {
  id: string
  applicant_id: string
  applicant_name: string
  consultant_id: string | null
  status: ChatSessionStatus
  queued_at: string
  accepted_at: string | null
  closed_at: string | null
}

const state = {
  open: true,
  /** null: follow the calendar (the mock treats the calendar as open). */
  override: 'open' as 'open' | 'closed' | null,
  hours: [] as ChatStatus['hours'],
  closures: new Map<string, string>(),
  sessions: [] as Stored[],
  messages: [] as (ChatMessage & { session_id: string })[],
  latencyMs: import.meta.env.MODE === 'test' ? 0 : 200,
}

const HOURS = () => [1, 2, 3, 4, 5, 6, 7].map((weekday) => ({ weekday, is_working: weekday <= 5, opens_at: '09:00', closes_at: '16:00' }))

function reset() {
  state.open = true
  state.override = 'open'
  state.hours = HOURS()
  state.closures.clear()
  state.sessions = []
  state.messages = []
}

/** Test and demo helpers. Not part of the port; screens must never import these. */
export const mockChatControls = {
  reset,
  setOpen(open: boolean) {
    state.open = open
    state.override = open ? 'open' : 'closed'
  },
  /** Age a queued chat (tests of the 30-minute "missed" rule). */
  backdate(sessionId: string, minutes: number) {
    const s = state.sessions.find((x) => x.id === sessionId)
    if (s) s.queued_at = new Date(Date.now() - minutes * 60_000).toISOString()
  },
}

const wait = () => new Promise<void>((resolve) => setTimeout(resolve, state.latencyMs))
const refused = (...args: Parameters<typeof rpcError>): CommandOutcome<never> => fromRpcError(rpcError(...args))
const HANDLE: readonly Role[] = ['support_consultant', 'support_lead']
const isAdmin = async () => Boolean((await mockSession.getSession())?.roles.includes('admin'))

function sweep() {
  const now = Date.now()
  for (const s of state.sessions)
    if (s.status === 'queued' && (now - Date.parse(s.queued_at) > 30 * 60_000 || !state.open)) {
      s.status = 'missed'
      s.closed_at = new Date().toISOString()
    }
}

const text = (v: string) => {
  const t = v.trim()
  return t.length >= 1 && [...t].length <= 2000 ? t : null
}

function visible(userId: string, roles: Role[], s: Stored) {
  return s.applicant_id === userId || (roles.some((r) => HANDLE.includes(r)) && (s.consultant_id === userId || s.status === 'queued')) || roles.includes('support_lead')
}

export const mockChat: ChatPort = {
  async status() {
    await wait()
    const mode = state.override === 'open' ? 'demo_override_open' : state.override === 'closed' ? 'demo_override_closed' : 'calendar'
    return { open: state.open, mode, server_time_display: new Date().toISOString(), hours: state.hours.map((h) => ({ ...h })) }
  },

  async mySession() {
    await wait()
    const user = await mockSession.getSession()
    if (!user) return null
    sweep()
    const s = state.sessions.filter((x) => x.applicant_id === user.id).at(-1)
    return s ? { id: s.id, status: s.status, queued_at: s.queued_at, accepted_at: s.accepted_at, closed_at: s.closed_at } : null
  },

  async messages(sessionId) {
    await wait()
    const user = await mockSession.getSession()
    const s = state.sessions.find((x) => x.id === sessionId)
    // RLS: an applicant reads their own; a consultant reads the chats they handle.
    if (!user || !s || !(s.applicant_id === user.id || (user.roles.some((r) => HANDLE.includes(r)) && s.consultant_id === user.id))) return []
    return state.messages.filter((m) => m.session_id === sessionId).map((m): ChatMessage => ({ id: m.id, sender_id: m.sender_id, body: m.body, created_at: m.created_at }))
  },

  async start(message) {
    await wait()
    const user = await mockSession.getSession()
    if (!user || !user.roles.includes('applicant')) return refused('FORBIDDEN', 'Sign in to chat with CEDA.')
    const body = text(message)
    if (!body) return refused('VALIDATION', 'Write a message (up to 2,000 characters).', { message: 'Write a message (up to 2,000 characters)' })
    sweep()
    let s = state.sessions.find((x) => x.applicant_id === user.id && (x.status === 'queued' || x.status === 'active'))
    if (!s) {
      if (!state.open) return refused('INVALID_STATE', 'Chat is open 09:00–16:00 CAT on working days. Try the FAQs, or come back during opening hours.')
      s = { id: crypto.randomUUID(), applicant_id: user.id, applicant_name: user.displayName, consultant_id: null, status: 'queued', queued_at: new Date().toISOString(), accepted_at: null, closed_at: null }
      state.sessions.push(s)
    }
    state.messages.push({ id: crypto.randomUUID(), session_id: s.id, sender_id: user.id, body, created_at: new Date().toISOString() })
    return { kind: 'ok', data: { session_id: s.id, status: s.status, queued_at: s.queued_at } }
  },

  async send(sessionId, raw) {
    await wait()
    const user = await mockSession.getSession()
    const s = state.sessions.find((x) => x.id === sessionId)
    if (!user || !s || !((s.applicant_id === user.id && user.roles.includes('applicant')) || (s.consultant_id === user.id && user.roles.some((r) => HANDLE.includes(r)))))
      return refused('FORBIDDEN', "You don't have access to this conversation.")
    if (s.status !== 'queued' && s.status !== 'active') return refused('INVALID_STATE', 'This conversation has ended.')
    const body = text(raw)
    if (!body) return refused('VALIDATION', 'Write a message (up to 2,000 characters).', { body: 'Write a message (up to 2,000 characters)' })
    const id = crypto.randomUUID()
    state.messages.push({ id, session_id: s.id, sender_id: user.id, body, created_at: new Date().toISOString() })
    return { kind: 'ok', data: { message_id: id, session_id: s.id } }
  },

  async accept(sessionId) {
    await wait()
    const user = await mockSession.getSession()
    if (!user || !user.roles.some((r) => HANDLE.includes(r))) return refused('FORBIDDEN', "You don't have access to this action.")
    sweep()
    const s = state.sessions.find((x) => x.id === sessionId && x.status === 'queued')
    if (!s) return refused('INVALID_STATE', 'Another consultant took this conversation, or it has ended.')
    s.status = 'active'
    s.consultant_id = user.id
    s.accepted_at = new Date().toISOString()
    return { kind: 'ok', data: { session_id: s.id, status: 'active', accepted_at: s.accepted_at } }
  },

  async close(sessionId) {
    await wait()
    const user = await mockSession.getSession()
    const s = state.sessions.find((x) => x.id === sessionId)
    if (!user || !s || !(s.applicant_id === user.id || (s.consultant_id === user.id && user.roles.some((r) => HANDLE.includes(r)))))
      return refused('FORBIDDEN', "You don't have access to this conversation.")
    if (s.status !== 'queued' && s.status !== 'active') return { kind: 'ok', data: { session_id: s.id, status: s.status, replayed: true } }
    s.status = s.status === 'queued' ? 'missed' : 'closed'
    s.closed_at = new Date().toISOString()
    return { kind: 'ok', data: { session_id: s.id, status: s.status, replayed: false } }
  },

  async inbox() {
    await wait()
    const user = await mockSession.getSession()
    if (!user || !user.roles.some((r) => HANDLE.includes(r))) return null
    sweep()
    return state.sessions
      .filter((s) => visible(user.id, user.roles, s) && (s.status === 'queued' || (s.status === 'active' && s.consultant_id === user.id)))
      .sort((a, b) => (a.status === b.status ? a.queued_at.localeCompare(b.queued_at) : a.status === 'queued' ? -1 : 1))
      .map((s) => {
        const last = state.messages.filter((m) => m.session_id === s.id).at(-1)
        return {
          session_id: s.id,
          status: s.status as 'queued' | 'active',
          applicant_name: s.applicant_name,
          queued_at: s.queued_at,
          waiting_seconds: s.status === 'queued' ? Math.round((Date.now() - Date.parse(s.queued_at)) / 1000) : null,
          last_message_at: last?.created_at ?? null,
          last_message: last ? last.body.slice(0, 140) : null,
        }
      })
  },

  async statistics({ from, to }) {
    await wait()
    const user = await mockSession.getSession()
    if (!user || !user.roles.includes('support_lead')) return null
    sweep()
    const rows = state.sessions.filter((s) => (!from || s.queued_at >= from) && (!to || s.queued_at < to))
    const handled = rows.filter((s) => s.accepted_at)
    const days = new Map<string, { day: string; volume: number; missed: number }>()
    for (const s of rows) {
      const day = new Date(Date.parse(s.queued_at) + 2 * 3_600_000).toISOString().slice(0, 10)
      const d = days.get(day) ?? { day, volume: 0, missed: 0 }
      d.volume++
      if (s.status === 'missed') d.missed++
      days.set(day, d)
    }
    return {
      volume: rows.length,
      handled: handled.length,
      missed: rows.filter((s) => s.status === 'missed').length,
      waiting_now: rows.filter((s) => s.status === 'queued').length,
      average_wait_seconds: handled.length ? Math.round(handled.reduce((t, s) => t + (Date.parse(s.accepted_at!) - Date.parse(s.queued_at)) / 1000, 0) / handled.length) : null,
      by_day: [...days.values()].sort((a, b) => a.day.localeCompare(b.day)),
    }
  },

  async closures() {
    await wait()
    return [...state.closures.entries()].map(([day, reason]) => ({ day, reason })).sort((a, b) => a.day.localeCompare(b.day))
  },

  async setHours({ weekday, isWorking, opensAt, closesAt }) {
    await wait()
    if (!(await isAdmin())) return refused('FORBIDDEN', "You don't have access to this action.")
    if (weekday < 1 || weekday > 7 || !opensAt || !closesAt || opensAt >= closesAt) return refused('VALIDATION', 'Choose a day, and an opening time before the closing time.')
    state.hours = state.hours.map((h) => (h.weekday === weekday ? { weekday, is_working: isWorking, opens_at: opensAt, closes_at: closesAt } : h))
    return { kind: 'ok', data: { weekday, is_working: isWorking } }
  },

  async setClosure({ day, reason }) {
    await wait()
    if (!(await isAdmin())) return refused('FORBIDDEN', "You don't have access to this action.")
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return refused('VALIDATION', 'Choose a date.')
    if (reason === null) state.closures.delete(day)
    else {
      const r = reason.trim()
      if (!r || [...r].length > 200) return refused('VALIDATION', 'Give a reason (up to 200 characters).', { reason: 'Give a reason (up to 200 characters)' })
      state.closures.set(day, r)
    }
    return { kind: 'ok', data: { day, closed: reason !== null } }
  },

  async setOverride(mode) {
    await wait()
    if (!(await isAdmin())) return refused('FORBIDDEN', "You don't have access to this action.")
    state.override = mode
    // The mock has no clock-based calendar: "follow the calendar" counts as open.
    state.open = mode !== 'closed'
    return { kind: 'ok', data: { mode, open: state.open } }
  },
}

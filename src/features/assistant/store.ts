import { useSyncExternalStore } from 'react'
import {
  ask,
  AssistantError,
  pickRecordingType,
  speak,
  transcribe,
  type AssistantConfig,
  type ChatTurn,
} from './leseding'

/** The conversation follows the browser tab across route changes and reloads. */
export type AssistantMode = 'voice' | 'text'
export type AssistantStatus = 'idle' | 'listening' | 'transcribing' | 'thinking' | 'speaking'

export interface AssistantMessage extends ChatTurn {
  id: number
  pending?: boolean
}

export interface AssistantState {
  open: boolean
  mode: AssistantMode
  status: AssistantStatus
  messages: AssistantMessage[]
  error: string | null
  voiceUnavailable: string | null
  /** True once the spoken answer's audio is actually playing (the orb's "speaking" state), not while it downloads. */
  playing: boolean
}

export type OrbState = 'idle' | 'listening' | 'thinking' | 'speaking'

/**
 * Maps the assistant's status to the Leseding orb's four states (Leseding's integration guide, 23 Nov):
 * recording → listening; transcribing, answering and fetching the speech → thinking; speech audio playing → speaking.
 */
export function orbState(status: AssistantStatus, playing: boolean): OrbState {
  if (status === 'listening') return 'listening'
  if (status === 'transcribing' || status === 'thinking') return 'thinking'
  if (status === 'speaking') return playing ? 'speaking' : 'thinking'
  return 'idle'
}

export const ASSISTANT_NAME = 'Peolwane AI'
export const GREETING =
  "Hello, I'm Peolwane AI. Ask me anything about the portal: finding a challenge, submitting an idea, or where to find something. Tap the microphone to talk, or switch to text."
export const MAX_RECORDING_MS = 30_000

const SESSION_KEY = 'ceda.peolwane.session.v1'
const MAX_SAVED_MESSAGES = 40

const greeting = (): AssistantMessage => ({ id: 0, role: 'assistant', content: GREETING })
const initial = (): AssistantState => ({
  open: false,
  mode: 'voice',
  status: 'idle',
  messages: [greeting()],
  error: null,
  voiceUnavailable: null,
  playing: false,
})

function newSessionId(): string {
  const c = globalThis.crypto
  return `peolwane-${c && 'randomUUID' in c ? c.randomUUID() : Math.random().toString(36).slice(2)}`
}

function readSavedSession(): { sessionId: string; turnIndex: number; mode: AssistantMode; messages: AssistantMessage[] } | null {
  try {
    const raw = globalThis.sessionStorage?.getItem(SESSION_KEY)
    if (!raw) return null
    const saved: unknown = JSON.parse(raw)
    if (!saved || typeof saved !== 'object') return null
    const value = saved as Record<string, unknown>
    if (typeof value.sessionId !== 'string' || !value.sessionId.startsWith('peolwane-')) return null
    const mode: AssistantMode = value.mode === 'text' ? 'text' : 'voice'
    const messages = Array.isArray(value.messages)
      ? value.messages
          .filter((message): message is AssistantMessage => {
            if (!message || typeof message !== 'object') return false
            const item = message as Record<string, unknown>
            return Number.isSafeInteger(item.id) && (item.role === 'assistant' || item.role === 'user') && typeof item.content === 'string' && item.pending !== true
          })
          .map(({ id, role, content }) => ({ id, role, content }))
          .slice(-MAX_SAVED_MESSAGES)
      : []
    if (!messages.length || messages[0]?.id !== 0) messages.unshift(greeting())
    // A user turn without its completed answer is not part of the saved conversation.
    if (messages.at(-1)?.role === 'user') messages.pop()
    return {
      sessionId: value.sessionId,
      turnIndex: Number.isSafeInteger(value.turnIndex) && Number(value.turnIndex) >= 0 ? Number(value.turnIndex) : 0,
      mode,
      messages: messages.length ? messages : [greeting()],
    }
  } catch {
    return null
  }
}

const restored = readSavedSession()
let state: AssistantState = { ...initial(), mode: restored?.mode ?? 'voice', messages: restored?.messages ?? [greeting()] }
const listeners = new Set<() => void>()
let nextId = Math.max(1, ...state.messages.map((message) => message.id + 1))
let turnIndex = restored?.turnIndex ?? 0
let sessionId = restored?.sessionId ?? newSessionId()
let persistTimer: ReturnType<typeof setTimeout> | null = null
let recorder: MediaRecorder | null = null
let discardRecording = false
let recordingTimer: ReturnType<typeof setTimeout> | null = null
let audio: HTMLAudioElement | null = null
let audioUrl: string | null = null

function persistSession() {
  if (persistTimer) clearTimeout(persistTimer)
  persistTimer = null
  try {
    const messages = state.messages.filter((message) => !message.pending && message.content).slice(-MAX_SAVED_MESSAGES).map(({ id, role, content }) => ({ id, role, content }))
    if (messages.at(-1)?.role === 'user') messages.pop()
    globalThis.sessionStorage?.setItem(SESSION_KEY, JSON.stringify({ sessionId, turnIndex, mode: state.mode, messages }))
  } catch {
    // Private browsing or a full storage quota must not stop the assistant from working.
  }
}

function schedulePersistence() {
  if (persistTimer) clearTimeout(persistTimer)
  persistTimer = setTimeout(persistSession, 120)
}

if (typeof window !== 'undefined') window.addEventListener('pagehide', persistSession)

function set(patch: Partial<AssistantState>) {
  state = { ...state, ...patch }
  if (patch.messages || patch.mode !== undefined) schedulePersistence()
  listeners.forEach((listener) => listener())
}

function updateMessage(id: number, patch: Partial<AssistantMessage>) {
  set({ messages: state.messages.map((message) => (message.id === id ? { ...message, ...patch } : message)) })
}

export function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getState() {
  return state
}

export function useAssistant(): AssistantState {
  return useSyncExternalStore(subscribe, getState, getState)
}

/** For tests: back to a fresh conversation. */
export function resetAssistant() {
  stopSpeaking()
  cancelRecording()
  if (persistTimer) clearTimeout(persistTimer)
  persistTimer = null
  try {
    globalThis.sessionStorage?.removeItem(SESSION_KEY)
  } catch {
    // Storage can be unavailable in restricted browser contexts.
  }
  state = initial()
  nextId = 1
  turnIndex = 0
  sessionId = newSessionId()
  listeners.forEach((listener) => listener())
}

export function setOpen(open: boolean) {
  if (!open) {
    cancelRecording()
    stopSpeaking()
  }
  set({ open, error: null })
}

export function setMode(mode: AssistantMode) {
  if (mode === state.mode) return
  cancelRecording()
  stopSpeaking()
  set({ mode, error: null })
}

function errorText(error: unknown): string {
  return error instanceof AssistantError ? error.message : 'Peolwane AI could not answer just now. Try again.'
}

/** Sends a question (typed, or the text of a spoken one) and streams the reply; in voice mode the reply is spoken. */
export async function sendQuestion(config: AssistantConfig, question: string, source: 'voice' | 'text') {
  const text = question.trim()
  if (!text || state.status === 'thinking') return
  const history: ChatTurn[] = state.messages.filter((message) => message.id !== 0 && !message.pending && message.content).map(({ role, content }) => ({ role, content }))
  const userId = nextId++
  const replyId = nextId++
  set({
    error: null,
    status: 'thinking',
    messages: [...state.messages, { id: userId, role: 'user', content: text }, { id: replyId, role: 'assistant', content: '', pending: true }],
  })
  let reply: string
  try {
    reply = await ask(config, { question: text, history, sessionId, turnIndex: turnIndex++, source }, (soFar) => updateMessage(replyId, { content: soFar }))
  } catch (error) {
    set({ messages: state.messages.filter((message) => message.id !== replyId), status: 'idle', error: errorText(error) })
    return
  }
  updateMessage(replyId, { content: reply.trim(), pending: false })
  if (state.mode === 'voice' && state.open && reply.trim()) await playReply(config, reply.trim())
  else set({ status: 'idle' })
}

async function playReply(config: AssistantConfig, text: string) {
  set({ status: 'speaking' })
  try {
    const blob = await speak(config, text)
    if (state.status !== 'speaking') return
    if (typeof URL.createObjectURL !== 'function' || typeof Audio === 'undefined') throw new Error('no audio')
    audioUrl = URL.createObjectURL(blob)
    audio = new Audio(audioUrl)
    audio.onplaying = () => set({ playing: true })
    audio.onended = () => stopSpeaking()
    audio.onerror = () => stopSpeaking()
    await audio.play()
  } catch {
    stopSpeaking()
  }
}

export function stopSpeaking() {
  if (audio) {
    audio.onplaying = null
    audio.onended = null
    audio.onerror = null
    try {
      audio.pause()
    } catch {
      /* jsdom and some browsers throw on pause before play */
    }
    audio = null
  }
  if (audioUrl) {
    URL.revokeObjectURL?.(audioUrl)
    audioUrl = null
  }
  if (state.status === 'speaking') set({ status: 'idle', playing: false })
  else if (state.playing) set({ playing: false })
}

/** Starts listening. Falls back to text, with the reason, when the microphone can't be used. */
export async function startListening(config: AssistantConfig) {
  if (state.status !== 'idle' && state.status !== 'speaking') return
  stopSpeaking()
  const type = typeof MediaRecorder === 'undefined' ? null : pickRecordingType((candidate) => MediaRecorder.isTypeSupported(candidate))
  if (!type || !navigator.mediaDevices?.getUserMedia) {
    set({ voiceUnavailable: "Voice isn't available in this browser. You can type your question instead.", mode: 'text' })
    return
  }
  let stream: MediaStream
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true })
  } catch {
    set({ voiceUnavailable: 'The microphone is blocked or not available. Allow it in your browser settings, or type your question instead.', mode: 'text' })
    return
  }
  const chunks: Blob[] = []
  const activeRecorder = new MediaRecorder(stream, { mimeType: type })
  recorder = activeRecorder
  discardRecording = false
  activeRecorder.ondataavailable = (event) => {
    if (event.data.size) chunks.push(event.data)
  }
  activeRecorder.onstop = async () => {
    stream.getTracks().forEach((track) => track.stop())
    if (recordingTimer) clearTimeout(recordingTimer)
    recordingTimer = null
    recorder = null
    if (discardRecording) {
      set({ status: 'idle' })
      return
    }
    set({ status: 'transcribing' })
    let text: string
    try {
      text = await transcribe(config, new Blob(chunks, { type }))
    } catch (error) {
      set({ status: 'idle', error: errorText(error) })
      return
    }
    if (!text) {
      set({ status: 'idle', error: "I didn't catch that. Try again, or switch to text." })
      return
    }
    set({ status: 'idle' })
    await sendQuestion(config, text, 'voice')
  }
  activeRecorder.start()
  set({ status: 'listening', error: null, voiceUnavailable: null })
  recordingTimer = setTimeout(() => stopListening(), MAX_RECORDING_MS)
}

/** Stops listening and sends what was said. */
export function stopListening() {
  if (recorder && recorder.state !== 'inactive') recorder.stop()
}

function cancelRecording() {
  if (recorder && recorder.state !== 'inactive') {
    discardRecording = true
    recorder.stop()
  }
}

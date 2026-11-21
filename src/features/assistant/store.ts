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

/**
 * Peolwane AI's conversation, kept outside React so it survives moving between pages and shells (public, applicant,
 * staff): each shell mounts its own launcher, and they all show this one conversation. It ends when the page is
 * closed or reloaded; nothing is stored in the browser (docs/process/peolwane-ai.md).
 */

export type AssistantMode = 'voice' | 'text'
export type AssistantStatus = 'idle' | 'listening' | 'transcribing' | 'thinking' | 'speaking'

export interface AssistantMessage extends ChatTurn {
  id: number
  /** True while the reply is still streaming in. */
  pending?: boolean
}

export interface AssistantState {
  open: boolean
  mode: AssistantMode
  status: AssistantStatus
  messages: AssistantMessage[]
  error: string | null
  /** Why voice can't be used here (no microphone, permission refused, unsupported browser), or null. */
  voiceUnavailable: string | null
}

export const ASSISTANT_NAME = 'Peolwane AI'
export const GREETING =
  "Hello, I'm Peolwane AI. Ask me anything about the portal: finding a challenge, submitting an idea, or where to find something. Tap the microphone to talk, or switch to text."

/** A recording stops by itself after this long, so a forgotten microphone doesn't keep listening. */
export const MAX_RECORDING_MS = 30_000

const initial = (): AssistantState => ({
  open: false,
  mode: 'voice',
  status: 'idle',
  messages: [{ id: 0, role: 'assistant', content: GREETING }],
  error: null,
  voiceUnavailable: null,
})

let state: AssistantState = initial()
const listeners = new Set<() => void>()
let nextId = 1
let turnIndex = 0
let sessionId = newSessionId()
let recorder: MediaRecorder | null = null
let discardRecording = false
let recordingTimer: ReturnType<typeof setTimeout> | null = null
let audio: HTMLAudioElement | null = null
let audioUrl: string | null = null

function newSessionId(): string {
  const c = globalThis.crypto
  return `peolwane-${c && 'randomUUID' in c ? c.randomUUID() : Math.random().toString(36).slice(2)}`
}

function set(patch: Partial<AssistantState>) {
  state = { ...state, ...patch }
  listeners.forEach((l) => l())
}

function updateMessage(id: number, patch: Partial<AssistantMessage>) {
  set({ messages: state.messages.map((m) => (m.id === id ? { ...m, ...patch } : m)) })
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
  state = initial()
  nextId = 1
  turnIndex = 0
  sessionId = newSessionId()
  listeners.forEach((l) => l())
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

function errorText(e: unknown): string {
  return e instanceof AssistantError ? e.message : 'Peolwane AI could not answer just now. Try again.'
}

/** Sends a question (typed, or the text of a spoken one) and streams the reply; in voice mode the reply is spoken. */
export async function sendQuestion(cfg: AssistantConfig, question: string, source: 'voice' | 'text') {
  const text = question.trim()
  if (!text || state.status === 'thinking') return
  // Earlier turns, without the greeting (ours, not the engine's) and without failed replies.
  const history: ChatTurn[] = state.messages.filter((m) => m.id !== 0 && !m.pending && m.content).map(({ role, content }) => ({ role, content }))
  const userId = nextId++
  const replyId = nextId++
  set({
    error: null,
    status: 'thinking',
    messages: [...state.messages, { id: userId, role: 'user', content: text }, { id: replyId, role: 'assistant', content: '', pending: true }],
  })
  let reply: string
  try {
    reply = await ask(cfg, { question: text, history, sessionId, turnIndex: turnIndex++, source }, (soFar) => updateMessage(replyId, { content: soFar }))
  } catch (e) {
    set({ messages: state.messages.filter((m) => m.id !== replyId), status: 'idle', error: errorText(e) })
    return
  }
  updateMessage(replyId, { content: reply.trim(), pending: false })
  if (state.mode === 'voice' && state.open && reply.trim()) {
    await playReply(cfg, reply.trim())
  } else {
    set({ status: 'idle' })
  }
}

async function playReply(cfg: AssistantConfig, text: string) {
  set({ status: 'speaking' })
  try {
    const blob = await speak(cfg, text)
    if (state.status !== 'speaking') return // stopped, closed or switched to text while the audio was fetched
    if (typeof URL.createObjectURL !== 'function' || typeof Audio === 'undefined') throw new Error('no audio')
    audioUrl = URL.createObjectURL(blob)
    audio = new Audio(audioUrl)
    audio.onended = () => stopSpeaking()
    audio.onerror = () => stopSpeaking()
    await audio.play()
  } catch {
    // The text is already on screen; a reply that can't be spoken (autoplay blocked, no audio) is not an error.
    stopSpeaking()
  }
}

export function stopSpeaking() {
  if (audio) {
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
  if (state.status === 'speaking') set({ status: 'idle' })
}

/** Starts listening. Falls back to text, with the reason, when the microphone can't be used. */
export async function startListening(cfg: AssistantConfig) {
  if (state.status !== 'idle' && state.status !== 'speaking') return
  stopSpeaking()
  const type = typeof MediaRecorder === 'undefined' ? null : pickRecordingType((t) => MediaRecorder.isTypeSupported(t))
  if (!type || !navigator.mediaDevices?.getUserMedia) {
    set({ voiceUnavailable: "Voice isn't available in this browser. You can type your question instead.", mode: 'text' })
    return
  }
  let stream: MediaStream
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true })
  } catch {
    set({
      voiceUnavailable: 'The microphone is blocked or not available. Allow it in your browser settings, or type your question instead.',
      mode: 'text',
    })
    return
  }
  const chunks: Blob[] = []
  const rec = new MediaRecorder(stream, { mimeType: type })
  recorder = rec
  discardRecording = false
  rec.ondataavailable = (e) => {
    if (e.data.size) chunks.push(e.data)
  }
  rec.onstop = async () => {
    stream.getTracks().forEach((t) => t.stop())
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
      text = await transcribe(cfg, new Blob(chunks, { type }))
    } catch (e) {
      set({ status: 'idle', error: errorText(e) })
      return
    }
    if (!text) {
      set({ status: 'idle', error: "I didn't catch that. Try again, or switch to text." })
      return
    }
    set({ status: 'idle' })
    await sendQuestion(cfg, text, 'voice')
  }
  rec.start()
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

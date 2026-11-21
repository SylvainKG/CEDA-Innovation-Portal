/**
 * Client for the Leseding AI Engine, which powers Peolwane AI (docs/process/peolwane-ai.md).
 *
 * The engine does speech to text, the answer (Google Gemini, from a knowledge base the Leseding team loads) and the
 * spoken reply. We build our own UI on its HTTP API rather than loading its drop-in widget script, so:
 * - the name, look and keyboard behaviour are ours ("Peolwane AI", the portal's tokens, WCAG 2.2 AA);
 * - the Content-Security-Policy keeps `script-src 'self'`: only `connect-src` and `media-src blob:` are widened.
 *
 * The key is a front-end embed key, locked by Leseding to our origins; it is public by design (like the Supabase
 * publishable key) and comes from the environment, never from the repository.
 */

export interface AssistantConfig {
  base: string
  key: string
}

export interface ChatTurn {
  role: 'user' | 'assistant'
  content: string
}

/** Thrown for every failure, with a message that is safe to show as is. */
export class AssistantError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message)
    this.name = 'AssistantError'
  }
}

/** How many earlier turns go with each question (the guide asks for about 10). */
export const HISTORY_TURNS = 10

/**
 * Reads VITE_LESEDING_BASE and VITE_LESEDING_KEY. Returns null when either is missing or the base is not https
 * (http only for localhost), and the assistant is then not shown at all: no button that can only fail.
 */
export function readAssistantConfig(env: Record<string, unknown>): AssistantConfig | null {
  const base = typeof env.VITE_LESEDING_BASE === 'string' ? env.VITE_LESEDING_BASE.trim().replace(/\/+$/, '') : ''
  const key = typeof env.VITE_LESEDING_KEY === 'string' ? env.VITE_LESEDING_KEY.trim() : ''
  if (!base || !key) return null
  let url: URL
  try {
    url = new URL(base)
  } catch {
    return null
  }
  const local = url.hostname === 'localhost' || url.hostname === '127.0.0.1'
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && local)) return null
  return { base, key }
}

export const assistantConfig: AssistantConfig | null = readAssistantConfig(import.meta.env)

function failure(status: number): AssistantError {
  if (status === 401 || status === 403) return new AssistantError('Peolwane AI is not available on this site right now.', status)
  if (status === 429) return new AssistantError('Peolwane AI is busy. Wait a moment and try again.', status)
  return new AssistantError('Peolwane AI could not answer just now. Try again.', status)
}

async function call(cfg: AssistantConfig, path: string, init: RequestInit): Promise<Response> {
  let res: Response
  try {
    res = await fetch(`${cfg.base}${path}`, { ...init, headers: { 'X-API-Key': cfg.key, ...(init.headers ?? {}) } })
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') throw e
    throw new AssistantError('Could not reach Peolwane AI. Check your connection and try again.')
  }
  if (!res.ok) throw failure(res.status)
  return res
}

/** Speech to text: a recorded utterance (webm/opus or ogg) to its text. */
export async function transcribe(cfg: AssistantConfig, audio: Blob, signal?: AbortSignal): Promise<string> {
  const fd = new FormData()
  fd.append('file', audio, audio.type.includes('ogg') ? 'utterance.ogg' : 'utterance.webm')
  fd.append('language', 'english')
  const res = await call(cfg, '/api/transcribe', { method: 'POST', body: fd, signal })
  const body = (await res.json()) as { text?: unknown }
  return typeof body.text === 'string' ? body.text.trim() : ''
}

export interface AskInput {
  question: string
  history: ChatTurn[]
  sessionId: string
  turnIndex: number
  source: 'voice' | 'text'
}

/** Asks a question; the reply streams as text/plain and `onText` gets the reply so far after each chunk. */
export async function ask(cfg: AssistantConfig, input: AskInput, onText: (soFar: string) => void, signal?: AbortSignal): Promise<string> {
  const res = await call(cfg, '/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      question: input.question,
      language: 'english',
      history: input.history.slice(-HISTORY_TURNS),
      session_id: input.sessionId,
      turn_index: input.turnIndex,
      source: input.source === 'voice' ? 'widget-voice' : 'widget',
    }),
    signal,
  })
  if (!res.body) {
    const text = await res.text()
    onText(text)
    return text
  }
  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let reply = ''
  for (;;) {
    const { value, done } = await reader.read()
    if (done) break
    reply += decoder.decode(value, { stream: true })
    onText(reply)
  }
  reply += decoder.decode()
  onText(reply)
  return reply
}

/** Text to speech: the reply as audio/mpeg. */
export async function speak(cfg: AssistantConfig, text: string, signal?: AbortSignal): Promise<Blob> {
  const res = await call(cfg, '/api/speak', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, language: 'english' }),
    signal,
  })
  return new Blob([await res.arrayBuffer()], { type: 'audio/mpeg' })
}

/** The first recording format this browser supports that the engine accepts, or null (voice then unavailable). */
export function pickRecordingType(isSupported: (type: string) => boolean): string | null {
  for (const type of ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/ogg']) {
    if (isSupported(type)) return type
  }
  return null
}

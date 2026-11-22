import { Keyboard, Loader2, Mic, Send, Sparkles, Square, VolumeX, X } from 'lucide-react'
import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/cn'
import { assistantConfig, type AssistantConfig } from './leseding'
import {
  ASSISTANT_NAME,
  sendQuestion,
  setMode,
  setOpen,
  startListening,
  stopListening,
  stopSpeaking,
  useAssistant,
  type AssistantStatus,
} from './store'

/**
 * Peolwane AI (docs/process/peolwane-ai.md): a voice-first assistant, with text as an option, on every page.
 * A floating button at the bottom right opens a panel. Voice: tap the microphone, speak, tap again; the reply is
 * shown and spoken. Text: type and send. Not shown at all when the service isn't configured (VITE_LESEDING_*).
 *
 * `placement="applicant"` stacks the button above the "Chat with CEDA" button, which applicant pages keep at the
 * bottom right. The panel is not modal: the page stays usable, Esc closes it and focus returns to the button.
 */
export function PeolwaneAssistant({ placement = 'default', config = assistantConfig }: { placement?: 'default' | 'applicant'; config?: AssistantConfig | null }) {
  const { open } = useAssistant()
  const launcherRef = useRef<HTMLButtonElement>(null)
  const wasOpen = useRef(open)

  useEffect(() => {
    if (wasOpen.current && !open) launcherRef.current?.focus()
    wasOpen.current = open
  }, [open])

  if (!config) return null
  return (
    <>
      {!open && (
        <button
          ref={launcherRef}
          type="button"
          data-print="hide"
          aria-haspopup="dialog"
          onClick={() => setOpen(true)}
          className={cn(
            'fixed right-4 z-20 inline-flex min-h-touch items-center gap-2 rounded-full bg-brand px-4 font-semibold text-brand-on shadow-1 hover:bg-brand-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2',
            placement === 'applicant' ? 'bottom-40 md:bottom-24' : 'bottom-4 md:bottom-6',
          )}
        >
          <Sparkles aria-hidden className="h-5 w-5" />
          {ASSISTANT_NAME}
        </button>
      )}
      {open && <Panel config={config} />}
    </>
  )
}

const STATUS_TEXT: Record<AssistantStatus, string> = {
  idle: '',
  listening: 'Listening… tap the button again when you have finished.',
  transcribing: 'Working out what you said…',
  thinking: 'Peolwane AI is answering…',
  speaking: 'Speaking the answer…',
}

function Panel({ config }: { config: AssistantConfig }) {
  const { mode, status, messages, error, voiceUnavailable } = useAssistant()
  const titleId = useId()
  const logRef = useRef<HTMLOListElement>(null)
  const micRef = useRef<HTMLButtonElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [draft, setDraft] = useState('')
  const busy = status === 'transcribing' || status === 'thinking'

  // Focus the main control when the panel opens or the mode changes.
  useEffect(() => {
    if (mode === 'voice') micRef.current?.focus()
    else inputRef.current?.focus()
  }, [mode])

  // Keep the newest message in view.
  useEffect(() => {
    const log = logRef.current
    if (log) log.scrollTop = log.scrollHeight
  }, [messages])

  // Esc closes the panel while focus is inside it (it is not modal, so Esc elsewhere on the page is left alone).
  const panelRef = useRef<HTMLElement>(null)
  useEffect(() => {
    const panel = panelRef.current
    if (!panel) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        setOpen(false)
      }
    }
    panel.addEventListener('keydown', onKeyDown)
    return () => panel.removeEventListener('keydown', onKeyDown)
  }, [])

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!draft.trim() || busy) return
    void sendQuestion(config, draft, 'text')
    setDraft('')
  }

  return (
    <section
      role="dialog"
      aria-modal="false"
      aria-labelledby={titleId}
      ref={panelRef}
      data-print="hide"
      className="fixed inset-x-4 bottom-4 z-30 flex max-h-[min(36rem,calc(100dvh-2rem))] flex-col overflow-hidden rounded-lg border border-line bg-surface-card shadow-1 md:inset-x-auto md:bottom-6 md:right-6 md:w-96"
    >
      <header className="flex items-center justify-between gap-2 border-b border-line px-4 py-2">
        <h2 id={titleId} className="flex items-center gap-2 text-lg font-semibold text-ink">
          <Sparkles aria-hidden className="h-5 w-5 text-brand-text" />
          {ASSISTANT_NAME}
        </h2>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="inline-flex min-h-touch min-w-touch items-center justify-center rounded-md text-ink hover:bg-surface-sunken"
          aria-label={`Close ${ASSISTANT_NAME}`}
        >
          <X aria-hidden className="h-5 w-5" />
        </button>
      </header>

      <div role="group" aria-label="How to talk to Peolwane AI" className="flex gap-1 border-b border-line px-4 py-2">
        <ModeButton active={mode === 'voice'} onClick={() => setMode('voice')} icon={<Mic aria-hidden className="h-4 w-4" />} label="Voice" />
        <ModeButton active={mode === 'text'} onClick={() => setMode('text')} icon={<Keyboard aria-hidden className="h-4 w-4" />} label="Text" />
      </div>

      <ol ref={logRef} role="log" aria-label="Conversation with Peolwane AI" className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
        {messages.map((m) => (
          <li key={m.id} className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')} aria-busy={m.pending || undefined}>
            <p
              className={cn(
                'max-w-[85%] whitespace-pre-wrap rounded-lg px-3 py-2',
                m.role === 'user' ? 'bg-brand text-brand-on' : 'bg-surface-sunken text-ink',
              )}
            >
              <span className="sr-only">{m.role === 'user' ? 'You: ' : `${ASSISTANT_NAME}: `}</span>
              {m.content || (m.pending ? '…' : '')}
            </p>
          </li>
        ))}
      </ol>

      <div className="space-y-2 border-t border-line px-4 py-3">
        <p aria-live="polite" className="min-h-[1.25rem] text-sm text-ink-muted">
          {STATUS_TEXT[status]}
        </p>
        {(error || voiceUnavailable) && (
          <p role="alert" className="text-sm font-semibold text-ink">
            {error ?? voiceUnavailable}
          </p>
        )}

        {mode === 'voice' ? (
          <div className="flex items-center justify-center gap-3">
            {status === 'speaking' ? (
              <button ref={micRef} type="button" onClick={stopSpeaking} className={ROUND_BUTTON}>
                <VolumeX aria-hidden className="h-6 w-6" />
                Stop speaking
              </button>
            ) : status === 'listening' ? (
              <button ref={micRef} type="button" onClick={stopListening} className={cn(ROUND_BUTTON, 'animate-pulse')}>
                <Square aria-hidden className="h-6 w-6" />
                Stop and send
              </button>
            ) : (
              <button ref={micRef} type="button" onClick={() => void startListening(config)} disabled={busy} className={ROUND_BUTTON}>
                {busy ? <Loader2 aria-hidden className="h-6 w-6 animate-spin" /> : <Mic aria-hidden className="h-6 w-6" />}
                Start speaking
              </button>
            )}
          </div>
        ) : (
          <form onSubmit={onSubmit} className="flex items-end gap-2">
            <label className="flex-1">
              <span className="sr-only">Your question</span>
              <input
                ref={inputRef}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                maxLength={1000}
                placeholder="Type your question"
                className="min-h-touch w-full rounded-md border border-[#8A8580] bg-surface-card px-3 text-ink"
              />
            </label>
            <button
              type="submit"
              disabled={busy || !draft.trim()}
              className="inline-flex min-h-touch min-w-touch items-center justify-center gap-1 rounded-md bg-brand px-3 font-semibold text-brand-on hover:bg-brand-hover disabled:opacity-60"
            >
              {busy ? <Loader2 aria-hidden className="h-5 w-5 animate-spin" /> : <Send aria-hidden className="h-5 w-5" />}
              Send
            </button>
          </form>
        )}

        <p className="text-xs text-ink-muted">
          AI answers can be wrong; check anything important on the page. Don&apos;t share personal or case details: what you say or type
          goes to our AI provider. <Link to="/privacy" className="text-ink underline">Privacy</Link>
        </p>
      </div>
    </section>
  )
}

const ROUND_BUTTON =
  'inline-flex min-h-touch items-center gap-2 rounded-full bg-brand px-5 py-3 font-semibold text-brand-on hover:bg-brand-hover disabled:opacity-60'

function ModeButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: ReactNode; label: string }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'inline-flex min-h-touch flex-1 items-center justify-center gap-1 rounded-md px-3 text-sm font-semibold',
        active ? 'bg-brand-subtle text-brand-text' : 'text-ink hover:bg-surface-sunken',
      )}
    >
      {icon}
      {label}
    </button>
  )
}

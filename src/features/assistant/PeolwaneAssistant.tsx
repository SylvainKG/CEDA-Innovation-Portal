import { ArrowUp, Keyboard, Loader2, Mic, Send, ShieldCheck, Sparkles, Square, VolumeX, X } from 'lucide-react'
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
import './assistant.css'

const PROMPTS = ['How do I submit an idea?', 'Where can I find open challenges?', 'What happens after I apply?']
const PANEL_EXIT_MS = 220

/** A tab-persistent portal guide with a compact launcher that gets out of the way while the page scrolls. */
export function PeolwaneAssistant({ placement = 'default', config = assistantConfig }: { placement?: 'default' | 'applicant'; config?: AssistantConfig | null }) {
  const { open } = useAssistant()
  const [compact, setCompact] = useState(() => typeof window !== 'undefined' && window.scrollY > 12)
  const [panelMounted, setPanelMounted] = useState(open)
  const launcherRef = useRef<HTMLButtonElement>(null)
  const wasOpen = useRef(open)
  const openRef = useRef(open)
  const closeTimer = useRef<number | null>(null)
  const scrollClosedRef = useRef(false)
  openRef.current = open

  useEffect(() => {
    if (open) {
      if (closeTimer.current !== null) window.clearTimeout(closeTimer.current)
      closeTimer.current = null
      setPanelMounted(true)
      return
    }
    if (panelMounted) {
      closeTimer.current = window.setTimeout(() => {
        setPanelMounted(false)
        closeTimer.current = null
      }, PANEL_EXIT_MS)
    }
    return () => {
      if (closeTimer.current !== null) window.clearTimeout(closeTimer.current)
      closeTimer.current = null
    }
  }, [open, panelMounted])

  useEffect(() => {
    let previousY = window.scrollY
    const onScroll = () => {
      const currentY = window.scrollY
      setCompact(currentY > 12)
      if (Math.abs(currentY - previousY) > 2 && openRef.current) {
        scrollClosedRef.current = true
        setOpen(false)
      }
      previousY = currentY
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    if (wasOpen.current && !open) {
      if (!scrollClosedRef.current) launcherRef.current?.focus()
      scrollClosedRef.current = false
    }
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
          aria-expanded={open}
          aria-label={ASSISTANT_NAME}
          title={compact ? `Open ${ASSISTANT_NAME}` : undefined}
          onClick={() => setOpen(true)}
          className={cn('peolwane-launcher', compact && 'peolwane-launcher--compact', placement === 'applicant' && 'peolwane-launcher--applicant')}
        >
          <span className="peolwane-launcher__icon"><Sparkles aria-hidden className="h-5 w-5" /></span>
          <span className="peolwane-launcher__label">Peolwane <strong>AI</strong></span>
          <span className="peolwane-launcher__hint">Ask a question</span>
        </button>
      )}
      {panelMounted && <Panel config={config} closing={!open} />}
    </>
  )
}

const STATUS_TEXT: Record<AssistantStatus, string> = {
  idle: '',
  listening: 'Listening… tap again when you have finished.',
  transcribing: 'Working out what you said…',
  thinking: 'Peolwane is putting together an answer…',
  speaking: 'Speaking the answer…',
}

function Panel({ config, closing }: { config: AssistantConfig; closing: boolean }) {
  const { mode, status, messages, error, voiceUnavailable } = useAssistant()
  const titleId = useId()
  const logRef = useRef<HTMLOListElement>(null)
  const micRef = useRef<HTMLButtonElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const panelRef = useRef<HTMLElement>(null)
  const [draft, setDraft] = useState('')
  const busy = status === 'transcribing' || status === 'thinking'
  const showPrompts = messages.length === 1

  useEffect(() => {
    if (mode === 'voice') micRef.current?.focus()
    else inputRef.current?.focus()
  }, [mode])

  useEffect(() => {
    const log = logRef.current
    if (log) log.scrollTop = log.scrollHeight
  }, [messages])

  useEffect(() => {
    const panel = panelRef.current
    if (!panel) return
    panel.toggleAttribute('inert', closing)
    if (closing && panel.contains(document.activeElement)) {
      const activeElement = document.activeElement
      if (activeElement instanceof HTMLElement) activeElement.blur()
    }
  }, [closing])

  useEffect(() => {
    const panel = panelRef.current
    if (!panel) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation()
        setOpen(false)
      }
    }
    panel.addEventListener('keydown', onKeyDown)
    return () => panel.removeEventListener('keydown', onKeyDown)
  }, [])

  function submitQuestion(question: string, source: 'voice' | 'text' = 'text') {
    if (!question.trim() || busy) return
    if (source === 'text' && mode !== 'text') setMode('text')
    void sendQuestion(config, question, source)
    setDraft('')
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault()
    submitQuestion(draft)
  }

  return (
    <section
      role="dialog"
      aria-modal="false"
      aria-labelledby={titleId}
      aria-hidden={closing || undefined}
      ref={panelRef}
      data-print="hide"
      className={cn('peolwane-panel', closing && 'peolwane-panel--closing')}
    >
      <header className="peolwane-panel__header">
        <div className="peolwane-panel__brandmark" aria-hidden><Sparkles className="h-6 w-6" /></div>
        <div className="min-w-0 flex-1">
          <p className="peolwane-panel__eyebrow">CEDA PORTAL GUIDE</p>
          <h2 id={titleId} className="peolwane-panel__title">Peolwane AI</h2>
          <p className="peolwane-panel__subtitle">Here to help you find your way</p>
        </div>
        <span className="peolwane-panel__online"><span />{status === 'thinking' || status === 'transcribing' ? 'Working' : status === 'listening' ? 'Listening' : 'Ready'}</span>
        <button type="button" onClick={() => setOpen(false)} className="peolwane-panel__close" aria-label={`Close ${ASSISTANT_NAME}`}>
          <X aria-hidden className="h-5 w-5" />
        </button>
      </header>

      <div className="peolwane-panel__mode" role="group" aria-label="How to talk to Peolwane AI">
        <ModeButton active={mode === 'text'} onClick={() => setMode('text')} icon={<Keyboard aria-hidden className="h-4 w-4" />} label="Text" />
        <ModeButton active={mode === 'voice'} onClick={() => setMode('voice')} icon={<Mic aria-hidden className="h-4 w-4" />} label="Voice" />
      </div>

      <div className="peolwane-panel__conversation">
        <div className="peolwane-panel__section-label"><span /> YOUR CONVERSATION</div>
        <ol ref={logRef} role="log" aria-label="Conversation with Peolwane AI" className="peolwane-panel__messages">
          {messages.map((message) => (
            <li key={message.id} className={cn('peolwane-message', `peolwane-message--${message.role}`)} aria-busy={message.pending || undefined}>
              {message.role === 'assistant' && <span className="peolwane-message__avatar" aria-hidden><Sparkles className="h-3.5 w-3.5" /></span>}
              <p className="peolwane-message__bubble">
                <span className="sr-only">{message.role === 'user' ? 'You: ' : `${ASSISTANT_NAME}: `}</span>
                {message.content || (message.pending ? <span className="peolwane-typing" aria-label="Thinking"><i /><i /><i /></span> : '')}
              </p>
            </li>
          ))}
        </ol>

        {showPrompts && (
          <div className="peolwane-prompts" aria-label="Suggested questions">
            <p>Not sure where to start?</p>
            <div>{PROMPTS.map((prompt) => <button key={prompt} type="button" onClick={() => submitQuestion(prompt)}>{prompt}<ArrowUp aria-hidden className="h-3.5 w-3.5" /></button>)}</div>
          </div>
        )}
      </div>

      <div className="peolwane-panel__composer">
        <p aria-live="polite" className="peolwane-panel__status">{STATUS_TEXT[status]}</p>
        {(error || voiceUnavailable) && <p role="alert" className="peolwane-panel__error">{error ?? voiceUnavailable}</p>}

        {mode === 'voice' ? (
          <div className="peolwane-voice-control">
            {status === 'speaking' ? (
              <button ref={micRef} type="button" onClick={stopSpeaking}><VolumeX aria-hidden className="h-5 w-5" />Stop speaking</button>
            ) : status === 'listening' ? (
              <button ref={micRef} type="button" onClick={stopListening} className="peolwane-voice-control--listening"><Square aria-hidden className="h-4 w-4" />Stop and send</button>
            ) : (
              <button ref={micRef} type="button" onClick={() => void startListening(config)} disabled={busy}>
                {busy ? <Loader2 aria-hidden className="h-5 w-5 animate-spin" /> : <Mic aria-hidden className="h-5 w-5" />}
                Start speaking
              </button>
            )}
          </div>
        ) : (
          <form onSubmit={onSubmit} className="peolwane-input-row">
            <label className="sr-only" htmlFor="peolwane-question">Your question</label>
            <input id="peolwane-question" ref={inputRef} value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={1000} placeholder="Ask me about the portal…" />
            <button type="submit" aria-label="Send question" disabled={busy || !draft.trim()}>
              {busy ? <Loader2 aria-hidden className="h-5 w-5 animate-spin" /> : <Send aria-hidden className="h-5 w-5" />}
            </button>
          </form>
        )}

        <p className="peolwane-panel__privacy"><ShieldCheck aria-hidden className="h-4 w-4" />
          Chat history stays in this tab and clears when it closes. Don&apos;t share personal or case details. <Link to="/privacy">Privacy</Link>
        </p>
      </div>
    </section>
  )
}

function ModeButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: ReactNode; label: string }) {
  return <button type="button" aria-pressed={active} onClick={onClick} className={cn('peolwane-mode-button', active && 'peolwane-mode-button--active')}>{icon}{label}</button>
}

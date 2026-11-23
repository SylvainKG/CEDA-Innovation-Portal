import { ArrowUp, ChevronRight, Keyboard, Loader2, Mic, Pause, Play, Send, ShieldCheck, Sparkles, Square, VolumeX, X } from 'lucide-react'
import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { prefersReducedMotion } from '@/features/preferences/settings'
import { cn } from '@/lib/cn'
import { assistantConfig, type AssistantConfig } from './leseding'
import {
  ASSISTANT_NAME,
  orbState,
  sendQuestion,
  setMode,
  setOpen,
  startListening,
  stopListening,
  stopSpeaking,
  useAssistant,
  type AssistantMessage,
  type AssistantStatus,
  type OrbState,
} from './store'
import './assistant.css'

const PROMPTS = ['How do I submit an idea?', 'Where can I find open challenges?', 'What happens after I apply?']
const PANEL_EXIT_MS = 340
/** How long each suggested question shows before the next one (ms). */
const PROMPT_EVERY_MS = 4000

/**
 * Where the way in to Peolwane AI sits: `default` and `applicant` float a launcher at the bottom right (the applicant
 * one clears the phone navigation bar); `sidebar` floats nothing, because the staff sidebar carries
 * <PeolwaneSidebarLauncher />, and opens the panel beside the sidebar.
 */
export type AssistantPlacement = 'default' | 'applicant' | 'sidebar'

/** Return focus to the visible staff launcher, or to the menu button when its mobile drawer has closed. */
function sidebarAssistantFocusTarget(): HTMLElement | undefined {
  const all = Array.from(document.querySelectorAll<HTMLElement>('[data-peolwane-launcher]'))
  return (
    all.find((el) => el.getClientRects().length > 0) ??
    document.querySelector<HTMLElement>('button[aria-controls="staff-drawer"]') ??
    all[0]
  )
}

/** A tab-persistent portal guide with a compact launcher that gets out of the way while the page scrolls. */
export function PeolwaneAssistant({ placement = 'default', config = assistantConfig }: { placement?: AssistantPlacement; config?: AssistantConfig | null }) {
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
      const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
      if (reduceMotion) {
        setPanelMounted(false)
        return
      }
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
      if (!scrollClosedRef.current) (launcherRef.current ?? sidebarAssistantFocusTarget())?.focus()
      scrollClosedRef.current = false
    }
    wasOpen.current = open
  }, [open])

  if (!config) return null
  return (
    <>
      {placement === 'sidebar' ? null : <button
        ref={launcherRef}
        type="button"
        data-print="hide"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-hidden={open || undefined}
        tabIndex={open ? -1 : undefined}
        aria-label={ASSISTANT_NAME}
        title={compact ? `Open ${ASSISTANT_NAME}` : undefined}
        onClick={() => setOpen(true)}
        className={cn('peolwane-launcher', compact && 'peolwane-launcher--compact', placement === 'applicant' && 'peolwane-launcher--applicant')}
      >
        <span className="peolwane-launcher__icon"><Sparkles aria-hidden className="h-5 w-5" /></span>
        <span className="peolwane-launcher__label">Peolwane <strong>AI</strong></span>
        <span className="peolwane-launcher__hint">Ask a question</span>
      </button>}
      {panelMounted && <Panel config={config} closing={!open} beside={placement === 'sidebar'} />}
    </>
  )
}

/**
 * The staff sidebar's way in to Peolwane AI (team, 23 Nov): an item under the navigation in the launcher's sunrise
 * colours, instead of the floating button applicants and visitors see. `onOpen` lets the phone drawer close first.
 */
export function PeolwaneSidebarLauncher({ onOpen, config = assistantConfig }: { onOpen?: () => void; config?: AssistantConfig | null }) {
  const { open } = useAssistant()
  if (!config) return null
  return (
    <button
      type="button"
      data-peolwane-launcher
      data-print="hide"
      aria-haspopup="dialog"
      aria-expanded={open}
      aria-label={ASSISTANT_NAME}
      onClick={() => {
        onOpen?.()
        setOpen(true)
      }}
      className="peolwane-sidebar-launcher"
    >
      <span className="peolwane-sidebar-launcher__icon"><Sparkles aria-hidden className="h-5 w-5" /></span>
      <span className="flex min-w-0 flex-col text-left leading-tight">
        <span className="peolwane-sidebar-launcher__label">Peolwane <strong>AI</strong></span>
        <span className="peolwane-sidebar-launcher__hint">Ask a question</span>
      </span>
    </button>
  )
}

const STATUS_TEXT: Record<AssistantStatus, string> = {
  idle: '',
  listening: 'Listening… tap again when you have finished.',
  transcribing: 'Working out what you said…',
  thinking: 'Peolwane is putting together an answer…',
  speaking: 'Speaking the answer…',
}

function Panel({ config, closing, beside = false }: { config: AssistantConfig; closing: boolean; beside?: boolean }) {
  const { mode, status, messages, error, voiceUnavailable, playing } = useAssistant()
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
      className={cn('peolwane-panel', beside && 'peolwane-panel--beside-sidebar', closing && 'peolwane-panel--closing')}
    >
      <header className="peolwane-panel__header">
        <div className="peolwane-panel__brandmark" aria-hidden><Sparkles className="h-6 w-6" /></div>
        <div className="min-w-0 flex-1">
          <p className="peolwane-panel__eyebrow">CEDA PORTAL GUIDE</p>
          {/* The status sits beside the name, so the line below it has room (compact header, 23 Nov). */}
          <div className="flex flex-wrap items-center gap-x-2.5">
            <h2 id={titleId} className="peolwane-panel__title">Peolwane AI</h2>
            <span className="peolwane-panel__online"><span />{status === 'thinking' || status === 'transcribing' ? 'Working' : status === 'listening' ? 'Listening' : 'Ready'}</span>
          </div>
          <p className="peolwane-panel__subtitle">Here to help you find your way</p>
        </div>
        <button type="button" onClick={() => setOpen(false)} className="peolwane-panel__close" aria-label={`Close ${ASSISTANT_NAME}`}>
          <X aria-hidden className="h-5 w-5" />
        </button>
      </header>

      {/* Text or voice, as two halves of one control with the chosen one filled (team, 23 Nov: the small switch was easy to miss). */}
      <div className="peolwane-panel__mode">
        <div className="peolwane-mode" data-mode={mode} role="group" aria-label="How to talk to Peolwane AI">
          <span className="peolwane-mode__thumb" aria-hidden />
          <button type="button" aria-pressed={mode === 'text'} onClick={() => setMode('text')} className="peolwane-mode__option">
            <Keyboard aria-hidden className="h-4 w-4" />Text
          </button>
          <button type="button" aria-pressed={mode === 'voice'} onClick={() => setMode('voice')} className="peolwane-mode__option">
            <Mic aria-hidden className="h-4 w-4" />Voice
          </button>
        </div>
      </div>

      {mode === 'voice' ? (
        <VoiceStage state={orbState(status, playing)} messages={messages} />
      ) : (
      <div className="peolwane-panel__conversation">
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

        {showPrompts && <PromptCarousel onAsk={(prompt) => submitQuestion(prompt)} />}
      </div>
      )}

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

/**
 * Voice mode: the Leseding orb in place of the conversation, with the last exchange as a caption underneath so a
 * spoken answer is also readable. The full conversation stays available in Text mode.
 */
/**
 * The suggested questions, one at a time (team, 23 Nov: three stacked chips made the panel too tall). Each shows for a
 * few seconds, then the next slides in; it waits while the pointer or focus is on it, Next steps through by hand, and
 * Pause stops it (WCAG 2.2.2). With reduced motion it starts paused. Choosing one asks it.
 */
function PromptCarousel({ onAsk }: { onAsk: (prompt: string) => void }) {
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(() => prefersReducedMotion())
  const [held, setHeld] = useState(false)
  useEffect(() => {
    if (paused || held) return undefined
    const timer = window.setInterval(() => setIndex((i) => (i + 1) % PROMPTS.length), PROMPT_EVERY_MS)
    return () => window.clearInterval(timer)
  }, [paused, held])
  const prompt = PROMPTS[index]!
  return (
    <div
      className="peolwane-prompts"
      role="group"
      aria-roledescription="carousel"
      aria-label="Suggested questions"
      onMouseEnter={() => setHeld(true)}
      onMouseLeave={() => setHeld(false)}
      onFocus={() => setHeld(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setHeld(false)
      }}
    >
      <div className="peolwane-prompts__head">
        <p>Not sure where to start? Try:</p>
        <span className="peolwane-prompts__dots" aria-hidden>
          {PROMPTS.map((p, i) => <i key={p} className={cn(i === index && 'is-current')} />)}
        </span>
      </div>
      <div className="peolwane-prompts__row">
        <button key={prompt} type="button" onClick={() => onAsk(prompt)} className="peolwane-prompt">
          <span>{prompt}</span>
          <ArrowUp aria-hidden className="h-4 w-4 shrink-0" />
        </button>
        <button type="button" onClick={() => setIndex((i) => (i + 1) % PROMPTS.length)} aria-label="Next suggested question" className="peolwane-prompts__control">
          <ChevronRight aria-hidden className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => setPaused((p) => !p)}
          aria-label={paused ? 'Rotate the suggested questions' : 'Pause the suggested questions'}
          className="peolwane-prompts__control"
        >
          {paused ? <Play aria-hidden className="h-4 w-4" /> : <Pause aria-hidden className="h-4 w-4" />}
        </button>
      </div>
    </div>
  )
}

function VoiceStage({ state, messages }: { state: OrbState; messages: AssistantMessage[] }) {
  const lastAnswer = [...messages].reverse().find((message) => message.role === 'assistant' && message.id !== 0 && !message.pending && message.content)
  const lastQuestion = [...messages].reverse().find((message) => message.role === 'user')
  return (
    <div className="peolwane-voice-stage">
      <div className="les-orb" data-state={state} data-testid="peolwane-orb" aria-hidden>
        <span className="les-orb-ring" />
        <span className="les-orb-core" />
      </div>
      <div className="peolwane-voice-stage__caption">
        {lastAnswer ? (
          <>
            {lastQuestion && <p className="peolwane-voice-stage__you"><span className="sr-only">You said: </span>&ldquo;{lastQuestion.content}&rdquo;</p>}
            <p aria-live="polite" className="peolwane-voice-stage__answer"><span className="sr-only">{ASSISTANT_NAME}: </span>{lastAnswer.content}</p>
          </>
        ) : (
          <p className="peolwane-voice-stage__hint">Tap <strong>Start speaking</strong> and ask about the portal. Switch to Text to type instead.</p>
        )}
      </div>
    </div>
  )
}

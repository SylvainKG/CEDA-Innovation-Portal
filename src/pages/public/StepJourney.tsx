import { useEffect, useId, useState } from 'react'
import { ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react'
import { brand } from '@/brand'
import { makeFlight, prefersReducedMotion, useFlight, type Point, type Segment } from '@/brand/flight'
import { cn } from '@/lib/cn'

export interface JourneyStep {
  title: string
  actor: string
  text: string
}

/** One word per step, under its node. */
const SHORT = ['Choose', 'Prepare', 'Submit', 'Review', 'Decision']

// Five stops rising from the low left to the high right, joined by gentle S-curves.
const NODES: Point[] = [
  { x: 70, y: 226 },
  { x: 185, y: 192 },
  { x: 300, y: 158 },
  { x: 415, y: 124 },
  { x: 530, y: 90 },
]
const SEGMENTS: Segment[] = NODES.slice(1).map((to, i) => {
  const from = NODES[i]!
  return [from, { x: from.x + 52, y: from.y }, { x: to.x - 52, y: to.y }, to]
})
const PATH = makeFlight(SEGMENTS)
const AT_NODE = [0, ...PATH.stops]

/** How long each step stays before the swallow flies on (ms). */
const DWELL = 4200

/**
 * How it works hero (post-freeze, ABM 22 Nov): the five steps as the swallow's journey. The swallow flies from step to
 * step along its dotted route, the route turns gold behind it, and the panel below says what happens at that step and
 * who acts. It plays through once on its own (each step for about four seconds); Pause stops it, and the arrows or the
 * step buttons move it by hand. With the reduced-motion setting nothing plays on its own and the swallow simply moves.
 */
export function StepJourney({ steps }: { steps: JourneyStep[] }) {
  const [index, setIndex] = useState(0)
  const [playing, setPlaying] = useState(() => !prefersReducedMotion())
  const [arrived, setArrived] = useState(false)
  const reveal = `journey-reveal-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`
  const white = `journey-white-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`
  const { birdRef, trailRef } = useFlight(PATH, { target: AT_NODE[index] ?? 0, duration: 1100, delay: 150, onArrive: () => setArrived(true) })

  // Flies on after a pause at each step, once through; stops at the last.
  useEffect(() => {
    if (!playing || !arrived) return undefined
    if (index >= steps.length - 1) {
      setPlaying(false)
      return undefined
    }
    const timer = window.setTimeout(() => {
      setArrived(false)
      setIndex((i) => i + 1)
    }, DWELL)
    return () => window.clearTimeout(timer)
  }, [playing, arrived, index, steps.length])

  const go = (i: number) => {
    const next = Math.max(0, Math.min(steps.length - 1, i))
    setPlaying(false)
    // Only a real move waits for the swallow to land again.
    if (next !== index) setArrived(false)
    setIndex(next)
  }
  const step = steps[index]!
  const birdW = 64
  const birdH = (birdW * brand.mark.height) / brand.mark.width

  return (
    // min-w-0: inside a grid it may shrink to the column instead of growing to its widest content.
    <figure className="relative mx-auto flex w-full min-w-0 max-w-xl flex-col overflow-hidden rounded-[2rem] bg-[var(--ceda-night)] text-white shadow-2">
      <svg viewBox="0 0 600 300" className="block h-auto w-full" aria-hidden focusable="false">
        <defs>
          <mask id={reveal}>
            <path ref={trailRef} d={PATH.d} fill="none" stroke="#fff" strokeWidth="16" pathLength={1} strokeDasharray="1" strokeDashoffset="1" />
          </mask>
          <filter id={white} x="-20%" y="-20%" width="140%" height="140%">
            <feColorMatrix type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 1 0" />
            <feDropShadow dx="0" dy="2" stdDeviation="2.5" floodColor="#000" floodOpacity="0.45" />
          </filter>
          <radialGradient id={`${reveal}-sun`}>
            <stop offset="0" stopColor="var(--ceda-gold)" stopOpacity="0.55" />
            <stop offset="1" stopColor="var(--ceda-gold)" stopOpacity="0" />
          </radialGradient>
        </defs>
        {/* The new day the route climbs towards, and the land it starts from. */}
        <circle cx="545" cy="70" r="150" fill={`url(#${reveal}-sun)`} />
        <path d="M0,262 C150,236 300,244 430,256 C510,263 560,258 600,250 L600,300 L0,300 Z" fill="var(--ceda-amber)" opacity="0.35" />
        <path d="M0,276 C160,256 320,262 450,272 C520,277 570,274 600,268 L600,300 L0,300 Z" fill="var(--ceda-orange)" opacity="0.45" />
        <path d="M0,290 C170,276 330,280 460,288 C530,292 575,290 600,286 L600,300 L0,300 Z" fill="var(--ceda-maroon)" opacity="0.8" />
        {/* The whole route, faint; then the part already flown, in gold. */}
        <path d={PATH.d} fill="none" stroke="#fff" strokeOpacity="0.28" strokeWidth="3" strokeLinecap="round" strokeDasharray="0.5 10" />
        <path d={PATH.d} fill="none" stroke="var(--ceda-gold)" strokeWidth="3.5" strokeLinecap="round" strokeDasharray="0.5 10" mask={`url(#${reveal})`} />
        {NODES.map((n, i) => (
          <g key={i} className={cn('journey-node', i < index && 'is-done', i === index && 'is-current')}>
            <circle cx={n.x} cy={n.y} r="20" className="journey-ring" />
            <circle cx={n.x} cy={n.y} r="13" className="journey-dot" />
            <text x={n.x} y={n.y + 4.5} textAnchor="middle" fontSize="13" fontWeight="700" className="journey-num">
              {i + 1}
            </text>
          </g>
        ))}
        <g ref={birdRef}>
          <g className="flight-bob">
            <image href={brand.mark.src} x={-birdW / 2 + 6} y={-birdH - 14} width={birdW} height={birdH} filter={`url(#${white})`} />
          </g>
        </g>
      </svg>

      <div className="grid grid-cols-5 gap-1 px-3 sm:px-5" role="group" aria-label="Choose a step">
        {steps.map((s, i) => (
          <button
            key={s.title}
            type="button"
            onClick={() => go(i)}
            aria-pressed={i === index}
            aria-label={`Step ${i + 1}: ${s.title}`}
            className={cn(
              'flex min-h-touch flex-col items-center justify-center rounded-md px-1 text-xs font-semibold transition-colors',
              i === index ? 'bg-white/15 text-[var(--ceda-gold)]' : 'text-white/70 hover:bg-white/10 hover:text-white',
            )}
          >
            {/* Numbers on phones (as on the stops above), words from 768 px; the label names the step in full. */}
            <span className="text-sm md:hidden">{i + 1}</span>
            <span className="hidden md:inline">{SHORT[i] ?? i + 1}</span>
          </button>
        ))}
      </div>

      <div className="m-3 flex flex-col gap-2 rounded-[1.25rem] bg-white/10 p-4 backdrop-blur-sm sm:m-5 sm:p-5">
        <div className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-wider">
          <span className="text-[var(--ceda-gold)]">
            Step {index + 1} of {steps.length}
          </span>
          <span className="rounded-full bg-white/15 px-2.5 py-0.5 normal-case tracking-normal text-white">{step.actor}</span>
        </div>
        <p className="text-h3 font-semibold">{step.title}</p>
        <p className="text-sm text-white/80">{step.text}</p>
        <div className="mt-1 flex items-center gap-2">
          <button type="button" onClick={() => go(index - 1)} disabled={index === 0} aria-label="Previous step" className="journey-btn">
            <ChevronLeft aria-hidden className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => {
              if (index >= steps.length - 1) {
                setArrived(false)
                setIndex(0)
              }
              setPlaying((p) => !p)
            }}
            aria-label={playing ? 'Pause the tour' : index >= steps.length - 1 ? 'Play the tour again' : 'Play the tour'}
            className="journey-btn"
          >
            {playing ? <Pause aria-hidden className="h-5 w-5" /> : <Play aria-hidden className="h-5 w-5" />}
          </button>
          <button type="button" onClick={() => go(index + 1)} disabled={index === steps.length - 1} aria-label="Next step" className="journey-btn">
            <ChevronRight aria-hidden className="h-5 w-5" />
          </button>
        </div>
      </div>
    </figure>
  )
}

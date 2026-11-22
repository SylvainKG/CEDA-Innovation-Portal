import { useEffect, useRef } from 'react'

/**
 * The swallow's flight engine (post-freeze, ABM 22 Nov). One progress value, measured along the path's length,
 * drives both the bird's position and how much of its dotted trail is drawn, so the two can never drift apart. The
 * geometry is plain maths (cubic Bézier segments, measured by sampling), so it needs no browser measuring and runs the
 * same in tests. With the reduced-motion setting the bird is placed at once and the trail drawn in full.
 */

export interface Point {
  x: number
  y: number
}

/** One cubic Bézier segment: start, two control points, end. */
export type Segment = [Point, Point, Point, Point]

const cubic = ([p0, p1, p2, p3]: Segment, t: number): Point => {
  const u = 1 - t
  return {
    x: u * u * u * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * p3.x,
    y: u * u * u * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * p3.y,
  }
}

const SAMPLES = 48

export interface Flight {
  /** The path for an SVG `d` attribute. */
  d: string
  /** Where along the path (0–1 of its length) each segment ends: the stops between segments. */
  stops: number[]
  /** The point at a fraction (0–1) of the path's length. */
  at: (fraction: number) => Point
}

/** Builds a flight from joined segments (each starts where the previous one ends). */
export function makeFlight(segments: Segment[]): Flight {
  const table: { len: number; seg: number; t: number }[] = [{ len: 0, seg: 0, t: 0 }]
  const stopsAbs: number[] = []
  let length = 0
  segments.forEach((s, i) => {
    let prev = cubic(s, 0)
    for (let k = 1; k <= SAMPLES; k++) {
      const t = k / SAMPLES
      const p = cubic(s, t)
      length += Math.hypot(p.x - prev.x, p.y - prev.y)
      table.push({ len: length, seg: i, t })
      prev = p
    }
    stopsAbs.push(length)
  })
  const first = segments[0]
  const d =
    first === undefined
      ? ''
      : `M${first[0].x},${first[0].y} ` + segments.map(([, c1, c2, e]) => `C${c1.x},${c1.y} ${c2.x},${c2.y} ${e.x},${e.y}`).join(' ')
  const at = (fraction: number): Point => {
    const target = Math.min(1, Math.max(0, fraction)) * length
    let i = table.findIndex((r) => r.len >= target)
    if (i <= 0) i = 1
    const a = table[i - 1]!
    const b = table[Math.min(i, table.length - 1)]!
    const span = b.len - a.len || 1
    const k = (target - a.len) / span
    const seg = segments[b.seg]!
    const tA = a.seg === b.seg ? a.t : 0
    return cubic(seg, tA + (b.t - tA) * k)
  }
  return { d, stops: stopsAbs.map((l) => (length ? l / length : 0)), at }
}

export const prefersReducedMotion = () =>
  typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)

export interface FlightOptions {
  /** Where the bird should be, as a fraction (0–1) of the path's length. */
  target: number
  /** How long the move takes (ms); shorter hops can pass less. */
  duration?: number
  /** Wait before moving (ms), for example while the sun glows. */
  delay?: number
  /** The bird grows to full size as it flies (the home page's sunrise). */
  grow?: boolean
  /** The size it starts at when it grows (fraction of full size). */
  growFrom?: number
  /** Called once the bird is where it should be. */
  onArrive?: () => void
}

/**
 * Animates the bird (a `<g>`) along a flight and draws the trail (a `<path pathLength={1}>` used as a mask) up to the
 * bird, from one progress value. Attach the refs; change `target` to fly somewhere else.
 */
export function useFlight(flight: Flight, { target, duration = 1800, delay = 0, grow = false, growFrom = 0.42, onArrive }: FlightOptions) {
  const birdRef = useRef<SVGGElement>(null)
  const trailRef = useRef<SVGPathElement>(null)
  const progress = useRef(0)
  const arrive = useRef(onArrive)
  useEffect(() => {
    arrive.current = onArrive
  })

  useEffect(() => {
    const place = (p: number) => {
      const { x, y } = flight.at(p)
      const scale = grow ? growFrom + (1 - growFrom) * p : 1
      birdRef.current?.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${scale.toFixed(3)})`)
      if (birdRef.current) birdRef.current.style.opacity = grow ? String(Math.min(1, p / 0.12)) : '1'
      if (trailRef.current) trailRef.current.style.strokeDashoffset = String(1 - p)
    }
    const from = progress.current
    if (prefersReducedMotion() || typeof window.requestAnimationFrame !== 'function') {
      progress.current = target
      place(target)
      arrive.current?.()
      return undefined
    }
    place(from)
    let frame = 0
    let start = 0
    const step = (now: number) => {
      if (!start) start = now
      const t = Math.min(1, Math.max(0, (now - start - delay) / duration))
      const p = from + (target - from) * easeInOut(t)
      progress.current = p
      place(p)
      if (t < 1) frame = window.requestAnimationFrame(step)
      else arrive.current?.()
    }
    frame = window.requestAnimationFrame(step)
    return () => window.cancelAnimationFrame(frame)
    // The flight's shape is fixed for a component; only the target moves the bird.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target])

  return { birdRef, trailRef }
}

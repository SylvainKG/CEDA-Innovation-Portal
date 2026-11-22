import { useId } from 'react'
import { brand } from '@/brand'

/**
 * Brand artwork drawn in code (post-freeze, ABM 22 Nov): CEDA's sunrise and Peolwane's swallow. No photo, so no
 * licence to clear. The colours are the four in CEDA's logo (the sun over the land) and the brown of its wordmark;
 * they live as CSS variables in `src/styles/index.css` (--ceda-*). Decorative only: everything they show is said in
 * text elsewhere on the page, so screen readers skip them.
 */

/** A stable id for SVG gradients and masks (React's ids contain colons, which `url(#…)` can't take). */
const useSvgId = (name: string) => `${name}-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`

// The swallow's flight: a cubic curve from the low left to the top right, over the sun.
const P0 = { x: 52, y: 352 }
const C1 = { x: 170, y: 250 }
const C2 = { x: 330, y: 70 }
const P3 = { x: 520, y: 96 }
const FLIGHT = `M${P0.x},${P0.y} C${C1.x},${C1.y} ${C2.x},${C2.y} ${P3.x},${P3.y}`

/** A point on the flight curve at t (0–1). */
function onFlight(t: number) {
  const u = 1 - t
  const x = u * u * u * P0.x + 3 * u * u * t * C1.x + 3 * u * t * t * C2.x + t * t * t * P3.x
  const y = u * u * u * P0.y + 3 * u * u * t * C1.y + 3 * u * t * t * C2.y + t * t * t * P3.y
  return { x, y }
}

/** The five public stages sit along the flight: submission low on the left, award at the top. */
const STAGE_POINTS = [0.06, 0.28, 0.5, 0.71, 0.9].map(onFlight)

// The land, back to front, as in the logo: amber, orange, gold (a ribbon), maroon. White seams between them.
const LAND = [
  { fill: 'var(--ceda-amber)', d: 'M0,300 C120,252 240,262 330,286 C420,310 500,300 600,262 L600,440 L0,440 Z' },
  { fill: 'var(--ceda-orange)', d: 'M0,336 C110,300 220,302 320,326 C420,350 510,340 600,306 L600,440 L0,440 Z' },
  { fill: 'var(--ceda-gold)', d: 'M0,364 C130,334 250,338 345,356 C445,375 525,368 600,340 L600,440 L0,440 Z' },
  { fill: 'var(--ceda-maroon)', d: 'M0,386 C130,354 250,358 345,376 C445,395 525,390 600,364 L600,440 L0,440 Z' },
]

// The first rains the swallow announces (brand concept, Option 1): a light shower in the open sky, clear of the flight.
const DROPS = [
  { x: 58, y: 48 },
  { x: 96, y: 92 },
  { x: 132, y: 40 },
  { x: 170, y: 118 },
  { x: 74, y: 150 },
  { x: 206, y: 66 },
  { x: 118, y: 196 },
  { x: 236, y: 138 },
]
const DROP = 'M0,-8 C3,-3 4.5,0 4.5,2.5 A4.5,4.5 0 0 1 -4.5,2.5 C-4.5,0 -3,-3 0,-8 Z'

/** The home page hero: sunrise over the land, the first rains, and the swallow's dotted flight through the five stages. */
export function SunriseJourney({ className }: { className?: string }) {
  const sky = useSvgId('sky')
  const sun = useSvgId('sun')
  const reveal = useSvgId('reveal')
  const birdW = 92
  const birdH = (birdW * brand.mark.height) / brand.mark.width
  return (
    <svg viewBox="0 0 600 440" className={className} aria-hidden focusable="false" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id={sky} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fffaf3" />
          <stop offset="1" stopColor="#ffe3c2" />
        </linearGradient>
        <radialGradient id={sun} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="var(--ceda-gold)" />
          <stop offset="0.75" stopColor="var(--ceda-amber)" />
          <stop offset="1" stopColor="var(--ceda-orange)" />
        </radialGradient>
        <mask id={reveal}>
          <path d={FLIGHT} fill="none" stroke="#fff" strokeWidth="10" pathLength={1} className="horizon-draw" />
        </mask>
      </defs>
      <rect width="600" height="440" fill={`url(#${sky})`} />
      {/* The sun's glow, then the sun rising behind the land. */}
      <circle cx="330" cy="300" r="232" fill="none" stroke="var(--ceda-gold)" strokeOpacity="0.18" strokeWidth="2" />
      <circle cx="330" cy="300" r="190" fill="none" stroke="var(--ceda-amber)" strokeOpacity="0.22" strokeWidth="2" />
      <circle cx="330" cy="300" r="148" fill={`url(#${sun})`} className="horizon-sun" />
      {DROPS.map((d, i) => (
        <g key={i} transform={`translate(${d.x} ${d.y})`}>
          <path d={DROP} fill="#3f6fa8" className="horizon-rain" style={{ animationDelay: `${(i * 0.37) % 2.4}s` }} />
        </g>
      ))}
      {LAND.map((l) => (
        <path key={l.fill} d={l.d} fill={l.fill} stroke="#fff" strokeWidth="3" strokeLinejoin="round" />
      ))}
      {/* The flight: a dotted line that draws itself once, with the five stages along it. */}
      <path
        d={FLIGHT}
        fill="none"
        stroke="var(--ceda-brown)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray="0.5 11"
        mask={`url(#${reveal})`}
      />
      {STAGE_POINTS.map((p, i) => (
        <g key={i} className="horizon-stage" style={{ animationDelay: `${0.35 + i * 0.28}s` }}>
          <circle cx={p.x} cy={p.y} r="15" fill="#fff" stroke="var(--ceda-brown)" strokeWidth="2" />
          <text x={p.x} y={p.y + 5} textAnchor="middle" fontSize="14" fontWeight="700" fill="var(--ceda-brown)">
            {i + 1}
          </text>
        </g>
      ))}
      <image href={brand.mark.src} x={P3.x - birdW / 2 + 18} y={P3.y - birdH - 6} width={birdW} height={birdH} className="horizon-bird" />
    </svg>
  )
}

/**
 * The same land as a band across the top of the footer: it rises out of the page and settles into the footer's
 * deep brown, so the site opens and closes on the same horizon.
 */
export function HorizonEdge({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 1440 120" preserveAspectRatio="none" className={className} aria-hidden focusable="false">
      <path d="M0,46 C260,10 520,18 760,40 C1000,62 1220,58 1440,22 L1440,120 L0,120 Z" fill="var(--ceda-gold)" />
      <path d="M0,62 C240,30 500,34 740,56 C990,80 1210,76 1440,42 L1440,120 L0,120 Z" fill="var(--ceda-amber)" />
      <path d="M0,78 C250,48 510,52 750,72 C1000,94 1220,92 1440,60 L1440,120 L0,120 Z" fill="var(--ceda-orange)" />
      <path d="M0,92 C240,66 500,70 745,88 C995,108 1215,106 1440,78 L1440,120 L0,120 Z" fill="var(--ceda-maroon)" />
      <path d="M0,104 C250,84 510,88 750,102 C1000,118 1220,116 1440,94 L1440,120 L0,120 Z" fill="var(--ceda-night)" />
    </svg>
  )
}

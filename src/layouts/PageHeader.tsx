import type { ReactNode } from 'react'
import { brand } from '@/brand'

/**
 * The header of a signed-in page and the help pages (post-freeze, ABM 22 Nov), so the workspaces read as the same
 * site as the public pages: a soft sunrise card (CEDA's sky colours, the sun's glow in a corner, the swallow faint in
 * the background, the sunrise line along the bottom) with an optional eyebrow, the page's one h1, an intro, actions on
 * the right and an optional row below (figures, filters). Text stays on near-white, so contrast is as on a card.
 */
export function PageHeader({
  eyebrow,
  title,
  intro,
  actions,
  children,
}: {
  eyebrow?: string
  title: ReactNode
  intro?: ReactNode
  actions?: ReactNode
  children?: ReactNode
}) {
  return (
    <div className="relative isolate overflow-hidden rounded-[1.5rem] border border-line bg-[linear-gradient(120deg,var(--ceda-sky-start),var(--ceda-band-start))] px-5 pb-6 pt-5 shadow-1 md:px-8 md:pb-7 md:pt-7">
      <div aria-hidden className="pointer-events-none absolute -right-20 -top-28 -z-10 h-72 w-72 rounded-full bg-[radial-gradient(circle,color-mix(in_srgb,var(--ceda-gold)_40%,transparent),transparent_66%)]" />
      <img src={brand.mark.src} alt="" aria-hidden width={brand.mark.width} height={brand.mark.height} className="pointer-events-none absolute -bottom-4 right-8 -z-10 hidden h-28 w-auto opacity-[0.08] md:block" />
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="flex min-w-0 flex-col gap-1.5">
          {eyebrow ? <p className="text-sm font-bold uppercase tracking-wider text-brand-text">{eyebrow}</p> : null}
          <h1 className="text-[1.75rem] font-semibold leading-tight md:text-[2rem]">{title}</h1>
          {intro ? <div className="max-w-2xl text-ink-muted">{intro}</div> : null}
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
      </div>
      {children ? <div className="mt-5">{children}</div> : null}
      <span aria-hidden className="absolute inset-x-0 bottom-0 h-1 bg-[linear-gradient(90deg,var(--ceda-gold),var(--ceda-amber),var(--ceda-orange),var(--ceda-maroon))]" />
    </div>
  )
}

/** A small figure for a PageHeader's row: a number and what it counts, on a white chip. */
export function HeaderFigure({ value, label, tone = 'plain' }: { value: number; label: string; tone?: 'plain' | 'alert' }) {
  return (
    <li className="flex items-baseline gap-2 rounded-full border border-line bg-white/85 px-4 py-1.5">
      <span className={`text-[1.125rem] font-semibold ${tone === 'alert' && value > 0 ? 'text-error' : 'text-ink'}`}>{value}</span>
      <span className="text-sm text-ink-muted">{label}</span>
    </li>
  )
}

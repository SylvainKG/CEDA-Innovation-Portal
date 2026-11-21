/**
 * Shown in every shell: the portal is a demonstration with fictional data (spec §4). Laid out to Sandra's 21 Nov
 * frames: a light yellow pill with a small DEMO chip and "Demo environment — fictional data" (text from md up).
 */
export function DemoBadge() {
  return (
    <span className="inline-flex shrink-0 items-center gap-2 rounded-full border border-brand-accent bg-brand-accent-subtle py-0.5 pl-0.5 pr-0.5 text-xs text-ink md:pr-3">
      <span className="rounded-full bg-brand-accent px-2 py-0.5 font-bold tracking-wide">DEMO</span>
      <span className="sr-only md:not-sr-only">
        <span className="sr-only">: </span>Demo environment — fictional data
      </span>
    </span>
  )
}

/** Marks seeded or placeholder content that is not confirmed by CEDA (spec §6). */
export function SampleLabel({ text = 'Sample: awaiting CEDA confirmation' }: { text?: string }) {
  return <span className="inline-flex rounded-sm border border-dashed border-demo-border bg-demo-subtle px-2 py-0.5 text-sm text-demo">{text}</span>
}

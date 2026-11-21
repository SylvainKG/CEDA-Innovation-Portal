import { FlaskConical } from 'lucide-react'

/** Shown in every shell: the portal is a demonstration with fictional data (spec §4). Dark pill (Sandra, 20 Nov). */
export function DemoBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-demo px-3 py-1 text-sm font-semibold text-demo-on">
      <FlaskConical aria-hidden className="h-4 w-4" />
      DEMO<span className="sr-only">: </span>
      <span className="ml-1 hidden font-normal md:inline">fictional data</span>
    </span>
  )
}

/** Marks seeded or placeholder content that is not confirmed by CEDA (spec §6). */
export function SampleLabel({ text = 'Sample: awaiting CEDA confirmation' }: { text?: string }) {
  return <span className="inline-flex rounded-sm border border-dashed border-demo-border bg-demo-subtle px-2 py-0.5 text-sm text-demo">{text}</span>
}

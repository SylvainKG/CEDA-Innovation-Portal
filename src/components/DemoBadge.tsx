import { FlaskConical } from 'lucide-react'

/** Shown in every shell: the portal is a demonstration with fictional data (spec §4). Yellow pill (Figma, 21 Nov). */
export function DemoBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-yellow-100 px-3 py-1 text-xs font-medium text-yellow-900">
      <FlaskConical aria-hidden className="h-3.5 w-3.5" />
      DEMO · Demo environment — fictional data
    </span>
  )
}

/** Marks seeded or placeholder content that is not confirmed by CEDA (spec §6). */
export function SampleLabel({ text = 'Sample: awaiting CEDA confirmation' }: { text?: string }) {
  return <span className="inline-flex rounded-sm border border-dashed border-demo-border bg-demo-subtle px-2 py-0.5 text-sm text-demo">{text}</span>
}

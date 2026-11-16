/** Shown in every shell: the portal is a demonstration with fictional data (spec §4). */
export function DemoBadge() {
  return (
    <span className="inline-flex items-center rounded-full bg-demo-subtle px-3 py-1 text-sm font-semibold text-demo">
      DEMO<span className="sr-only">: </span>
      <span className="ml-1 hidden font-normal md:inline">fictional data</span>
    </span>
  )
}

/** Marks seeded or placeholder content that is not confirmed by CEDA (spec §6). */
export function SampleLabel({ text = 'Sample: awaiting CEDA confirmation' }: { text?: string }) {
  return <span className="inline-flex rounded-sm bg-demo-subtle px-2 py-0.5 text-sm text-demo">{text}</span>
}

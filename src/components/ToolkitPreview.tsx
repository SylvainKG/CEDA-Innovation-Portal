import * as RadixDialog from '@radix-ui/react-dialog'
import { Wrench, X } from 'lucide-react'
import { useId } from 'react'
import type { ToolkitTool } from '@/features/toolkit-preview/catalogue'
import { Button } from './Button'

export interface ToolkitPreviewProps {
  /** "Business Development Toolkit" */
  title: string
  /** "Coming soon" */
  eyebrow: string
  /** One sentence on how the tools fit the person's work. */
  workflow: string
  tools: readonly ToolkitTool[]
  /** Ids of the tools shown as cards; the dialog lists every tool. */
  highlighted: readonly string[]
}

function PlannedBadge() {
  return <span className="inline-flex shrink-0 items-center rounded-full bg-status-draft-bg px-2 py-0.5 text-xs font-semibold text-ink">Planned feature</span>
}

function ToolItem({ tool }: { tool: ToolkitTool }) {
  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="font-semibold">{tool.name}</h3>
        <PlannedBadge />
      </div>
      <p className="text-sm text-ink-muted">{tool.description}</p>
    </>
  )
}

/**
 * Information section introducing planned tools (docs/plans/toolkit-preview/PLAN.md). Static: no data, no requests,
 * no links into tools that don't exist. The dialog uses Radix with a Trigger, so Escape closes it, focus is trapped
 * inside and returns to the button on close; it is full screen on phones and a side sheet from 768 px, like the
 * portal's action dialogs. Nothing animates.
 */
export function ToolkitPreview({ title, eyebrow, workflow, tools, highlighted }: ToolkitPreviewProps) {
  const headingId = useId()
  const cards = highlighted.map((id) => tools.find((t) => t.id === id)).filter((t): t is ToolkitTool => Boolean(t))

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-4 rounded-md border border-line bg-surface-card p-4 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <p className="text-xs font-bold uppercase tracking-wider text-brand-text">{eyebrow}</p>
          <h2 id={headingId} className="flex items-center gap-2 text-h2 font-semibold">
            <Wrench aria-hidden className="h-6 w-6 shrink-0 text-brand-text" />
            {title}
          </h2>
          <p className="text-ink-muted">{workflow}</p>
          <p className="text-sm font-semibold">These tools are planned and not yet available.</p>
        </div>
        <RadixDialog.Root>
          <RadixDialog.Trigger asChild>
            <Button variant="secondary">View planned tools</Button>
          </RadixDialog.Trigger>
          <RadixDialog.Portal>
            <RadixDialog.Overlay className="fixed inset-0 bg-black/40" />
            <RadixDialog.Content className="fixed inset-0 z-40 flex flex-col bg-surface-card shadow-2 md:inset-y-0 md:left-auto md:right-0 md:w-full md:max-w-[480px]">
              <div className="flex items-start justify-between gap-4 p-6 pb-4">
                <RadixDialog.Title className="text-h3 font-semibold">{title}</RadixDialog.Title>
                <RadixDialog.Close asChild>
                  <button
                    type="button"
                    aria-label="Close"
                    className="inline-flex min-h-touch min-w-touch items-center justify-center rounded-full border border-line hover:bg-surface-sunken"
                  >
                    <X aria-hidden className="h-5 w-5" />
                  </button>
                </RadixDialog.Close>
              </div>
              <RadixDialog.Description className="bg-brand-subtle px-6 py-3 text-sm text-ink">
                {tools.length} planned tools. They are not yet available.
              </RadixDialog.Description>
              <ul aria-label={`${title}: planned tools`} className="flex flex-1 flex-col gap-3 overflow-y-auto p-6">
                {tools.map((t) => (
                  <li key={t.id} className="flex flex-col gap-1 rounded-md border border-line p-3">
                    <ToolItem tool={t} />
                  </li>
                ))}
              </ul>
            </RadixDialog.Content>
          </RadixDialog.Portal>
        </RadixDialog.Root>
      </div>
      <ul aria-label={`${title}: highlighted tools`} className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {cards.map((t) => (
          <li key={t.id} className="flex flex-col gap-1 rounded-md bg-surface-card p-4 shadow-1">
            <ToolItem tool={t} />
          </li>
        ))}
      </ul>
    </section>
  )
}

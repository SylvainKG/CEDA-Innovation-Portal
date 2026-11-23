import * as RadixDialog from '@radix-ui/react-dialog'
import { CalendarClock, Sparkles, X } from 'lucide-react'
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
  return (
    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-status-draft-bg px-2.5 py-1 text-sm font-semibold text-ink">
      <CalendarClock aria-hidden className="h-4 w-4 text-status-draft-fg" />
      Planned feature
    </span>
  )
}

function ToolItem({ tool }: { tool: ToolkitTool }) {
  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="font-semibold leading-snug">{tool.name}</h3>
        <PlannedBadge />
      </div>
      <p className="text-sm text-ink-muted">{tool.description}</p>
    </>
  )
}

/**
 * Information section introducing planned tools (docs/plans/toolkit-preview/PLAN.md). Static: no data, no requests,
 * no links into tools that don't exist. The dialog uses Radix with a Trigger, so Escape closes it, focus is trapped
 * inside and returns to the button on close; it is full screen on phones and a side sheet from 768 px.
 */
export function ToolkitPreview({ title, eyebrow, workflow, tools, highlighted }: ToolkitPreviewProps) {
  const headingId = useId()
  const cards = highlighted.map((id) => tools.find((t) => t.id === id)).filter((t): t is ToolkitTool => Boolean(t))

  return (
    <section
      aria-labelledby={headingId}
      className="overflow-hidden rounded-md border border-line bg-surface-card shadow-1"
    >
      <div className="toolkit-preview__hero relative isolate flex flex-col gap-5 overflow-hidden bg-[linear-gradient(135deg,var(--ceda-sky-start),var(--ceda-sky-end))] p-4 sm:p-6 md:flex-row md:items-center md:justify-between md:gap-8">
        <div aria-hidden className="pointer-events-none absolute -right-12 -top-20 -z-10 h-56 w-56 rounded-full bg-[radial-gradient(circle,color-mix(in_srgb,var(--ceda-gold)_38%,transparent),transparent_68%)]" />
        <div className="flex min-w-0 flex-col gap-3">
          <p className="text-sm font-bold uppercase tracking-wider text-brand-text">{eyebrow}</p>
          <div className="flex items-start gap-3">
            <span aria-hidden className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--ceda-night)] text-[var(--ceda-gold)] shadow-1">
              <Sparkles className="h-5 w-5" />
            </span>
            <div className="flex min-w-0 flex-col gap-1">
              <h2 id={headingId} className="text-h2 font-semibold">{title}</h2>
              <p className="text-ink-muted">{workflow}</p>
            </div>
          </div>
          <p className="flex items-center gap-2 text-sm font-semibold text-ink">
            <CalendarClock aria-hidden className="h-4 w-4 shrink-0 text-brand-text" />
            These tools are planned and not yet available.
          </p>
        </div>
        <RadixDialog.Root>
          <RadixDialog.Trigger asChild>
            <Button variant="secondary" className="shrink-0">View planned tools</Button>
          </RadixDialog.Trigger>
          <RadixDialog.Portal>
            <RadixDialog.Overlay className="toolkit-preview__overlay fixed inset-0 z-40 bg-black/40" />
            <RadixDialog.Content className="toolkit-preview__sheet fixed inset-0 z-50 flex flex-col bg-surface-card shadow-2 md:inset-y-0 md:left-auto md:right-0 md:w-full md:max-w-[480px]">
              <div className="flex items-start justify-between gap-4 border-b border-line bg-[var(--ceda-surface-warm)] p-5 sm:p-6">
                <div className="flex flex-col gap-1">
                  <p className="text-sm font-bold uppercase tracking-wider text-brand-text">{eyebrow}</p>
                  <RadixDialog.Title className="text-h3 font-semibold">{title}</RadixDialog.Title>
                </div>
                <RadixDialog.Close asChild>
                  <button
                    type="button"
                    aria-label="Close"
                    className="inline-flex min-h-touch min-w-touch items-center justify-center rounded-full border border-line bg-surface-card transition-colors hover:bg-surface-sunken"
                  >
                    <X aria-hidden className="h-5 w-5" />
                  </button>
                </RadixDialog.Close>
              </div>
              <RadixDialog.Description className="flex items-center gap-2 border-b border-line bg-brand-subtle px-5 py-3 text-sm text-ink sm:px-6">
                <CalendarClock aria-hidden className="h-4 w-4 shrink-0 text-brand-text" />
                {tools.length} planned tools. They are not yet available.
              </RadixDialog.Description>
              <ul aria-label={`${title}: planned tools`} className="flex flex-1 flex-col gap-3 overflow-y-auto bg-surface-page p-4 sm:p-6">
                {tools.map((tool, index) => (
                  <li
                    key={tool.id}
                    className="toolkit-preview__card flex flex-col gap-2 rounded-md border border-line border-l-4 border-l-[var(--ceda-orange)] bg-surface-card p-4 shadow-1"
                    style={{ animationDelay: `${Math.min(index * 24, 192)}ms` }}
                  >
                    <ToolItem tool={tool} />
                  </li>
                ))}
              </ul>
            </RadixDialog.Content>
          </RadixDialog.Portal>
        </RadixDialog.Root>
      </div>

      <div className="p-4 sm:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-semibold">A first look at the toolkit</h3>
          <span className="text-sm text-ink-muted">{cards.length} featured tools</span>
        </div>
        <ul aria-label={`${title}: highlighted tools`} className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {cards.map((tool, index) => (
            <li
              key={tool.id}
              className="toolkit-preview__card flex flex-col gap-2 rounded-md border border-line border-l-4 border-l-[var(--ceda-orange)] bg-surface-card p-4 shadow-1"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <ToolItem tool={tool} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

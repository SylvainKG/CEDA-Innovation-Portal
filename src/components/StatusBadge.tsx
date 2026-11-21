import { AlertCircle, Award, CheckCircle2, PencilLine, Search, Send, XCircle, type LucideIcon } from 'lucide-react'
import type { CaseStatus } from '@/lib/api/types'
import { applicantStatus, staffStatus, type StatusContext, type StatusTone } from '@/lib/status'
import { cn } from '@/lib/cn'

/**
 * F4 status tones (decided 18 Nov, Sandra; `design-tokens.md`). Every badge is a pill with icon + text, never
 * colour alone. Label text is the primary ink (#333333) in every tone; only Awarded uses #1F1F1F on solid gold.
 */
const TONE: Record<StatusTone, { cls: string; icon: string; Icon: LucideIcon }> = {
  draft: { cls: 'bg-status-draft-bg text-ink', icon: 'text-status-draft-fg', Icon: PencilLine },
  submitted: { cls: 'bg-status-submitted-bg text-ink', icon: 'text-status-submitted-fg', Icon: Send },
  review: { cls: 'border border-status-review-border bg-status-review-bg text-ink', icon: 'text-status-review-fg', Icon: Search },
  action: { cls: 'bg-status-action-bg text-ink', icon: 'text-status-action-fg', Icon: AlertCircle },
  approved: { cls: 'bg-status-approved-bg text-ink', icon: 'text-status-approved-fg', Icon: CheckCircle2 },
  closed: { cls: 'border border-status-closed-border bg-status-closed-bg text-ink', icon: 'text-status-closed-fg', Icon: XCircle },
  awarded: { cls: 'bg-status-awarded-bg text-status-awarded-fg', icon: 'text-status-awarded-fg', Icon: Award },
}

/** A pill in one of the F4 tones. Used by StatusBadge and by the challenge timing pills (T01, T03). */
export function TonePill({ tone, label, className }: { tone: StatusTone; label: string; className?: string }) {
  const t = TONE[tone]
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold', t.cls, className)} data-tone={tone}>
      <t.Icon aria-hidden className={cn('h-4 w-4 shrink-0', t.icon)} />
      {label}
    </span>
  )
}

export interface StatusBadgeProps {
  status: CaseStatus
  /** Applicants and staff see different wording (spec §6). */
  audience: 'applicant' | 'staff'
  context?: Parameters<typeof applicantStatus>[1]
  className?: string
}

/** Case status as a pill (spec §3.1, §6, §9). */
export function StatusBadge({ status, audience, context, className }: StatusBadgeProps) {
  const p = audience === 'applicant' ? applicantStatus(status, context) : staffStatus(status, context)
  return <TonePill tone={p.tone} label={p.label} className={className} />
}

export type { StatusContext }

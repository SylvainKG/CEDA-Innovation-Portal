import { AlertCircle, Award, CheckCircle2, Pencil, Search, Send, XCircle, type LucideIcon } from 'lucide-react'
import type { CaseStatus } from '@/lib/api/types'
import { applicantStatus, staffStatus, type StatusContext, type StatusTone } from '@/lib/status'
import { cn } from '@/lib/cn'

const TONE: Record<StatusTone, { bg: string; icon: string; Icon: LucideIcon }> = {
  draft: { bg: 'bg-status-draft-bg', icon: 'text-status-draft-fg', Icon: Pencil },
  submitted: { bg: 'bg-status-submitted-bg', icon: 'text-status-submitted-fg', Icon: Send },
  review: { bg: 'bg-status-review-bg', icon: 'text-status-review-fg', Icon: Search },
  action: { bg: 'bg-status-action-bg', icon: 'text-status-action-fg', Icon: AlertCircle },
  approved: { bg: 'bg-status-approved-bg', icon: 'text-status-approved-fg', Icon: CheckCircle2 },
  closed: { bg: 'bg-status-closed-bg', icon: 'text-status-closed-fg', Icon: XCircle },
  awarded: { bg: 'bg-status-awarded-bg', icon: 'text-status-awarded-fg', Icon: Award },
}

export interface StatusBadgeProps {
  status: CaseStatus
  /** Applicants and staff see different wording (spec §6). */
  audience: 'applicant' | 'staff'
  context?: Parameters<typeof applicantStatus>[1]
  className?: string
}

/**
 * Status shown as icon + text, never colour alone (spec §3.1, §9).
 * Badge text always uses the primary ink colour so it passes contrast in every tone.
 */
export function StatusBadge({ status, audience, context, className }: StatusBadgeProps) {
  const p = audience === 'applicant' ? applicantStatus(status, context) : staffStatus(status, context)
  const tone = TONE[p.tone]
  return (
    <span
      className={cn('inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold text-ink', tone.bg, className)}
      data-tone={p.tone}
    >
      <tone.Icon aria-hidden className={cn('h-4 w-4 shrink-0', tone.icon)} />
      {p.label}
    </span>
  )
}

export type { StatusContext }

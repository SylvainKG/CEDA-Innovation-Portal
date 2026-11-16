import { useState, type ReactNode } from 'react'
import { AlertCircle, AlertTriangle, CheckCircle2, FlaskConical, Info, X, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/cn'

export type BannerKind = 'info' | 'action' | 'warning' | 'error' | 'success' | 'demo'

const KIND: Record<BannerKind, { cls: string; icon: LucideIcon; iconCls: string }> = {
  info: { cls: 'bg-status-review-bg', icon: Info, iconCls: 'text-status-review-fg' },
  action: { cls: 'bg-status-action-bg', icon: AlertCircle, iconCls: 'text-status-action-fg' },
  warning: { cls: 'bg-warning-subtle', icon: AlertTriangle, iconCls: 'text-warning' },
  error: { cls: 'bg-error-subtle', icon: AlertCircle, iconCls: 'text-error' },
  success: { cls: 'bg-success-subtle', icon: CheckCircle2, iconCls: 'text-success' },
  demo: { cls: 'bg-demo-subtle', icon: FlaskConical, iconCls: 'text-demo' },
}

export interface BannerProps {
  kind: BannerKind
  title?: string
  children: ReactNode
  /** Optional action, e.g. a "Respond by …" link or button. */
  action?: ReactNode
}

/**
 * One banner style for every message at the top of content (spec §5; replaces Make's six ad-hoc banners).
 * Only informational banners can be dismissed. Errors are announced immediately; others politely.
 */
export function Banner({ kind, title, children, action }: BannerProps) {
  const [dismissed, setDismissed] = useState(false)
  if (dismissed) return null
  const { cls, icon: Icon, iconCls } = KIND[kind]
  return (
    <div
      role={kind === 'error' ? 'alert' : 'status'}
      className={cn('flex flex-col gap-3 rounded-md p-4 text-ink md:flex-row md:items-start md:justify-between', cls)}
    >
      <div className="flex items-start gap-3">
        <Icon aria-hidden className={cn('mt-0.5 h-5 w-5 shrink-0', iconCls)} />
        <div className="flex flex-col gap-1">
          {title ? <p className="font-semibold">{title}</p> : null}
          <div>{children}</div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {action}
        {kind === 'info' ? (
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="inline-flex min-h-touch min-w-touch items-center justify-center rounded-md hover:bg-surface-card"
          >
            <X aria-hidden className="h-5 w-5" />
            <span className="sr-only">Dismiss message</span>
          </button>
        ) : null}
      </div>
    </div>
  )
}

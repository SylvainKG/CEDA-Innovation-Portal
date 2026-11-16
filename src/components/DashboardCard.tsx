import type { LucideIcon } from 'lucide-react'
import { Link } from 'react-router-dom'

export interface DashboardCardProps {
  label: string
  value: string | number
  /** What the number counts, e.g. "Cases submitted in the selected period" (spec §5 KpiTile). */
  definition: string
  icon?: LucideIcon
  /** Optional link to the list behind the number. */
  to?: string
}

/** KPI tile for dashboards (spec §5 KpiTile; Make `MetricCard`). The definition is always visible, not hover-only. */
export function DashboardCard({ label, value, definition, icon: Icon, to }: DashboardCardProps) {
  const body = (
    <>
      <span className="flex items-center gap-2 text-sm font-semibold text-ink-muted">
        {Icon ? <Icon aria-hidden className="h-5 w-5 text-brand-text" /> : null}
        {label}
      </span>
      <span className="text-display font-bold text-ink">{value}</span>
      <span className="text-sm text-ink-muted">{definition}</span>
    </>
  )
  const cls = 'flex flex-col gap-1 rounded-md bg-surface-card p-4 shadow-1'
  return to ? (
    <Link to={to} className={`${cls} text-ink no-underline hover:bg-surface-sunken`}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  )
}

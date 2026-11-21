/**
 * Date and time display. Data is stored in UTC; people see Botswana time (Africa/Gaborone, CAT, UTC+2),
 * written out as "18 Nov 2026, 14:05 CAT" (spec §6 copy rules).
 */
const TIME_ZONE = 'Africa/Gaborone'

const dateTimeFormat = new Intl.DateTimeFormat('en-GB', {
  timeZone: TIME_ZONE,
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

const dateFormat = new Intl.DateTimeFormat('en-GB', {
  timeZone: TIME_ZONE,
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})

function part(parts: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes): string {
  return parts.find((p) => p.type === type)?.value ?? ''
}

export function formatDateTimeCAT(value: Date | string): string {
  const parts = dateTimeFormat.formatToParts(typeof value === 'string' ? new Date(value) : value)
  return `${part(parts, 'day')} ${part(parts, 'month')} ${part(parts, 'year')}, ${part(parts, 'hour')}:${part(parts, 'minute')} CAT`
}

export function formatDateCAT(value: Date | string): string {
  const parts = dateFormat.formatToParts(typeof value === 'string' ? new Date(value) : value)
  return `${part(parts, 'day')} ${part(parts, 'month')} ${part(parts, 'year')}`
}

/** Relative deadline hint: "in 3 days", "tomorrow", "today", "2 days ago". Whole calendar days in CAT. */
export function relativeDays(target: Date | string, now: Date = new Date()): string {
  const day = (d: Date) => {
    const p = dateFormat.formatToParts(d)
    return Date.UTC(Number(part(p, 'year')), monthIndex(part(p, 'month')), Number(part(p, 'day')))
  }
  const diff = Math.round((day(typeof target === 'string' ? new Date(target) : target) - day(now)) / 86_400_000)
  if (diff === 0) return 'today'
  if (diff === 1) return 'tomorrow'
  if (diff === -1) return 'yesterday'
  return diff > 0 ? `in ${diff} days` : `${-diff} days ago`
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
function monthIndex(short: string): number {
  return MONTHS.findIndex((m) => short.startsWith(m))
}

/** File sizes for upload hints and file lists, e.g. "10.0 MB", "240 KB". */
export function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${Math.max(1, Math.round(bytes / 1024))} KB`
}

/** "just now", "5 min ago", "2 h ago", "3 days ago" (the exact time is in the title). */
export function timeAgo(iso: string, now: Date = new Date()): string {
  const s = Math.max(0, (now.getTime() - Date.parse(iso)) / 1000)
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)} min ago`
  if (s < 86_400) return `${Math.floor(s / 3600)} h ago`
  const d = Math.floor(s / 86_400)
  return d === 1 ? 'yesterday' : `${d} days ago`
}

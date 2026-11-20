import type { ReportCaseRow } from '@/lib/api/types'

/**
 * CSV for the report export (RPT-01). RFC 4180 quoting; a cell that a spreadsheet would read as a formula
 * (starting with =, +, -, @, tab or carriage return) is prefixed with an apostrophe so it stays text.
 */
export function csvCell(value: unknown): string {
  let s = value === null || value === undefined ? '' : String(value)
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export const REPORT_COLUMNS: (keyof ReportCaseRow)[] = [
  'reference',
  'challenge_title',
  'public_stage',
  'status',
  'submitted_at',
  'versions',
  'last_update',
  'days_in_current_stage',
  'published_outcome',
  'award_minor',
  'currency',
]

export function reportCsv(rows: ReportCaseRow[]): string {
  return [REPORT_COLUMNS.join(','), ...rows.map((r) => REPORT_COLUMNS.map((k) => csvCell(r[k])).join(','))].join('\r\n') + '\r\n'
}

export function downloadText(filename: string, text: string, type = 'text/csv;charset=utf-8') {
  const url = URL.createObjectURL(new Blob(['﻿', text], { type }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

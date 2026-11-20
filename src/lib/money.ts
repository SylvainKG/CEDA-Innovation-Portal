/**
 * Money in BWP, stored as integer thebe (minor units: BWP 1.00 = 100 thebe), as the database does
 * (`awards.amount_minor`, contract §4.5). Never use floating point for stored amounts.
 */

/** "BWP 250,000.00" from 25000000 thebe. */
export function formatBWP(minor: number): string {
  const sign = minor < 0 ? '-' : ''
  const abs = Math.abs(Math.trunc(minor))
  const pula = Math.floor(abs / 100).toLocaleString('en-GB')
  const thebe = String(abs % 100).padStart(2, '0')
  return `${sign}BWP ${pula}.${thebe}`
}

/**
 * Parse what a person typed ("250000", "250,000.5", "BWP 1 000.25", "P 12.30") into thebe, or `null` if it is
 * not an amount. At most two decimals. Parsed as text, so 0.1 + 0.2 problems never arise.
 */
export function parseBWP(text: string): number | null {
  const cleaned = text.trim().replace(/^(bwp|p)\s*/i, '').replace(/[\s,]/g, '')
  const m = /^(\d+)(?:\.(\d{1,2}))?$/.exec(cleaned)
  if (!m) return null
  const pula = Number(m[1])
  const thebe = Number((m[2] ?? '').padEnd(2, '0'))
  const minor = pula * 100 + thebe
  return Number.isSafeInteger(minor) ? minor : null
}

/** Contract §4.5: BWP 0.01 to BWP 100,000,000. */
export const AWARD_MIN_MINOR = 1
export const AWARD_MAX_MINOR = 10_000_000_000

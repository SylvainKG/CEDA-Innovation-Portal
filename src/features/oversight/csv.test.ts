import { describe, expect, it } from 'vitest'
import { csvCell, reportCsv } from './csv'

describe('report CSV', () => {
  it('quotes commas and quotes, and keeps formula-like text as text', () => {
    expect(csvCell('Water, smart')).toBe('"Water, smart"')
    expect(csvCell('Say "hi"')).toBe('"Say ""hi"""')
    expect(csvCell('=HYPERLINK("x")')).toBe(`"'=HYPERLINK(""x"")"`)
    expect(csvCell('@SUM(A1)')).toBe("'@SUM(A1)")
    expect(csvCell(null)).toBe('')
    expect(csvCell(25_000_000)).toBe('25000000')
  })

  it('writes a header and one line per case', () => {
    const csv = reportCsv([
      {
        reference: 'CEDA-2026-0006',
        challenge_title: 'Water-smart agriculture',
        public_stage: 'award',
        status: 'awarded',
        submitted_at: '2026-10-05T06:45:00Z',
        versions: 1,
        last_update: '2026-10-20T06:45:00Z',
        days_in_current_stage: 31.5,
        published_outcome: 'approved',
        award_minor: 25_000_000,
        currency: 'BWP',
      },
    ])
    expect(csv.split('\r\n')).toEqual([
      'reference,challenge_title,public_stage,status,submitted_at,versions,last_update,days_in_current_stage,published_outcome,award_minor,currency',
      'CEDA-2026-0006,Water-smart agriculture,award,awarded,2026-10-05T06:45:00Z,1,2026-10-20T06:45:00Z,31.5,approved,25000000,BWP',
      '',
    ])
  })
})

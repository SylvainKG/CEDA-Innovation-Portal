import { describe, expect, it } from 'vitest'
import type { FormSchema, VersionSnapshot } from '@/lib/api/types'
import { diffFields, diffFiles } from './compare'

const schema: FormSchema = {
  sections: [
    {
      key: 's',
      title: 'Overview',
      fields: [
        { key: 'title', label: 'Idea title', type: 'text', required: true },
        { key: 'budget', label: 'Budget', type: 'textarea', required: false },
        { key: 'site', label: 'Site', type: 'text', required: false },
      ],
    },
  ],
}
const v = (n: number, data: Record<string, string>, files: VersionSnapshot['files'] = []): VersionSnapshot => ({ version_no: n, submitted_at: '2026-11-20T08:00:00Z', change_note: null, data, files })

describe('INN-01 version diff', () => {
  it('marks each field changed, added, removed or unchanged, in form order (line endings and edge spaces ignored)', () => {
    const d = diffFields(schema, v(1, { title: 'Tanks', site: 'Kanye', extra: 'x' }), v(2, { title: 'Tanks \r\n', budget: 'BWP 40,000', extra: 'y' }))
    expect(d.map((f) => [f.key, f.change])).toEqual([
      ['title', 'unchanged'],
      ['budget', 'added'],
      ['site', 'removed'],
      ['extra', 'changed'],
    ])
  })

  it('matches files by document slot, then name, and spots replacements by fingerprint', () => {
    const a = v(1, {}, [
      { doc_key: 'budget', filename: 'budget.xlsx', size_bytes: 10, sha256: 'a' },
      { doc_key: 'plan', filename: 'plan.pdf', size_bytes: 10, sha256: 'b' },
      { doc_key: null, filename: 'photo.jpg', size_bytes: 10, sha256: 'c' },
    ])
    const b = v(2, {}, [
      { doc_key: 'budget', filename: 'budget-v2.xlsx', size_bytes: 12, sha256: 'd' },
      { doc_key: 'plan', filename: 'plan.pdf', size_bytes: 10, sha256: 'b' },
      { doc_key: null, filename: 'letter.pdf', size_bytes: 5, sha256: 'e' },
    ])
    expect(diffFiles(a, b).map((f) => [f.name, f.change])).toEqual([
      ['budget-v2.xlsx', 'replaced'],
      ['plan.pdf', 'unchanged'],
      ['photo.jpg', 'removed'],
      ['letter.pdf', 'added'],
    ])
  })
})

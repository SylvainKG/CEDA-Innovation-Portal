import type { FormSchema, VersionFile, VersionSnapshot } from '@/lib/api/types'

export type Change = 'changed' | 'added' | 'removed' | 'unchanged'

export interface FieldDiff {
  key: string
  section: string
  label: string
  before: string
  after: string
  change: Change
}

export interface FileDiff {
  name: string
  docKey: string | null
  change: Change | 'replaced'
  before: VersionFile | null
  after: VersionFile | null
}

const norm = (v: string | undefined) => (v ?? '').replace(/\r\n/g, '\n').trim()

/** Field-level diff of two versions, in form order (INN-01). Fields not in the form come last, by key. */
export function diffFields(schema: FormSchema, a: VersionSnapshot, b: VersionSnapshot): FieldDiff[] {
  const out: FieldDiff[] = []
  const seen = new Set<string>()
  const push = (key: string, section: string, label: string) => {
    seen.add(key)
    const before = norm(a.data[key])
    const after = norm(b.data[key])
    const change: Change = before === after ? 'unchanged' : !before ? 'added' : !after ? 'removed' : 'changed'
    out.push({ key, section, label, before, after, change })
  }
  for (const s of schema.sections) for (const f of s.fields) push(f.key, s.title, f.label)
  for (const key of [...new Set([...Object.keys(a.data), ...Object.keys(b.data)])].sort()) if (!seen.has(key)) push(key, 'Other', key)
  return out
}

/**
 * Attachment diff: matched by document slot (doc_key), or by file name for files without one. A file in the same
 * slot with a different fingerprint, or a different name, was replaced.
 */
export function diffFiles(a: VersionSnapshot, b: VersionSnapshot): FileDiff[] {
  const id = (f: VersionFile) => (f.doc_key ? `doc:${f.doc_key}` : `name:${f.filename}`)
  const before = new Map(a.files.map((f) => [id(f), f]))
  const after = new Map(b.files.map((f) => [id(f), f]))
  const keys = [...new Set([...before.keys(), ...after.keys()])]
  return keys.map((k) => {
    const x = before.get(k) ?? null
    const y = after.get(k) ?? null
    const change: FileDiff['change'] = !x ? 'added' : !y ? 'removed' : x.filename !== y.filename || x.sha256 !== y.sha256 ? 'replaced' : 'unchanged'
    return { name: (y ?? x)!.filename, docKey: (y ?? x)!.doc_key, change, before: x, after: y }
  })
}

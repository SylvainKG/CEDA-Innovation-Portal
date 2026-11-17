import type { ChallengeForm, DraftData, FormSchema, RequiredDoc } from '@/lib/api/types'

/**
 * Client-side mirror of the server's form check (migration 002, `private.validate_submission`), used for instant
 * feedback before submit and by the mock adapter. The server is the authority: it runs the same rules again
 * and its answer wins. Messages are the server's own wording so the two never disagree on screen.
 */
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

/** Length in characters, as Postgres `char_length` counts them (not UTF-16 units: an emoji is 1, not 2). */
export function charLength(value: string): number {
  return [...value].length
}

/**
 * Whether a challenge accepts ideas now: published AND inside its dates, exactly as the server's
 * `private.challenge_is_open`. A challenge stays `published` after its deadline, so status alone is not enough.
 */
export function isChallengeOpen(form: Pick<ChallengeForm, 'status' | 'opens_at' | 'closes_at'>, now: Date = new Date()): boolean {
  const t = now.getTime()
  return form.status === 'published' && t >= new Date(form.opens_at).getTime() && t < new Date(form.closes_at).getTime()
}

export function checkForm(
  schema: FormSchema,
  data: DraftData,
  requiredDocs: RequiredDoc[] = [],
  attachedDocKeys: ReadonlySet<string> = new Set(),
): Record<string, string> {
  const errors: Record<string, string> = {}
  for (const section of schema.sections) {
    for (const field of section.fields) {
      const value = (data[field.key] ?? '').trim()
      if (field.required && value === '') errors[field.key] = 'Required'
      else if (field.max_length !== undefined && charLength(value) > field.max_length)
        errors[field.key] = `Use ${field.max_length} characters or fewer`
      else if (value !== '' && field.type === 'select' && !(field.options ?? []).includes(value))
        errors[field.key] = 'Choose one of the listed options'
      else if (value !== '' && field.type === 'email' && !EMAIL.test(value)) errors[field.key] = 'Enter a valid email address'
    }
  }
  for (const doc of requiredDocs) {
    if (doc.required && !attachedDocKeys.has(doc.key)) errors[`doc:${doc.key}`] = 'Attach this document'
  }
  return errors
}

/** Share of required items (fields + documents) that are filled in, for the completeness meter. */
export function completeness(
  schema: FormSchema,
  data: DraftData,
  requiredDocs: RequiredDoc[] = [],
  attachedDocKeys: ReadonlySet<string> = new Set(),
): { done: number; total: number } {
  let done = 0
  let total = 0
  for (const section of schema.sections)
    for (const field of section.fields)
      if (field.required) {
        total += 1
        if ((data[field.key] ?? '').trim() !== '') done += 1
      }
  for (const doc of requiredDocs)
    if (doc.required) {
      total += 1
      if (attachedDocKeys.has(doc.key)) done += 1
    }
  return { done, total }
}

/** Keys the schema defines (save_draft drops any others). */
export function schemaKeys(schema: FormSchema): Set<string> {
  return new Set(schema.sections.flatMap((s) => s.fields.map((f) => f.key)))
}

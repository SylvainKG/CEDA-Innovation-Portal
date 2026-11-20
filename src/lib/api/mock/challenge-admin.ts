import type { ChallengeAdminPort } from '../challenge-admin'
import { fromRpcError, rpcError } from '../errors'
import type { AdminChallenge, AdminChallengeVersion, CommandOutcome, FormSchema, RequiredDoc, RubricVersionOption } from '../types'
import { MOCK_CHALLENGE_FORMS, MOCK_CHALLENGES } from './fixtures'
import { mockSession } from './session'

/**
 * MOCK challenge admin (T12): development and demo preview only. Starts from the seed's two challenges and follows
 * the server's rules (migration 008): admin only; a new challenge is a draft; one unpublished form version at a
 * time; the form needs a required "title" field, unique keys, labels and options for choice fields; publishing
 * needs a published rubric; only an unused draft can be deleted. Changes here don't reach the public pages.
 */
const RUBRICS: RubricVersionOption[] = [
  { id: '11000000-0000-4000-8000-000000000001', title: 'Water-smart rubric (DEMO)', version_no: 1, published: true },
  { id: '11000000-0000-4000-8000-0000000000d1', title: 'Draft rubric (DEMO)', version_no: 1, published: false },
]

interface Stored {
  challenge: AdminChallenge
  versions: AdminChallengeVersion[]
  used: boolean
}

function seed(): Stored[] {
  return MOCK_CHALLENGES.map((c) => {
    const form = MOCK_CHALLENGE_FORMS.find((f) => f.challenge_id === c.id)!
    return {
      challenge: { id: c.id, slug: c.slug, title: c.title, summary: c.summary, status: c.status as AdminChallenge['status'], opens_at: c.opens_at, closes_at: c.closes_at, audience: c.audience },
      versions: [
        {
          id: form.challenge_version_id,
          version_no: form.form_version,
          brief_md: `Fictional brief for ${c.title} (DEMO).`,
          form_schema: structuredClone(form.form_schema),
          required_docs: structuredClone(form.required_docs),
          rubric_version_id: RUBRICS[0]!.id,
          published_at: c.opens_at,
        },
      ],
      used: true,
    }
  })
}

const state = { items: seed() }
export const mockChallengeAdminControls = {
  reset() {
    state.items = seed()
  },
}

const refused = (...args: Parameters<typeof rpcError>): CommandOutcome<never> => fromRpcError(rpcError(...args))
const admin = async () => Boolean((await mockSession.getSession())?.roles.includes('admin'))
const NO = () => refused('FORBIDDEN', "You don't have access to this action.")

function dateError(opens: string, closes: string) {
  return !opens || !closes || Date.parse(opens) >= Date.parse(closes) ? refused('VALIDATION', 'The closing date must be after the opening date.', { closes_at: 'Must be after the opening date' }) : null
}

/** The server's `validate_form_schema`, in the same order and wording. */
export function formErrors(schema: FormSchema, docs: RequiredDoc[]): Record<string, string> {
  const e: Record<string, string> = {}
  if (!schema.sections.length) return { form_schema: 'Add at least one section' }
  if (schema.sections.some((s) => !s.title.trim())) return { form_schema: 'Every section needs a title and a list of fields' }
  const keys: string[] = []
  for (const f of schema.sections.flatMap((s) => s.fields)) {
    if (!/^[a-z][a-z0-9_]{1,40}$/.test(f.key)) e.form_schema = 'Field keys use lowercase letters, numbers and underscores'
    else if (keys.includes(f.key)) e[`field:${f.key}`] = 'This key is used twice'
    else if (!f.label.trim()) e[`field:${f.key}`] = 'Give the field a label'
    else if (f.type === 'select' && !f.options?.length) e[`field:${f.key}`] = 'A choice field needs options'
    else if (f.max_length !== undefined && (f.max_length < 1 || f.max_length > 20000)) e[`field:${f.key}`] = 'Maximum length must be 1 to 20,000'
    keys.push(f.key)
  }
  if (!schema.sections.some((s) => s.fields.some((f) => f.key === 'title' && f.required))) e.form_schema = 'Include a required field with the key "title"'
  const dkeys: string[] = []
  for (const d of docs) {
    if (!/^[a-z][a-z0-9_]{1,40}$/.test(d.key) || dkeys.includes(d.key) || !d.label.trim()) e.required_docs = 'Every document needs a unique key and a label'
    dkeys.push(d.key)
  }
  return e
}

export const mockChallengeAdmin: ChallengeAdminPort = {
  async listChallenges() {
    if (!(await admin())) return null
    return state.items.map((i) => ({ ...i.challenge })).sort((a, b) => b.opens_at.localeCompare(a.opens_at))
  },

  async getChallenge(id) {
    if (!(await admin())) return null
    const i = state.items.find((x) => x.challenge.id === id)
    return i ? { challenge: { ...i.challenge }, versions: structuredClone(i.versions).sort((a, b) => b.version_no - a.version_no) } : null
  },

  async listRubricVersions() {
    return RUBRICS.map((r) => ({ ...r }))
  },

  async create({ slug, title, summary, opensAt, closesAt, audience }) {
    if (!(await admin())) return NO()
    if (!/^[a-z0-9][a-z0-9-]{1,80}$/.test(slug) || state.items.some((i) => i.challenge.slug === slug))
      return refused('VALIDATION', 'Use a new address of lowercase letters, numbers and hyphens.', { slug: 'Invalid or already used' })
    const bad = dateError(opensAt, closesAt)
    if (bad) return bad
    if (!title.trim() || [...title.trim()].length > 200) return refused('VALIDATION', 'Give a title (up to 200 characters).', { title: 'Give a title (up to 200 characters)' })
    const id = crypto.randomUUID()
    state.items.push({ challenge: { id, slug, title: title.trim(), summary: summary.slice(0, 1000), status: 'draft', opens_at: opensAt, closes_at: closesAt, audience: audience.slice(0, 300) }, versions: [], used: false })
    return { kind: 'ok', data: { challenge_id: id } }
  },

  async update(id, { title, summary, opensAt, closesAt, audience }) {
    if (!(await admin())) return NO()
    const bad = dateError(opensAt, closesAt)
    if (bad) return bad
    const i = state.items.find((x) => x.challenge.id === id)
    if (!i) return refused('VALIDATION', 'Choose a challenge.')
    if (!title.trim()) return refused('VALIDATION', 'Give a title (up to 200 characters).', { title: 'Give a title (up to 200 characters)' })
    i.challenge = { ...i.challenge, title: title.trim(), summary: summary.slice(0, 1000), opens_at: opensAt, closes_at: closesAt, audience: audience.slice(0, 300) }
    return { kind: 'ok', data: { challenge_id: id } }
  },

  async saveVersion({ challengeId, briefMd, formSchema, requiredDocs, rubricVersionId }) {
    if (!(await admin())) return NO()
    const i = state.items.find((x) => x.challenge.id === challengeId)
    if (!i) return refused('VALIDATION', 'Choose a challenge.')
    if (!RUBRICS.some((r) => r.id === rubricVersionId)) return refused('VALIDATION', 'Choose a rubric version.', { rubric_version_id: 'Unknown' })
    if (briefMd.length > 20000) return refused('VALIDATION', 'The brief is too long.', { brief_md: 'Up to 20,000 characters' })
    const errors = formErrors(formSchema, requiredDocs)
    if (Object.keys(errors).length) return refused('VALIDATION', 'The form needs attention.', errors)
    const latest = [...i.versions].sort((a, b) => b.version_no - a.version_no)[0]
    const body = { brief_md: briefMd, form_schema: structuredClone(formSchema), required_docs: structuredClone(requiredDocs), rubric_version_id: rubricVersionId }
    if (latest && !latest.published_at) {
      Object.assign(latest, body)
      return { kind: 'ok', data: { version_no: latest.version_no } }
    }
    const v = { id: crypto.randomUUID(), version_no: (latest?.version_no ?? 0) + 1, published_at: null, ...body }
    i.versions.push(v)
    return { kind: 'ok', data: { version_no: v.version_no } }
  },

  async publish(id) {
    if (!(await admin())) return NO()
    const i = state.items.find((x) => x.challenge.id === id)
    if (!i) return refused('VALIDATION', 'Choose a challenge.')
    const draft = i.versions.find((v) => !v.published_at)
    if (draft) {
      if (!RUBRICS.find((r) => r.id === draft.rubric_version_id)?.published) return refused('VALIDATION', 'Publish the rubric before the challenge.', { rubric_version_id: 'Rubric not published' })
      draft.published_at = new Date().toISOString()
    } else if (!i.versions.some((v) => v.published_at)) return refused('VALIDATION', 'Add the application form before publishing.')
    i.challenge.status = 'published'
    return { kind: 'ok', data: { form_version: Math.max(...i.versions.filter((v) => v.published_at).map((v) => v.version_no)) } }
  },

  async setStatus(id, status) {
    if (!(await admin())) return NO()
    const i = state.items.find((x) => x.challenge.id === id)
    if (!i || i.challenge.status === 'draft') return refused('INVALID_STATE', 'Only a published challenge can be unpublished or closed.')
    i.challenge.status = status
    return { kind: 'ok', data: { status } }
  },

  async remove(id) {
    if (!(await admin())) return NO()
    const i = state.items.find((x) => x.challenge.id === id)
    if (!i || i.challenge.status !== 'draft' || i.used || i.versions.some((v) => v.published_at))
      return refused('INVALID_STATE', 'Only an unused draft challenge can be deleted. Unpublish or close it instead.')
    state.items = state.items.filter((x) => x !== i)
    return { kind: 'ok', data: { deleted: true } }
  },
}

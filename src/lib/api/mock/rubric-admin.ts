import { fromRpcError, rpcError } from '../errors'
import type { RubricAdminPort } from '../rubric-admin'
import type { AdminRubric, CommandOutcome, RubricVersionOption } from '../types'
import { MOCK_RUBRIC } from './review'
import { mockSession } from './session'

/**
 * MOCK rubric admin (T12): development and demo preview only. Starts from the seed's water-smart rubric v1
 * (published) and a draft rubric, and follows migration 008: admin only; criteria change only on a draft;
 * anchors for 1, 3 and 5; weights above 0 and up to 100; publishing needs weights totalling 100 and locks the
 * version. Changes here don't change how the demo reviewers score.
 */
function seed(): AdminRubric[] {
  return [
    {
      id: '10000000-0000-4000-8000-000000000001',
      key: 'water-smart-2026',
      title: 'Water-smart rubric (DEMO)',
      versions: [{ id: '11000000-0000-4000-8000-000000000001', version_no: 1, published_at: '2026-09-30T22:00:00Z', criteria: structuredClone(MOCK_RUBRIC) }],
    },
    {
      id: '10000000-0000-4000-8000-0000000000d1',
      key: 'draft-rubric',
      title: 'Draft rubric (DEMO)',
      versions: [{ id: '11000000-0000-4000-8000-0000000000d1', version_no: 1, published_at: null, criteria: [] }],
    },
  ]
}

const state = { rubrics: seed() }
export const mockRubricAdminControls = {
  reset() {
    state.rubrics = seed()
  },
}

/** For the challenge editor's rubric picker (same store). */
export function mockRubricVersionOptions(): RubricVersionOption[] {
  return state.rubrics.flatMap((r) => r.versions.map((v) => ({ id: v.id, title: r.title, version_no: v.version_no, published: Boolean(v.published_at) })))
}

const refused = (...args: Parameters<typeof rpcError>): CommandOutcome<never> => fromRpcError(rpcError(...args))
const admin = async () => Boolean((await mockSession.getSession())?.roles.includes('admin'))
const NO = () => refused('FORBIDDEN', "You don't have access to this action.")
const total = (versionId: string) => findVersion(versionId)?.criteria.reduce((s, c) => s + c.weight, 0) ?? 0

function findVersion(id: string) {
  return state.rubrics.flatMap((r) => r.versions).find((v) => v.id === id)
}

function draftOrRefusal(id: string) {
  const v = findVersion(id)
  if (!v) return { refusal: refused('VALIDATION', 'Choose a rubric version.') }
  if (v.published_at) return { refusal: refused('INVALID_STATE', 'This version is published and locked. Create a new draft.') }
  return { v }
}

export const mockRubricAdmin: RubricAdminPort = {
  async listRubrics() {
    if (!(await admin())) return null
    return structuredClone(state.rubrics)
  },

  async getRubric(id) {
    if (!(await admin())) return null
    const r = state.rubrics.find((x) => x.id === id)
    return r ? { ...structuredClone(r), versions: structuredClone(r.versions).sort((a, b) => b.version_no - a.version_no) } : null
  },

  async create({ key, title }) {
    if (!(await admin())) return NO()
    if (!/^[a-z0-9][a-z0-9-]{1,80}$/.test(key) || state.rubrics.some((r) => r.key === key))
      return refused('VALIDATION', 'Use a new key of lowercase letters, numbers and hyphens.', { key: 'Invalid or already used' })
    if (!title.trim()) return refused('VALIDATION', 'Give a title.', { title: 'Give a title.' })
    const id = crypto.randomUUID()
    state.rubrics.push({ id, key, title: title.trim(), versions: [{ id: crypto.randomUUID(), version_no: 1, published_at: null, criteria: [] }] })
    return { kind: 'ok', data: { rubric_id: id } }
  },

  async createDraft(rubricId) {
    if (!(await admin())) return NO()
    const r = state.rubrics.find((x) => x.id === rubricId)
    if (!r) return refused('VALIDATION', 'Choose a rubric.')
    const latest = [...r.versions].sort((a, b) => b.version_no - a.version_no)[0]!
    if (!latest.published_at) return { kind: 'ok', data: { rubric_version_id: latest.id, version_no: latest.version_no, existing: true } }
    const v = { id: crypto.randomUUID(), version_no: latest.version_no + 1, published_at: null, criteria: structuredClone(latest.criteria).map((c) => ({ ...c, id: crypto.randomUUID() })) }
    r.versions.push(v)
    return { kind: 'ok', data: { rubric_version_id: v.id, version_no: v.version_no, existing: false } }
  },

  async saveCriterion({ versionId, key, label, weight, anchors, guidance, position }) {
    if (!(await admin())) return NO()
    const { v, refusal } = draftOrRefusal(versionId)
    if (refusal) return refusal
    const e: Record<string, string> = {}
    if (!/^[a-z][a-z0-9_]{1,40}$/.test(key)) e.key = 'Lowercase letters, numbers and underscores'
    if (!label.trim() || [...label.trim()].length > 120) e.label = 'Give a name (up to 120 characters)'
    if (!(weight > 0 && weight <= 100)) e.weight = 'Between 0 and 100'
    if (!anchors['1']?.trim() || !anchors['3']?.trim() || !anchors['5']?.trim()) e.anchors = 'Describe scores 1, 3 and 5'
    if (Object.keys(e).length) return refused('VALIDATION', 'Some details need attention.', e)
    const existing = v!.criteria.find((c) => c.key === key)
    const next = { key, label: label.trim(), weight, anchors: { ...anchors }, guidance }
    if (existing) Object.assign(existing, next)
    else v!.criteria.splice(Math.min(position, v!.criteria.length), 0, { id: crypto.randomUUID(), ...next })
    return { kind: 'ok', data: { weights_total: total(versionId) } }
  },

  async removeCriterion(versionId, key) {
    if (!(await admin())) return NO()
    const { v, refusal } = draftOrRefusal(versionId)
    if (refusal) return refusal
    v!.criteria = v!.criteria.filter((c) => c.key !== key)
    return { kind: 'ok', data: { weights_total: total(versionId) } }
  },

  async publish(versionId) {
    if (!(await admin())) return NO()
    const { v, refusal } = draftOrRefusal(versionId)
    if (refusal) return refusal
    const t = total(versionId)
    if (t !== 100) return refused('VALIDATION', `Weights must total 100% (now ${t}%).`, { weights: 'Must total 100' })
    v!.published_at = new Date().toISOString()
    return { kind: 'ok', data: { published: true } }
  },
}

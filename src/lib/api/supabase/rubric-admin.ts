import type { SupabaseClient } from '@supabase/supabase-js'
import { ApiError, fromRpcError } from '../errors'
import type { RubricAdminPort } from '../rubric-admin'
import type { AdminRubric, RubricCriterion } from '../types'

interface Row {
  id: string
  key: string
  title: string
  rubric_versions: { id: string; version_no: number; published_at: string | null; rubric_criteria: (RubricCriterion & { position: number })[] }[]
}

const SELECT = 'id, key, title, rubric_versions(id, version_no, published_at, rubric_criteria(id, key, label, weight, guidance, anchors, position))'

function shape(r: Row): AdminRubric {
  return {
    id: r.id,
    key: r.key,
    title: r.title,
    versions: [...(r.rubric_versions ?? [])]
      .sort((a, b) => b.version_no - a.version_no)
      .map((v) => ({
        id: v.id,
        version_no: v.version_no,
        published_at: v.published_at,
        criteria: [...(v.rubric_criteria ?? [])]
          .sort((a, b) => a.position - b.position)
          .map((c) => ({ id: c.id, key: c.key, label: c.label, weight: Number(c.weight), guidance: c.guidance, anchors: c.anchors })),
      })),
  }
}

/** Supabase rubric admin adapter (T12). */
export function createSupabaseRubricAdmin(client: SupabaseClient): RubricAdminPort {
  async function rpc<T>(fn: string, args: Record<string, unknown>) {
    const { data, error } = await client.rpc(fn, args)
    if (error) return fromRpcError(error)
    return { kind: 'ok' as const, data: data as T }
  }
  return {
    async listRubrics() {
      const { data, error } = await client.from('rubrics').select(SELECT).order('title')
      if (error) throw new ApiError('Could not load the rubrics', error)
      return ((data ?? []) as unknown as Row[]).map(shape)
    },
    async getRubric(id) {
      const { data, error } = await client.from('rubrics').select(SELECT).eq('id', id).maybeSingle()
      if (error) throw new ApiError('Could not load the rubric', error)
      return data ? shape(data as unknown as Row) : null
    },
    create: ({ key, title }) => rpc('create_rubric', { p_key: key, p_title: title }),
    createDraft: (rubricId) => rpc('create_rubric_draft', { p_rubric_id: rubricId }),
    saveCriterion: async (i) => {
      const r = await rpc<{ weights_total: number | string }>('save_rubric_criterion', {
        p_rubric_version_id: i.versionId,
        p_key: i.key,
        p_label: i.label,
        p_weight: i.weight,
        p_anchors: i.anchors,
        p_guidance: i.guidance,
        p_position: i.position,
      })
      return r.kind === 'ok' ? { kind: 'ok', data: { weights_total: Number(r.data.weights_total) } } : r
    },
    removeCriterion: async (versionId, key) => {
      const r = await rpc<{ weights_total: number | string }>('remove_rubric_criterion', { p_rubric_version_id: versionId, p_key: key })
      return r.kind === 'ok' ? { kind: 'ok', data: { weights_total: Number(r.data.weights_total) } } : r
    },
    publish: (versionId) => rpc('publish_rubric_version', { p_rubric_version_id: versionId }),
  }
}

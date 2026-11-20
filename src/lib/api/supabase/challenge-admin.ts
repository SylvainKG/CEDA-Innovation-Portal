import type { SupabaseClient } from '@supabase/supabase-js'
import type { ChallengeAdminPort } from '../challenge-admin'
import { ApiError, fromRpcError } from '../errors'
import type { AdminChallenge, AdminChallengeVersion, ChallengeStatus, RubricVersionOption } from '../types'

const COLS = 'id, slug, title, summary, status, opens_at, closes_at, audience'

/** Supabase challenge admin adapter (T12). */
export function createSupabaseChallengeAdmin(client: SupabaseClient): ChallengeAdminPort {
  async function rpc<T>(fn: string, args: Record<string, unknown>) {
    const { data, error } = await client.rpc(fn, args)
    if (error) return fromRpcError(error)
    return { kind: 'ok' as const, data: data as T }
  }
  return {
    async listChallenges() {
      const { data, error } = await client.from('challenges').select(COLS).order('opens_at', { ascending: false })
      if (error) throw new ApiError('Could not load the challenges', error)
      return (data ?? []) as AdminChallenge[]
    },

    async getChallenge(id) {
      const c = await client.from('challenges').select(COLS).eq('id', id).maybeSingle()
      if (c.error) throw new ApiError('Could not load the challenge', c.error)
      if (!c.data) return null
      const v = await client
        .from('challenge_versions')
        .select('id, version_no, brief_md, form_schema, required_docs, rubric_version_id, published_at')
        .eq('challenge_id', id)
        .order('version_no', { ascending: false })
      if (v.error) throw new ApiError('Could not load the form versions', v.error)
      return { challenge: c.data as AdminChallenge, versions: (v.data ?? []) as AdminChallengeVersion[] }
    },

    async listRubricVersions() {
      const { data, error } = await client.from('rubric_versions').select('id, version_no, published_at, rubrics(title)').order('created_at', { ascending: false })
      if (error) throw new ApiError('Could not load the rubrics', error)
      return ((data ?? []) as unknown as { id: string; version_no: number; published_at: string | null; rubrics: { title: string } | null }[]).map(
        (r): RubricVersionOption => ({ id: r.id, version_no: r.version_no, title: r.rubrics?.title ?? 'Rubric', published: Boolean(r.published_at) }),
      )
    },

    create: (i) =>
      rpc('create_challenge', { p_slug: i.slug, p_title: i.title, p_summary: i.summary, p_opens_at: i.opensAt, p_closes_at: i.closesAt, p_audience: i.audience }),
    update: (id, i) =>
      rpc('update_challenge', { p_challenge_id: id, p_title: i.title, p_summary: i.summary, p_opens_at: i.opensAt, p_closes_at: i.closesAt, p_audience: i.audience }),
    saveVersion: (i) =>
      rpc('save_challenge_version', {
        p_challenge_id: i.challengeId,
        p_brief_md: i.briefMd,
        p_form_schema: i.formSchema,
        p_required_docs: i.requiredDocs,
        p_rubric_version_id: i.rubricVersionId,
        p_template_files: [],
      }),
    publish: (id) => rpc('publish_challenge', { p_challenge_id: id }),
    setStatus: (id, status) => rpc<{ status: ChallengeStatus }>('set_challenge_status', { p_challenge_id: id, p_status: status }),
    remove: (id) => rpc('delete_challenge', { p_challenge_id: id }),
  }
}

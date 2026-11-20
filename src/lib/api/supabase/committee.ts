import type { SupabaseClient } from '@supabase/supabase-js'
import type { CommitteePort } from '../committee'
import { ApiError } from '../errors'
import type { CaseStatusRow } from '../types'

const forbidden = (error: { message?: string }) => error.message === 'FORBIDDEN'

/** Supabase committee adapter (D-08). */
export function createSupabaseCommittee(client: SupabaseClient): CommitteePort {
  return {
    async listStatus(challengeId) {
      const { data, error } = await client.rpc('list_case_status', { p_challenge_id: challengeId ?? null })
      if (error) {
        if (forbidden(error)) return null
        throw new ApiError('Could not load the cases', error)
      }
      return (data ?? []) as CaseStatusRow[]
    },
    async stageCounts(challengeId) {
      const { data, error } = await client.rpc('case_stage_counts', { p_challenge_id: challengeId ?? null })
      if (error) {
        if (forbidden(error)) return null
        throw new ApiError('Could not load the stage counts', error)
      }
      return Object.fromEntries(Object.entries((data ?? {}) as Record<string, number | string>).map(([k, v]) => [k, Number(v)]))
    },
  }
}

import type { SupabaseClient } from '@supabase/supabase-js'
import { ApiError } from '../errors'
import type { DraftData, VersionFile, VersionSnapshot } from '../types'
import type { VersionsPort } from '../versions'

/** Supabase versions adapter (INN-01). Two reads through RLS, explicit columns. */
export function createSupabaseVersions(client: SupabaseClient): VersionsPort {
  return {
    async listVersions(proposalId) {
      const versions = await client
        .from('proposal_versions')
        .select('id, version_no, submitted_at, change_note, data')
        .eq('proposal_id', proposalId)
        .order('version_no', { ascending: true })
      if (versions.error) throw new ApiError('Could not load the versions', versions.error)
      const rows = (versions.data ?? []) as { id: string; version_no: number; submitted_at: string; change_note: string | null; data: DraftData }[]
      // RLS returns no rows for a case the reader may not see.
      if (rows.length === 0) return null
      const files = await client
        .from('attachments')
        .select('version_id, doc_key, filename, size_bytes, sha256')
        .eq('proposal_id', proposalId)
        .not('version_id', 'is', null)
      if (files.error) throw new ApiError('Could not load the files', files.error)
      const byVersion = new Map<string, VersionFile[]>()
      for (const f of (files.data ?? []) as (VersionFile & { version_id: string })[])
        byVersion.set(f.version_id, [...(byVersion.get(f.version_id) ?? []), { doc_key: f.doc_key, filename: f.filename, size_bytes: Number(f.size_bytes), sha256: f.sha256 }])
      return rows.map((r): VersionSnapshot => ({ version_no: r.version_no, submitted_at: r.submitted_at, change_note: r.change_note, data: r.data, files: byVersion.get(r.id) ?? [] }))
    },
  }
}

import type { SupabaseClient } from '@supabase/supabase-js'
import type { ContentPort } from '../content'
import { ApiError } from '../errors'
import type { ContentKind, ContentPage } from '../types'

/** Supabase content adapter: published `content_pages` of one kind, explicit columns, in position order. */
export function createSupabaseContent(client: SupabaseClient): ContentPort {
  return {
    async list(kind) {
      const { data, error } = await client
        .from('content_pages')
        .select('slug, kind, title, body_md, is_sample')
        .eq('kind', kind)
        .eq('status', 'published')
        .order('position', { ascending: true })
      if (error) throw new ApiError('Could not load this page', error)
      return (data ?? []).map((row): ContentPage => {
        const r = row as Record<string, unknown>
        return {
          slug: String(r.slug),
          kind: String(r.kind) as ContentKind,
          title: String(r.title),
          body_md: String(r.body_md ?? ''),
          is_sample: Boolean(r.is_sample),
        }
      })
    },
  }
}

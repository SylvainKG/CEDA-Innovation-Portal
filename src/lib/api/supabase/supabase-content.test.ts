import type { SupabaseClient } from '@supabase/supabase-js'
import { describe, expect, it } from 'vitest'
import { createSupabaseContent } from './content'

describe('Supabase content adapter', () => {
  it('reads published rows of one kind, explicit columns, in position order', async () => {
    const calls: unknown[][] = []
    const builder: Record<string, unknown> = {}
    for (const op of ['select', 'eq', 'order'])
      builder[op] = (...args: unknown[]) => {
        calls.push([op, ...args])
        return builder
      }
    builder.then = (resolve: (r: unknown) => unknown) =>
      Promise.resolve({ data: [{ slug: 'faq-a', kind: 'faq', title: 'Q', body_md: 'A', is_sample: true }], error: null }).then(resolve)
    const client = { from: (table: string) => (calls.push(['from', table]), builder) } as unknown as SupabaseClient
    expect(await createSupabaseContent(client).list('faq')).toEqual([{ slug: 'faq-a', kind: 'faq', title: 'Q', body_md: 'A', is_sample: true }])
    expect(calls).toEqual([
      ['from', 'content_pages'],
      ['select', 'slug, kind, title, body_md, is_sample'],
      ['eq', 'kind', 'faq'],
      ['eq', 'status', 'published'],
      ['order', 'position', { ascending: true }],
    ])
  })
})

import type { SupabaseClient } from '@supabase/supabase-js'
import { describe, expect, it } from 'vitest'
import { createSupabaseOversight, periodArgs } from './oversight'

describe('Supabase oversight adapter', () => {
  it('sends the period as CAT days (the "to" day inclusive) and reads FORBIDDEN as not visible', async () => {
    const rpcs: { fn: string; args: unknown }[] = []
    const forbidden = { data: null, error: { message: 'FORBIDDEN', hint: 'No access.', details: null } }
    const answers: Record<string, { data: unknown; error: unknown }> = {
      get_programme_report: forbidden,
      report_case_rows: forbidden,
      query_audit: forbidden,
      mark_notifications_read: { data: { updated: 2 }, error: null },
    }
    const client = { rpc: async (fn: string, args: unknown) => (rpcs.push({ fn, args }), answers[fn]) } as unknown as SupabaseClient
    const port = createSupabaseOversight(client)
    expect(await port.getReport({ from: '2026-11-01', to: '2026-11-20' })).toBeNull()
    expect(await port.reportRows({})).toBeNull()
    expect(await port.queryAudit({ reference: ' ceda-2026-0006 ', beforeId: 40 })).toBeNull()
    expect(await port.markRead(null)).toEqual({ kind: 'ok', data: { updated: 2 } })
    expect(rpcs[0]).toEqual({ fn: 'get_programme_report', args: { p_challenge_id: null, p_from: '2026-10-31T22:00:00.000Z', p_to: '2026-11-20T22:00:00.000Z' } })
    expect(rpcs[2]).toEqual({
      fn: 'query_audit',
      args: { p_reference: 'ceda-2026-0006', p_actor_id: null, p_action: null, p_from: null, p_to: null, p_limit: 100, p_before_id: 40 },
    })
    expect(rpcs[3]).toEqual({ fn: 'mark_notifications_read', args: { p_ids: null } })
  })

  it('throws other errors (a VALIDATION period, a lost reply) instead of showing an empty report', async () => {
    const client = { rpc: async () => ({ data: null, error: { message: 'VALIDATION', hint: 'The period must end after it starts.', details: null } }) } as unknown as SupabaseClient
    await expect(createSupabaseOversight(client).getReport({})).rejects.toThrow('Could not load the report')
    expect(periodArgs({ challengeId: 'c1' })).toEqual({ p_challenge_id: 'c1', p_from: null, p_to: null })
  })
})

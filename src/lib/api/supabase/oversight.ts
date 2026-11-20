import type { SupabaseClient } from '@supabase/supabase-js'
import { ApiError, fromRpcError } from '../errors'
import type { OversightPort } from '../oversight'
import type { AppNotification, AuditRow, ProgrammeReport, ReportCaseRow, ReportFilters } from '../types'

/** A CAT calendar day (YYYY-MM-DD) as the instant it starts; "to" is inclusive, so the server gets the next midnight. */
export function periodArgs(f: ReportFilters) {
  const start = (day: string) => new Date(`${day}T00:00:00+02:00`).toISOString()
  const next = (day: string) => new Date(Date.parse(`${day}T00:00:00+02:00`) + 86_400_000).toISOString()
  return { p_challenge_id: f.challengeId ?? null, p_from: f.from ? start(f.from) : null, p_to: f.to ? next(f.to) : null }
}

/** A read the person may not make shows as "not visible"; any other error (including VALIDATION) is thrown. */
const forbidden = (error: { message?: string }) => error.message === 'FORBIDDEN'

/** Supabase oversight adapter (Slice 6a): notifications, programme report and CSV rows, audit log. */
export function createSupabaseOversight(client: SupabaseClient): OversightPort {
  return {
    async listNotifications() {
      // RLS returns the reader's own rows only.
      const { data, error } = await client
        .from('notifications')
        .select('id, proposal_id, type, title, body, created_at, read_at')
        .order('created_at', { ascending: false })
        .limit(200)
      if (error) throw new ApiError('Could not load your notifications', error)
      return (data ?? []) as AppNotification[]
    },

    async markRead(ids) {
      const { data, error } = await client.rpc('mark_notifications_read', { p_ids: ids })
      if (error) return fromRpcError(error)
      return { kind: 'ok', data: data as { updated: number } }
    },

    async getReport(filters) {
      const { data, error } = await client.rpc('get_programme_report', periodArgs(filters))
      if (error) {
        if (forbidden(error)) return null
        throw new ApiError('Could not load the report', error)
      }
      return data as ProgrammeReport
    },

    async reportRows(filters) {
      const { data, error } = await client.rpc('report_case_rows', periodArgs(filters))
      if (error) {
        if (forbidden(error)) return null
        throw new ApiError('Could not export the cases', error)
      }
      return ((data ?? []) as ReportCaseRow[]).map((r) => ({ ...r, days_in_current_stage: Number(r.days_in_current_stage), award_minor: r.award_minor === null ? null : Number(r.award_minor) }))
    },

    async queryAudit(q) {
      const { data, error } = await client.rpc('query_audit', {
        p_reference: q.reference?.trim() || null,
        p_actor_id: null,
        p_action: q.action?.trim() || null,
        p_from: q.from ?? null,
        p_to: q.to ?? null,
        p_limit: q.limit ?? 100,
        p_before_id: q.beforeId ?? null,
      })
      if (error) {
        if (forbidden(error)) return null
        throw new ApiError('Could not load the audit log', error)
      }
      return ((data ?? []) as AuditRow[]).map((r) => ({ ...r, id: Number(r.id) }))
    },

    async alertPreference() {
      const { data: auth } = await client.auth.getUser()
      if (!auth.user) return null
      const { data, error } = await client.from('profiles').select('alerts_opt_in').eq('id', auth.user.id).maybeSingle()
      if (error) throw new ApiError('Could not load your alert setting', error)
      return data ? Boolean((data as { alerts_opt_in: boolean }).alerts_opt_in) : null
    },

    async setAlertPreference(optIn) {
      const { data, error } = await client.rpc('set_alert_preference', { p_opt_in: optIn })
      if (error) return fromRpcError(error)
      return { kind: 'ok', data: data as { alerts_opt_in: boolean } }
    },
  }
}

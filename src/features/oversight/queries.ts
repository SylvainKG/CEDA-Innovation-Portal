import { useCallback, useState } from 'react'
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { AuditQuery, ReportFilters } from '@/lib/api/types'

/** Notifications, reports and the audit log (Slice 6a). */
export const oversightKeys = {
  notifications: ['oversight', 'notifications'] as const,
  report: (f: ReportFilters) => ['oversight', 'report', f] as const,
  audit: (q: AuditQuery) => ['oversight', 'audit', q] as const,
}

export function useNotifications(enabled = true) {
  return useQuery({ queryKey: oversightKeys.notifications, queryFn: () => api.oversight.listNotifications(), enabled, refetchInterval: 60_000 })
}

/**
 * Mark notifications read. Marking twice changes nothing, so the action carries no request key: after a refusal
 * or a lost reply the list is re-read and shows what is actually read (never a claimed success).
 */
export function useMarkRead() {
  const qc = useQueryClient()
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const run = useCallback(
    async (ids: string[] | null) => {
      setBusy(true)
      setError(null)
      try {
        const r = await api.oversight.markRead(ids)
        if (r.kind !== 'ok') setError(r.kind === 'refused' ? (r.message ?? 'Not marked as read.') : 'Not confirmed. The list shows what is saved.')
      } catch {
        setError('Not confirmed. The list shows what is saved.')
      } finally {
        await qc.invalidateQueries({ queryKey: oversightKeys.notifications })
        setBusy(false)
      }
    },
    [qc],
  )
  return { run, busy, error }
}

export function useReport(filters: ReportFilters) {
  return useQuery({ queryKey: oversightKeys.report(filters), queryFn: () => api.oversight.getReport(filters) })
}

export const AUDIT_PAGE = 50

/** The audit log, newest first, 50 at a time; "Load older" passes the last id seen (keyset paging). */
export function useAuditLog(q: AuditQuery) {
  return useInfiniteQuery({
    queryKey: oversightKeys.audit(q),
    initialPageParam: undefined as number | undefined,
    queryFn: ({ pageParam }) => api.oversight.queryAudit({ ...q, limit: AUDIT_PAGE, beforeId: pageParam }),
    getNextPageParam: (last) => (last && last.length === AUDIT_PAGE ? last.at(-1)!.id : undefined),
  })
}

import type { AppNotification, AuditQuery, AuditRow, CommandOutcome, ProgrammeReport, ReportCaseRow, ReportFilters } from './types'

/**
 * Oversight port, Slice 6a: notifications (NTF-01), programme report and CSV rows (RPT-01), audit log (SEC-03).
 *
 * | Method            | Contract                                                                   |
 * |-------------------|----------------------------------------------------------------------------|
 * | listNotifications | read own `notifications` (RLS), newest first                               |
 * | markRead          | RPC `mark_notifications_read(p_ids)`; `null` marks all; others' ids ignored |
 * | getReport         | RPC `get_programme_report` (report.read: adjudicator, admin)               |
 * | reportRows        | RPC `report_case_rows`, same filters, so CSV and report reconcile           |
 * | queryAudit        | RPC `query_audit` (audit.read: admin, auditor); keyset paging by id         |
 * | alertPreference   | read own `profiles.alerts_opt_in` (RLS: own row)                           |
 * | setAlertPreference| RPC `set_alert_preference(p_opt_in)` (NTF-02; own row only; audited)       |
 *
 * Reads that the person may not make return `null` (FORBIDDEN reads as not visible).
 */
export interface OversightPort {
  listNotifications(): Promise<AppNotification[]>
  markRead(ids: string[] | null): Promise<CommandOutcome<{ updated: number }>>
  getReport(filters: ReportFilters): Promise<ProgrammeReport | null>
  reportRows(filters: ReportFilters): Promise<ReportCaseRow[] | null>
  queryAudit(query: AuditQuery): Promise<AuditRow[] | null>
  /** `null` when signed out. */
  alertPreference(): Promise<boolean | null>
  setAlertPreference(optIn: boolean): Promise<CommandOutcome<{ alerts_opt_in: boolean }>>
}

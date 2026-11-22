import { describe, expect, it } from 'vitest'
import { resolveApiMode } from './api'
import { formatDateTimeCAT, relativeDays } from './format'
import { applicantStatus, staffStatus } from './status'
import { homeFor, navFor } from '@/navigation/nav-config'
import { safeNextPath } from './safe-redirect'

describe('status wording (spec §6)', () => {
  it('never shows an unpublished decision to the applicant', () => {
    expect(applicantStatus('in_adjudication', { decisionDrafted: true }).label).toBe('Under review')
    expect(staffStatus('in_adjudication', { decisionDrafted: true }).label).toBe('Decision drafted (unpublished)')
  })

  it('words Action required by feedback kind', () => {
    expect(applicantStatus('action_required', { feedbackKind: 'clarification' }).label).toBe('Action required: answer a question')
    expect(applicantStatus('action_required', { feedbackKind: 'revision' }).label).toBe('Action required: revise your idea')
    expect(staffStatus('action_required', { feedbackKind: 'revision' }).label).toBe('Waiting on applicant (revision)')
    // Without the request's kind (staff lists), the badge doesn't guess (handoff-notes #39).
    expect(staffStatus('action_required').label).toBe('Waiting on applicant')
  })

  it('maps statuses to the five public stages', () => {
    expect(applicantStatus('submitted').stage).toBe('submission')
    expect(applicantStatus('in_evaluation').stage).toBe('review')
    expect(applicantStatus('action_required').stage).toBe('feedback')
    expect(applicantStatus('not_approved').stage).toBe('approval')
    expect(applicantStatus('awarded').stage).toBe('award')
  })

  it('shows staff progress and closure reasons', () => {
    expect(staffStatus('submitted').label).toBe('Awaiting screening')
    expect(staffStatus('in_evaluation', { scores: { scored: 1, required: 2 } }).label).toBe('In evaluation (1/2 scored)')
    expect(staffStatus('closed', { closedReason: 'not eligible' }).label).toBe('Closed: not eligible')
  })
})

describe('dates in Botswana time (spec §6)', () => {
  it('formats UTC as CAT (UTC+2)', () => {
    expect(formatDateTimeCAT('2026-11-18T12:05:00Z')).toBe('18 Nov 2026, 14:05 CAT')
  })

  it('crosses midnight correctly', () => {
    expect(formatDateTimeCAT('2026-11-20T22:30:00Z')).toBe('21 Nov 2026, 00:30 CAT')
  })

  it('gives relative deadline hints in calendar days', () => {
    const now = new Date('2026-11-16T08:00:00Z')
    expect(relativeDays('2026-11-16T14:00:00Z', now)).toBe('today')
    expect(relativeDays('2026-11-17T08:00:00Z', now)).toBe('tomorrow')
    expect(relativeDays('2026-11-21T14:00:00Z', now)).toBe('in 5 days')
  })
})

describe('navigation by role (navigation-map.md)', () => {
  const labels = (roles: Parameters<typeof navFor>[0]) => navFor(roles).map((i) => i.label)

  it('shows the screening officer the queue but not the audit log or settings', () => {
    expect(labels(['screening_officer'])).toEqual(['Home', 'Screening queue'])
  })

  it('gives reviewers My reviews only', () => {
    expect(labels(['reviewer'])).toEqual(['Home', 'My reviews'])
  })

  it('lands auditors on the audit log, since they have no Home', () => {
    expect(homeFor(['auditor'])).toBe('/audit')
    expect(homeFor(['applicant'])).toBe('/ideas')
    expect(homeFor(['admin'])).toBe('/staff')
  })

  it('shows chat statistics (Reports) to the support lead but not to a consultant', () => {
    expect(labels(['support_consultant'])).not.toContain('Reports')
    expect(labels(['support_consultant', 'support_lead'])).toContain('Reports')
  })
})

describe('safe post-sign-in redirect (no open redirect)', () => {
  it('keeps in-app paths', () => {
    expect(safeNextPath('/ideas/abc?tab=feedback')).toBe('/ideas/abc?tab=feedback')
    expect(safeNextPath('/staff/queue/screening')).toBe('/staff/queue/screening')
  })

  it.each(['https://evil.example', '//evil.example', '/\\evil.example', '\\\\evil.example', 'javascript:alert(1)', '/ideas\n', '', null])(
    'refuses %j',
    (value) => {
      expect(safeNextPath(value)).toBeNull()
    },
  )
})

describe('API mode (composition root)', () => {
  it('defaults to mock in development only', () => {
    expect(resolveApiMode(undefined, true)).toBe('mock')
  })

  it('refuses an unset mode in a production build, so the mock session is never published by accident', () => {
    expect(() => resolveApiMode(undefined, false)).toThrow(/VITE_API_MODE is not set/)
    expect(() => resolveApiMode('  ', false)).toThrow(/VITE_API_MODE is not set/)
  })

  it('accepts an explicit mock mode in a production build (staging demo)', () => {
    expect(resolveApiMode('mock', false)).toBe('mock')
  })

  it('accepts the Supabase mode and fails fast for unknown values', () => {
    expect(resolveApiMode('supabase', false)).toBe('supabase')
    expect(() => resolveApiMode('prod', false)).toThrow(/Unknown VITE_API_MODE/)
  })
})

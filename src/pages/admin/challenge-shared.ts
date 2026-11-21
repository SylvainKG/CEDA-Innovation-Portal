import type { AdminChallenge } from '@/lib/api/types'

export const challengeKeys = { list: ['admin', 'challenges'] as const, one: (id: string) => ['admin', 'challenge', id] as const }
export const STATUS_WORD: Record<AdminChallenge['status'], string> = { draft: 'Draft', published: 'Published', unpublished: 'Unpublished', closed: 'Closed' }

/** A CAT wall-clock value ("2026-12-01T09:00") as an instant, and back. */
export const fromCat = (v: string) => (v ? new Date(`${v}:00+02:00`).toISOString() : '')
export const toCat = (iso: string) => new Date(Date.parse(iso) + 2 * 3_600_000).toISOString().slice(0, 16)

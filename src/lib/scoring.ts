import type { RubricCriterion, ScoreItem } from '@/lib/api/types'

/**
 * Round to two decimals like PostgreSQL's numeric `round(x, 2)` (half away from zero). Plain
 * `Math.round(x * 100) / 100` gives 4.02 for 4.025 because 4.025 * 100 is 402.4999… in floating point.
 */
export function round2(x: number): number {
  return Math.round((x + Math.sign(x) * Number.EPSILON * Math.max(1, Math.abs(x))) * 100) / 100
}

/** Minimum reason length per criterion on submit (D-20). */
export const MIN_REASON = 20

/**
 * Weighted score (contract §4.3): Σ(score × weight) ÷ Σ weights, on the 1–5 scale, two decimals. `null` until
 * every criterion has a score, like the server.
 */
export function weightedScore(items: Pick<ScoreItem, 'criterion_id' | 'score'>[], criteria: RubricCriterion[]): number | null {
  if (criteria.length === 0 || criteria.some((c) => !items.some((i) => i.criterion_id === c.id && i.score >= 1))) return null
  const total = criteria.reduce((s, c) => s + c.weight, 0)
  const sum = criteria.reduce((s, c) => s + (items.find((i) => i.criterion_id === c.id)?.score ?? 0) * c.weight, 0)
  return round2(sum / total)
}

/** The anchor text that applies to a score: its own, if the rubric gives one. */
export function anchorFor(criterion: RubricCriterion, score: number | null): string | null {
  if (score === null) return null
  return criterion.anchors[String(score)] ?? null
}

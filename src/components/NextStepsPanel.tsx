import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { PlainMarkdown } from './PlainMarkdown'
import { SampleLabel } from './DemoBadge'

/**
 * NextStepsPanel (INN-05; spec component list): 3–4 pathway cards from the published referral content, labelled
 * "Sample referral information" and "Listed for information; not an endorsement". Hidden while loading or if
 * there is nothing to show; it is guidance, never a blocker.
 */
export function NextStepsPanel() {
  const referrals = useQuery({ queryKey: ['content', 'referral'], queryFn: () => api.content.list('referral'), staleTime: 5 * 60_000 })
  const cards = (referrals.data ?? []).slice(0, 4)
  if (cards.length === 0) return null
  return (
    <section aria-labelledby="next-steps-h" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <h2 id="next-steps-h" className="text-h2 font-semibold">
          Next steps
        </h2>
        <SampleLabel text="Sample referral information" />
      </div>
      <p className="text-ink-muted">Other programmes that may help you take your idea further. Listed for information; not an endorsement.</p>
      <ul className="grid gap-3 md:grid-cols-2">
        {cards.map((c) => (
          <li key={c.slug} className="flex flex-col gap-2 rounded-md bg-surface-card p-4 shadow-1">
            <h3 className="text-h3 font-semibold">{c.title}</h3>
            <PlainMarkdown source={c.body_md} />
          </li>
        ))}
      </ul>
    </section>
  )
}

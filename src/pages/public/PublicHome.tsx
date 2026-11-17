import { Link } from 'react-router-dom'
import { PUBLIC_STAGES } from '@/lib/status'
import { ChallengeList } from './ChallengeList'

/** What happens at each public stage (spec T01 "How it works": 5 steps matching the timeline). */
const STEP_TEXT: Record<string, string> = {
  submission: 'Submit your idea to an open challenge before it closes. You get a reference straight away.',
  review: 'CEDA checks that it fits the challenge, then two assessors score it against published criteria.',
  feedback: 'If CEDA needs more, you get a question or a revision request with a deadline.',
  approval: 'CEDA publishes its decision on your idea’s page.',
  award: 'Approved ideas can receive CEDA support.',
}

/**
 * T01 — Public home (spec §7 T01). Built from the written spec (BCR-003, D-45 proposed).
 * Every control here is at least 44 × 44 px (checked by the e2e smoke suite).
 */
export function PublicHome() {
  return (
    <div className="flex flex-col gap-10">
      <section aria-labelledby="intro" className="flex flex-col gap-4 rounded-md bg-surface-card p-6 shadow-1 md:p-8">
        <h1 id="intro" className="text-display font-bold">
          Submit your innovation to CEDA
        </h1>
        <p className="max-w-form text-base">
          Answer an open challenge with your idea, follow its progress, and get CEDA’s feedback in one place.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link to="/auth/register" className="inline-flex min-h-touch items-center rounded-md bg-brand px-4 font-semibold text-brand-on no-underline">
            Register
          </Link>
          <Link to="/auth/sign-in" className="inline-flex min-h-touch items-center rounded-md border border-line px-4 font-semibold text-ink no-underline">
            Sign in
          </Link>
        </div>
      </section>

      <section aria-labelledby="challenges-heading" className="flex flex-col gap-4">
        <h2 id="challenges-heading" className="text-h2 font-semibold">
          Challenges
        </h2>
        <ChallengeList />
      </section>

      <section aria-labelledby="how-heading" className="flex flex-col gap-4">
        <h2 id="how-heading" className="text-h2 font-semibold">
          How it works
        </h2>
        <ol className="grid grid-cols-1 gap-4 md:grid-cols-5">
          {PUBLIC_STAGES.map((s, i) => (
            <li key={s.id} className="flex flex-col gap-2 rounded-md bg-surface-card p-4 shadow-1">
              <span aria-hidden className="flex h-8 w-8 items-center justify-center rounded-full bg-brand font-bold text-brand-on">
                {i + 1}
              </span>
              <h3 className="text-h3 font-semibold">{s.label}</h3>
              <p className="text-sm">{STEP_TEXT[s.id]}</p>
            </li>
          ))}
        </ol>
      </section>
    </div>
  )
}

/** `/challenges`: the same list with its own page heading. */
export function ChallengesPage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-h1 font-bold">Challenges</h1>
      <ChallengeList />
    </div>
  )
}

import { AlertTriangle, ArrowRight, BookOpen, CircleHelp, MessagesSquare, Trophy } from 'lucide-react'
import { Link } from 'react-router-dom'
import { EmptyState, ErrorState, IdeaCard, LoadingState, ButtonLink } from '@/components'
import { ToolkitPreview } from '@/components/ToolkitPreview'
import { HeaderFigure, PageHeader } from '@/layouts/PageHeader'
import { formatDateTimeCAT, relativeDays } from '@/lib/format'
import { isChallengeOpen } from '@/lib/form-check'
import { useSession } from '@/lib/session'
import { primaryActionFor, sortIdeas, toIdeaCard } from '@/features/ideas/idea-view'
import { useChallenges, useMyIdeas } from '@/features/submission/queries'
import { INNOVATOR_HIGHLIGHTED, INNOVATOR_TOOLS } from '@/features/toolkit-preview/catalogue'
import { toolkitPreviewEnabled } from '@/features/toolkit-preview/flag'
import type { ChallengeSummary, MyIdea } from '@/lib/api/types'

const IN_PROGRESS: readonly MyIdea['status'][] = ['submitted', 'in_evaluation', 'in_adjudication']

/**
 * T06 — Applicant "My ideas" (spec §7 T06), laid out to Sandra's 21 Nov frame: "MY IDEAS" above
 * "Welcome, <name>", a red banner when an idea needs a response (with the earliest deadline and its action), and
 * one card per idea, ideas needing action first. Post-freeze polish (ABM, 22 Nov): the header is the portal's sunrise
 * card with the person's figures; beside the ideas (from 1024 px), the open challenges and where to get help.
 */
export function MyIdeasPage() {
  const { data: user } = useSession()
  const ideas = useMyIdeas()
  const challenges = useChallenges()
  const open = (challenges.data ?? []).filter((c) => isChallengeOpen(c))

  const startLink =
    open.length === 1 && open[0] ? `/ideas/new?challenge=${open[0].id}` : '/challenges'

  // The idea whose response is due soonest (an expired request needs no banner: its card says so).
  const waiting = (ideas.data ?? [])
    .filter((i) => i.status === 'action_required' && i.open_feedback && i.open_feedback.status !== 'expired')
    .sort((a, b) => a.open_feedback!.due_at.localeCompare(b.open_feedback!.due_at))
  const urgent = waiting[0]
  const urgentAction = urgent ? primaryActionFor(urgent) : undefined

  const all = ideas.data ?? []
  const drafts = all.filter((i) => i.status === 'draft').length
  const inProgress = all.filter((i) => IN_PROGRESS.includes(i.status)).length
  const needResponse = all.filter((i) => i.status === 'action_required').length

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="My ideas"
        title={`Welcome, ${user?.displayName ?? 'applicant'}`}
        intro="Track your ideas and respond to CEDA when action is needed."
        actions={
          <ButtonLink to={startLink} className="!rounded-full">
            Start a new idea
            <ArrowRight aria-hidden className="h-5 w-5" />
          </ButtonLink>
        }
      >
        {all.length > 0 ? (
          <ul aria-label="Your ideas at a glance" className="flex flex-wrap gap-2">
            <HeaderFigure value={all.length} label={all.length === 1 ? 'idea' : 'ideas'} />
            <HeaderFigure value={inProgress} label="in progress" />
            <HeaderFigure value={drafts} label={drafts === 1 ? 'draft' : 'drafts'} />
            <HeaderFigure value={needResponse} label={needResponse === 1 ? 'needs a response' : 'need a response'} tone="alert" />
          </ul>
        ) : null}
      </PageHeader>

      {ideas.isPending ? (
        <LoadingState what="your ideas" />
      ) : ideas.isError ? (
        <ErrorState message="We couldn't load your ideas." onRetry={() => void ideas.refetch()} />
      ) : ideas.data.length === 0 ? (
        <EmptyState title="You haven't started an idea yet" level="h2">
          {open.length > 0 ? 'These challenges are open now:' : 'No challenges are open right now. Check back soon or read the FAQs.'}
        </EmptyState>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_19rem]">
          <div className="flex min-w-0 flex-col gap-4">
            {urgent ? (
              <section aria-labelledby="needs-response" className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-error bg-error-subtle p-4 shadow-1">
                <div className="flex items-start gap-3">
                  <AlertTriangle aria-hidden className="mt-0.5 h-6 w-6 shrink-0 text-error" />
                  <div>
                    <h2 id="needs-response" className="font-semibold">
                      {waiting.length > 1 ? `${waiting.length} ideas need your response` : 'An idea needs your response'}
                    </h2>
                    <p className="text-sm">
                      Respond by {formatDateTimeCAT(urgent.open_feedback!.due_at)} ({relativeDays(urgent.open_feedback!.due_at)}).
                    </p>
                  </div>
                </div>
                {urgentAction ? (
                  <ButtonLink to={urgentAction.to} variant="secondary">
                    {urgentAction.label}
                    <span className="sr-only">: {urgent.title}</span>
                  </ButtonLink>
                ) : null}
              </section>
            ) : null}
            <ul className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              {sortIdeas(ideas.data).map((idea) => (
                <li key={idea.id}>
                  <IdeaCard idea={toIdeaCard(idea)} />
                </li>
              ))}
            </ul>
          </div>
          <aside className="flex flex-col gap-4">
            <OpenChallengesPanel open={open} />
            <HelpPanel />
          </aside>
        </div>
      )}

      {ideas.data?.length === 0 && open.length > 0 ? (
        <ul className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {open.map((c) => (
            <li key={c.id} className="relative flex flex-col gap-2 overflow-hidden rounded-md border border-line bg-surface-card p-5 shadow-1">
              <span aria-hidden className="absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,var(--ceda-gold),var(--ceda-orange),var(--ceda-maroon))]" />
              <h3 className="text-h3 font-semibold">{c.title}</h3>
              <p>{c.summary}</p>
              <p className="text-sm text-ink-muted">
                Closes {formatDateTimeCAT(c.closes_at)} ({relativeDays(c.closes_at)})
              </p>
              <Link to={`/ideas/new?challenge=${c.id}`} className="inline-flex min-h-touch items-center gap-2 self-start font-semibold">
                Start an idea<span className="sr-only"> for {c.title}</span> <ArrowRight aria-hidden className="h-4 w-4" />
              </Link>
            </li>
          ))}
        </ul>
      ) : null}

      {toolkitPreviewEnabled() ? (
        <ToolkitPreview
          eyebrow="Coming soon"
          title="Business Development Toolkit"
          workflow="Tools to plan, cost and test your business idea, so your next application to CEDA is stronger."
          tools={INNOVATOR_TOOLS}
          highlighted={INNOVATOR_HIGHLIGHTED}
        />
      ) : null}
    </div>
  )
}

/** Beside the ideas: the challenges open now, each with how long is left and a way to start. */
function OpenChallengesPanel({ open }: { open: ChallengeSummary[] }) {
  return (
    <section aria-labelledby="open-now-heading" className="flex flex-col gap-3 rounded-md border border-line bg-surface-card p-5 shadow-1">
      <h2 id="open-now-heading" className="flex items-center gap-2 font-semibold">
        <Trophy aria-hidden className="h-5 w-5 text-[var(--ceda-maroon)]" />
        Open challenges
      </h2>
      {open.length === 0 ? (
        <p className="text-sm text-ink-muted">No challenges are open right now. Check back soon.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {open.map((c) => (
            <li key={c.id} className="flex flex-col gap-1 rounded-md bg-[var(--ceda-surface-warm)] p-3">
              <p className="font-semibold leading-snug">{c.title}</p>
              <p className="flex items-center gap-2 text-sm text-ink-muted">
                <span aria-hidden className="live-dot h-2 w-2 rounded-full bg-[var(--ceda-orange)]" />
                Closes {relativeDays(c.closes_at)}
              </p>
              <Link to={`/challenges/${c.slug}`} className="inline-flex min-h-touch items-center gap-1 self-start text-sm font-semibold">
                Read the brief<span className="sr-only">: {c.title}</span> <ArrowRight aria-hidden className="h-4 w-4" />
              </Link>
            </li>
          ))}
        </ul>
      )}
      <Link to="/challenges" className="inline-flex min-h-touch items-center gap-1 self-start text-sm font-semibold">
        All challenges <ArrowRight aria-hidden className="h-4 w-4" />
      </Link>
    </section>
  )
}

/** Beside the ideas: where an applicant gets help, on CEDA's night brown like the public help bands. */
function HelpPanel() {
  const item = 'flex min-h-touch items-center gap-3 rounded-md px-2 text-white no-underline hover:bg-white/10'
  return (
    <section aria-labelledby="ideas-help-heading" className="flex flex-col gap-2 rounded-md bg-[var(--ceda-night)] p-5 text-white shadow-1">
      <h2 id="ideas-help-heading" className="font-semibold">
        Need help?
      </h2>
      <p className="text-sm text-white/80">Questions about a challenge or your idea? CEDA can help.</p>
      <nav aria-label="Help for applicants" className="flex flex-col">
        <Link to="/support/chat" className={item}>
          <MessagesSquare aria-hidden className="h-5 w-5 text-[var(--ceda-gold)]" /> Message CEDA support
        </Link>
        <Link to="/help/faqs" className={item}>
          <CircleHelp aria-hidden className="h-5 w-5 text-[var(--ceda-gold)]" /> Frequently asked questions
        </Link>
        <Link to="/how-it-works" className={item}>
          <BookOpen aria-hidden className="h-5 w-5 text-[var(--ceda-gold)]" /> How the process works
        </Link>
      </nav>
    </section>
  )
}

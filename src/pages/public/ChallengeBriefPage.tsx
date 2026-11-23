import type { ReactNode } from 'react'
import { ArrowLeft, CalendarClock, FileText, Users } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { challengeCover } from '@/brand/photos'
import { Button, ButtonLink, ErrorState, LoadingState, NotFoundState, PlainMarkdown } from '@/components'
import { api } from '@/lib/api'
import { cn } from '@/lib/cn'
import { formatDateTimeCAT, relativeDays } from '@/lib/format'
import { challengeTiming } from '@/lib/form-check'
import { useSession } from '@/lib/session'
import { useChallengeBrief, useMyIdeas } from '@/features/submission/queries'

/**
 * T03 — Challenge brief (spec §7 T03 "challenge brief" variant; HLP-01). Unpublished or unknown slug → Not found.
 * Closed → the primary action is disabled with the reason. "How your idea is assessed" shows criteria and weights
 * only, never the scoring anchors.
 *
 * Post-freeze design (ABM, 22 Nov), in the style of the home page: the challenge's cover photo as a banner with its
 * status and title; the brief and the criteria as cards, each criterion with a bar for its weight in CEDA's sunrise
 * colours; and a key-facts card (closing date with the time left, who can apply, the action) that stays in view on
 * desktop. On phones the action stays at the bottom of the content.
 */
export function ChallengeBriefPage() {
  const { slug } = useParams()
  const brief = useChallengeBrief(slug)
  const session = useSession()
  const isApplicant = session.data?.roles.includes('applicant') ?? false
  const ideas = useMyIdeas(isApplicant)

  if (brief.isPending) return <LoadingState what="the challenge" />
  if (brief.isError) return <ErrorState level="h1" message="We couldn't load this challenge." onRetry={() => void brief.refetch()} />
  if (!brief.data) return <NotFoundState home="/" />
  const { challenge, brief_md, templates, criteria } = brief.data
  const timing = challengeTiming(challenge)
  const open = timing === 'open' || timing === 'closing_soon'
  const draft = ideas.data?.find((i) => i.status === 'draft' && i.challenge.id === challenge.id)
  // Only templates with a real download URL are listed; with none, the section is hidden (Sandra, #38 item 7).
  const downloads = templates.flatMap((t) => {
    const url = api.submission.templateUrl(t.path)
    return url ? [{ ...t, url }] : []
  })
  const cover = challengeCover(challenge.title)
  const status = open ? (timing === 'closing_soon' ? 'Closing soon' : 'Open') : timing === 'upcoming' ? 'Opening soon' : 'Closed'

  const action = !open ? (
    <Button disabled disabledReason={timing === 'upcoming' ? `Opens ${formatDateTimeCAT(challenge.opens_at)}.` : 'This challenge is closed and not accepting submissions.'}>
      Start an idea
    </Button>
  ) : (
    <ButtonLink to={draft ? `/ideas/${draft.id}/edit` : `/ideas/new?challenge=${challenge.id}`} className="w-full !rounded-full">
      {draft ? 'Continue your draft' : 'Start an idea'}
    </ButtonLink>
  )

  return (
    <div className="flex flex-col gap-8">
      <header className="relative isolate overflow-hidden rounded-[2rem] bg-[var(--ceda-night)] text-white shadow-2">
        <img
          src={cover.src}
          alt=""
          width={cover.width}
          height={cover.height}
          decoding="async"
          className={cn('absolute inset-0 -z-20 h-full w-full object-cover', !open && 'grayscale')}
        />
        <div aria-hidden className="absolute inset-0 -z-10 bg-[linear-gradient(100deg,rgba(43,29,25,0.96)_0%,rgba(43,29,25,0.86)_48%,rgba(43,29,25,0.4)_100%)]" />
        <div className="flex max-w-3xl flex-col items-start gap-4 px-6 py-8 md:px-10 md:py-12">
          <Link to="/challenges" className="inline-flex min-h-touch items-center gap-2 text-sm font-semibold text-white/85 no-underline hover:text-white">
            <ArrowLeft aria-hidden className="h-4 w-4" />
            All challenges
          </Link>
          <p
            className={cn(
              'inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider',
              open ? 'bg-[var(--ceda-gold)] text-ink' : 'bg-white/15 text-white',
            )}
          >
            {open ? <span aria-hidden className="live-dot h-2 w-2 rounded-full bg-[var(--ceda-maroon)]" /> : null}
            {status}
            {open ? <span className="font-semibold normal-case tracking-normal">· closes {relativeDays(challenge.closes_at)}</span> : null}
          </p>
          <h1 className="text-[2rem] font-normal leading-tight md:text-[2.75rem]">{challenge.title}</h1>
          {challenge.summary ? <p className="max-w-2xl text-white/85 md:text-[1.0625rem]">{challenge.summary}</p> : null}
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-8">
        <div className="flex min-w-0 flex-col gap-6">
          <section aria-labelledby="brief-heading" className="flex flex-col gap-3 rounded-[1.5rem] border border-line bg-surface-card p-6 md:p-8">
            <h2 id="brief-heading" className="text-h2 font-semibold">
              The challenge
            </h2>
            <div className="text-ink-muted [&_strong]:text-ink">
              <PlainMarkdown source={brief_md} />
            </div>
          </section>

          <section aria-labelledby="assess-heading" className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <h2 id="assess-heading" className="text-h2 font-semibold">
                How your idea is assessed
              </h2>
              <p className="text-ink-muted">Two assessors score each idea against these criteria. The weights show how much each one counts.</p>
            </div>
            <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {criteria.map((c) => (
                <li key={c.key} className="flex flex-col gap-3 rounded-[1.25rem] border border-line bg-surface-card p-5">
                  <div className="flex items-start justify-between gap-4">
                    <span className="flex flex-col gap-1">
                      <span className="font-semibold">{c.label}</span>
                      <span className="text-sm text-ink-muted">{c.guidance}</span>
                    </span>
                    <span className="shrink-0 text-h2 font-semibold tabular-nums text-[var(--ceda-maroon)]">{c.weight}%</span>
                  </div>
                  {/* The weight as a bar (decorative: the figure above says it). */}
                  <span aria-hidden className="block h-2 overflow-hidden rounded-full bg-surface-sunken">
                    <span
                      className="block h-full rounded-full bg-[linear-gradient(90deg,var(--ceda-gold),var(--ceda-orange))]"
                      style={{ width: `${Math.max(0, Math.min(100, c.weight))}%` }}
                    />
                  </span>
                </li>
              ))}
            </ul>
          </section>

          {downloads.length > 0 ? (
            <section aria-labelledby="downloads-heading" className="flex flex-col gap-3">
              <h2 id="downloads-heading" className="text-h2 font-semibold">
                Downloads
              </h2>
              <ul className="flex flex-col gap-2">
                {downloads.map((t) => (
                  <li key={t.path}>
                    <a
                      href={t.url}
                      download
                      className="flex min-h-touch items-center gap-3 rounded-[1.25rem] border border-line bg-surface-card px-4 py-3 no-underline hover:border-[var(--ceda-amber)]"
                    >
                      <span aria-hidden className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[rgba(253,200,13,0.25)] text-[var(--ceda-maroon)]">
                        <FileText className="h-5 w-5" />
                      </span>
                      <span className="font-semibold text-ink">{t.name}</span>
                      <span className="text-sm text-ink-muted">({t.name.split('.').pop()?.toUpperCase()})</span>
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <p className="text-ink-muted lg:hidden">
            Questions?{' '}
            <Link to="/help/faqs" className="inline-flex min-h-touch items-center font-semibold">
              Read the FAQs
            </Link>
          </p>
          {/* Mobile: sticky to the bottom of the content, so it never covers the footer or another bottom bar. */}
          <div className="sticky bottom-0 z-10 -mx-4 border-t border-line bg-surface-card p-3 lg:hidden">{action}</div>
        </div>

        {/* Key facts and the primary action: they stay in view on desktop (spec T03). */}
        <aside className="hidden lg:block">
          <div className="sticky top-24 flex flex-col gap-5 overflow-hidden rounded-[1.5rem] border border-line bg-surface-card p-6 shadow-1">
            <span aria-hidden className="absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,var(--ceda-gold),var(--ceda-orange),var(--ceda-maroon))]" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-ink-muted">Key facts</h2>
            <dl className="flex flex-col gap-4">
              <Fact icon={CalendarClock} term={open ? 'Closes' : timing === 'upcoming' ? 'Opens' : 'Closed'}>
                {formatDateTimeCAT(timing === 'upcoming' ? challenge.opens_at : challenge.closes_at)}
                {open ? <span className="block text-sm text-ink-muted">{relativeDays(challenge.closes_at)}</span> : null}
                {open ? <TimeLeft opensAt={challenge.opens_at} closesAt={challenge.closes_at} /> : null}
              </Fact>
              <Fact icon={Users} term="Who can apply">
                {challenge.audience}
              </Fact>
            </dl>
            {action}
            <p className="text-sm text-ink-muted">
              Questions?{' '}
              <Link to="/help/faqs" className="font-semibold">
                Read the FAQs
              </Link>
            </p>
          </div>
        </aside>
      </div>
    </div>
  )
}

function Fact({ icon: Icon, term, children }: { icon: typeof Users; term: string; children: ReactNode }) {
  return (
    <div className="flex gap-3">
      <span aria-hidden className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[rgba(253,200,13,0.25)] text-[var(--ceda-maroon)]">
        <Icon className="h-4 w-4" />
      </span>
      <div className="flex min-w-0 flex-col">
        <dt className="text-sm text-ink-muted">{term}</dt>
        <dd className="font-semibold">{children}</dd>
      </div>
    </div>
  )
}

/** How much of the open period has passed (decorative: the date and the days left are said in text). */
function TimeLeft({ opensAt, closesAt }: { opensAt: string; closesAt: string }) {
  const start = new Date(opensAt).getTime()
  const end = new Date(closesAt).getTime()
  const passed = end > start ? Math.min(100, Math.max(0, ((Date.now() - start) / (end - start)) * 100)) : 100
  return (
    <span aria-hidden className="mt-2 block h-1.5 overflow-hidden rounded-full bg-surface-sunken">
      <span className="block h-full rounded-full bg-[linear-gradient(90deg,var(--ceda-gold),var(--ceda-orange))]" style={{ width: `${passed}%` }} />
    </span>
  )
}

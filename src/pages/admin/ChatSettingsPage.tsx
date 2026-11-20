import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Banner, Button, TextField } from '@/components'
import { ErrorState, LoadingState } from '@/components/states/States'
import { chatKeys } from '@/features/chat/queries'
import { api } from '@/lib/api'
import type { ChatStatus, CommandOutcome } from '@/lib/api/types'
import { formatDateCAT } from '@/lib/format'

const DAYS = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
type Msg = { kind: 'ok' | 'error' | 'warning'; text: string } | null

/**
 * T12 chat settings (CHT-02), Provisional UI built from the written spec (BCR-003; design review pending).
 * The demo switch (open / closed / follow the hours), the opening hours per weekday in CAT, and closure days.
 * The server (config.manage) checks and audits every change; after each one the settings are re-read.
 */
export function ChatSettingsPage() {
  const qc = useQueryClient()
  const status = useQuery({ queryKey: chatKeys.status, queryFn: () => api.chat.status() })
  const closures = useQuery({ queryKey: ['chat', 'closures'], queryFn: () => api.chat.closures() })
  const [msg, setMsg] = useState<Msg>(null)
  const [busy, setBusy] = useState(false)
  /** The switch choice being saved: shown at once, then replaced by what the server holds. */
  const [pending, setPending] = useState<'open' | 'closed' | null | undefined>(undefined)

  if (status.isPending || closures.isPending) return <LoadingState what="chat settings" />
  if (status.isError || closures.isError) return <ErrorState level="h1" message="We couldn't load chat settings." onRetry={() => void Promise.all([status.refetch(), closures.refetch()])} />

  async function act(run: () => Promise<CommandOutcome<unknown>>, ok: string) {
    setBusy(true)
    let r: CommandOutcome<unknown>
    try {
      r = await run()
    } catch {
      r = { kind: 'unknown', requestKey: '' }
    }
    await qc.invalidateQueries({ queryKey: chatKeys.all })
    setMsg(r.kind === 'ok' ? { kind: 'ok', text: ok } : r.kind === 'refused' ? { kind: 'error', text: r.message ?? 'The change was refused.' } : { kind: 'warning', text: "We couldn't confirm the change. The settings below show what is saved." })
    setBusy(false)
    return r.kind === 'ok'
  }

  const mode = status.data.mode === 'demo_override_open' ? 'open' : status.data.mode === 'demo_override_closed' ? 'closed' : null
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-h1 font-semibold">Chat settings</h1>
        <p className="text-ink-muted" role="status">
          Chat is {status.data.open ? 'open' : 'closed'} now.
        </p>
      </div>
      <div aria-live="polite">{msg ? <Banner kind={msg.kind === 'ok' ? 'success' : msg.kind}>{msg.text}</Banner> : null}</div>

      <fieldset className="flex flex-col gap-2 rounded-md bg-surface-card p-4 shadow-1">
        <legend className="text-h2 font-semibold">Demo switch</legend>
        <p className="text-sm text-ink-muted">Overrides the opening hours, so chat can be shown during judging. Choose &quot;Follow the opening hours&quot; for normal use.</p>
        {(
          [
            ['open', 'Always open'],
            ['closed', 'Always closed'],
            [null, 'Follow the opening hours'],
          ] as const
        ).map(([m, label]) => (
          <label key={label} className="flex min-h-touch items-center gap-2">
            <input
              type="radio"
              name="chat-mode"
              className="h-5 w-5"
              checked={(pending === undefined ? mode : pending) === m}
              disabled={busy}
              onChange={async () => {
                setPending(m)
                await act(() => api.chat.setOverride(m), `Chat set to: ${label.toLowerCase()}.`)
                setPending(undefined)
              }}
            />
            {label}
          </label>
        ))}
      </fieldset>

      <section aria-labelledby="hours-h" className="flex flex-col gap-2 rounded-md bg-surface-card p-4 shadow-1">
        <h2 id="hours-h" className="text-h2 font-semibold">
          Opening hours (CAT)
        </h2>
        <ul className="flex flex-col divide-y divide-line">
          {status.data.hours.map((h) => (
            <HoursRow key={h.weekday} h={h} busy={busy} onSave={(v) => act(() => api.chat.setHours(v), `${DAYS[h.weekday]} saved.`)} />
          ))}
        </ul>
      </section>

      <Closures list={closures.data} busy={busy} onSet={(day, reason) => act(() => api.chat.setClosure({ day, reason }), reason === null ? `${formatDateCAT(day)} re-opened.` : `${formatDateCAT(day)} closed.`)} />
    </div>
  )
}

function HoursRow({ h, busy, onSave }: { h: ChatStatus['hours'][number]; busy: boolean; onSave: (v: { weekday: number; isWorking: boolean; opensAt: string; closesAt: string }) => Promise<boolean> }) {
  const [working, setWorking] = useState(h.is_working)
  const [opens, setOpens] = useState(h.opens_at)
  const [closes, setCloses] = useState(h.closes_at)
  const [err, setErr] = useState<string | null>(null)
  const day = DAYS[h.weekday]!
  const changed = working !== h.is_working || opens !== h.opens_at || closes !== h.closes_at
  return (
    <li className="flex flex-wrap items-end gap-3 py-2" aria-label={day}>
      <span className="w-28 font-semibold">{day}</span>
      <label className="flex min-h-touch items-center gap-2">
        <input type="checkbox" className="h-5 w-5" checked={working} onChange={(e) => setWorking(e.target.checked)} />
        Working day
      </label>
      <label className="flex flex-col gap-1 text-sm font-semibold">
        Opens
        <input type="time" aria-label={`${day} opens`} className="min-h-touch rounded-sm border border-line-input bg-surface-card px-2 font-normal" value={opens} onChange={(e) => setOpens(e.target.value)} />
      </label>
      <label className="flex flex-col gap-1 text-sm font-semibold">
        Closes
        <input type="time" aria-label={`${day} closes`} className="min-h-touch rounded-sm border border-line-input bg-surface-card px-2 font-normal" value={closes} onChange={(e) => setCloses(e.target.value)} />
      </label>
      <Button
        size="sm"
        variant="secondary"
        disabled={!changed || busy}
        disabledReason={!changed ? 'No changes' : 'Saving…'}
        onClick={async () => {
          if (!opens || !closes || opens >= closes) {
            setErr('Opening time must be before closing time')
            return
          }
          setErr(null)
          await onSave({ weekday: h.weekday, isWorking: working, opensAt: opens, closesAt: closes })
        }}
      >
        Save {day}
      </Button>
      {err ? (
        <p className="w-full text-sm text-error" role="alert">
          {err}
        </p>
      ) : null}
    </li>
  )
}

function Closures({ list, busy, onSet }: { list: { day: string; reason: string }[]; busy: boolean; onSet: (day: string, reason: string | null) => Promise<boolean> }) {
  const [day, setDay] = useState('')
  const [reason, setReason] = useState('')
  return (
    <section aria-labelledby="closures-h" className="flex flex-col gap-3 rounded-md bg-surface-card p-4 shadow-1">
      <h2 id="closures-h" className="text-h2 font-semibold">
        Closure days
      </h2>
      <p className="text-sm text-ink-muted">Chat stays closed all day on these dates, for example public holidays.</p>
      {list.length === 0 ? <p className="text-ink-muted">No closure days.</p> : null}
      <ul className="flex flex-col gap-2">
        {list.map((c) => (
          <li key={c.day} className="flex flex-wrap items-center gap-3">
            <span className="font-semibold">{formatDateCAT(c.day)}</span>
            <span>{c.reason}</span>
            <Button size="sm" variant="tertiary" disabled={busy} disabledReason="Saving…" onClick={() => void onSet(c.day, null)}>
              Re-open {formatDateCAT(c.day)}
            </Button>
          </li>
        ))}
      </ul>
      <form
        className="flex flex-wrap items-end gap-3"
        onSubmit={async (e) => {
          e.preventDefault()
          if (!day || !reason.trim()) return
          if (await onSet(day, reason)) {
            setDay('')
            setReason('')
          }
        }}
      >
        <label className="flex flex-col gap-1 font-semibold">
          Date
          <input type="date" className="min-h-touch rounded-sm border border-line-input bg-surface-card px-2 font-normal" value={day} onChange={(e) => setDay(e.target.value)} />
        </label>
        <TextField id="closure-reason" label="Reason" maxLength={200} value={reason} onChange={(e) => setReason(e.target.value)} />
        <Button type="submit" variant="secondary" disabled={!day || !reason.trim() || busy} disabledReason="Choose a date and give a reason">
          Add closure
        </Button>
      </form>
    </section>
  )
}

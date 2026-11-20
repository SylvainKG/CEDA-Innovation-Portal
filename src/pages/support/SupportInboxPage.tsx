import { useCallback, useState } from 'react'
import { Banner, Button } from '@/components'
import { EmptyState, ErrorState, ForbiddenState, LoadingState } from '@/components/states/States'
import { useChatAction, useChatInbox } from '@/features/chat/queries'
import { api } from '@/lib/api'
import { formatDateTimeCAT } from '@/lib/format'
import { useSession } from '@/lib/session'
import { ChatThread } from './ChatThread'

const waited = (s: number | null) => (s === null ? '' : s < 60 ? 'waiting under a minute' : `waiting ${Math.floor(s / 60)} min`)

/**
 * T15 consultant inbox (CHT-01), Provisional UI built from the written spec (BCR-003; design review pending).
 * The queue (oldest first, with waiting time) and the consultant's own active chats. "Accept" takes a waiting
 * chat; if another consultant took it first, the server refuses and the screen says so.
 */
export function SupportInboxPage() {
  const { data: user } = useSession()
  const inbox = useChatInbox()
  const [openId, setOpenId] = useState<string | null>(null)
  const accept = useChatAction(useCallback((id: string) => api.chat.accept(id), []))
  const close = useChatAction(useCallback((id: string) => api.chat.close(id), []))

  if (inbox.isPending) return <LoadingState what="the chat inbox" />
  if (inbox.isError) return <ErrorState level="h1" message="We couldn't load the chat inbox." onRetry={() => void inbox.refetch()} />
  if (inbox.data === null) return <ForbiddenState home="/staff" />

  const rows = inbox.data
  const queued = rows.filter((r) => r.status === 'queued')
  const active = rows.filter((r) => r.status === 'active')
  const current = active.find((r) => r.session_id === openId) ?? (active.length === 1 ? active[0] : undefined)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-h1 font-semibold">Support inbox</h1>
        <p className="text-ink-muted" role="status">
          {queued.length} waiting · {active.length} with you
        </p>
      </div>
      {accept.state.kind === 'refused' ? <Banner kind="warning">{accept.state.message ?? 'Another consultant took this conversation, or it has ended.'}</Banner> : null}
      {accept.state.kind === 'unconfirmed' ? <Banner kind="warning">We couldn&apos;t confirm you took the chat. The list shows what is saved.</Banner> : null}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-[18rem_1fr]">
        <div className="flex flex-col gap-4">
          <section aria-labelledby="inbox-waiting" className="flex flex-col gap-2">
            <h2 id="inbox-waiting" className="text-h3 font-semibold">
              Waiting
            </h2>
            {queued.length === 0 ? <p className="text-ink-muted">No one is waiting.</p> : null}
            <ul className="flex flex-col gap-2">
              {queued.map((r) => (
                <li key={r.session_id} className="flex flex-col gap-1 rounded-md bg-surface-card p-3 shadow-1">
                  <span className="font-semibold">{r.applicant_name ?? 'Applicant'}</span>
                  <span className="text-sm text-ink-muted">{waited(r.waiting_seconds)}</span>
                  {r.last_message ? <span className="break-words text-sm">{r.last_message}</span> : null}
                  <div>
                    <Button
                      size="sm"
                      loading={accept.state.kind === 'busy'}
                      loadingLabel="Accepting…"
                      onClick={async () => {
                        const res = await accept.run(r.session_id)
                        if (res.kind === 'done') setOpenId(r.session_id)
                      }}
                    >
                      Accept
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </section>
          <section aria-labelledby="inbox-mine" className="flex flex-col gap-2">
            <h2 id="inbox-mine" className="text-h3 font-semibold">
              With you
            </h2>
            {active.length === 0 ? <p className="text-ink-muted">No active chats.</p> : null}
            <ul className="flex flex-col gap-2">
              {active.map((r) => (
                <li key={r.session_id}>
                  <Button variant={current?.session_id === r.session_id ? 'primary' : 'secondary'} size="sm" aria-pressed={current?.session_id === r.session_id} onClick={() => setOpenId(r.session_id)}>
                    {r.applicant_name ?? 'Applicant'}
                  </Button>
                  {r.last_message_at ? <span className="ml-2 text-sm text-ink-muted">{formatDateTimeCAT(r.last_message_at)}</span> : null}
                </li>
              ))}
            </ul>
          </section>
        </div>

        {current && user ? (
          <section aria-labelledby="inbox-thread" className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 id="inbox-thread" className="text-h2 font-semibold">
                Chat with {current.applicant_name ?? 'applicant'}
              </h2>
              <Button
                variant="secondary"
                size="sm"
                loading={close.state.kind === 'busy'}
                loadingLabel="Closing…"
                onClick={async () => {
                  const res = await close.run(current.session_id)
                  if (res.kind === 'done') setOpenId(null)
                }}
              >
                Close chat
              </Button>
            </div>
            {close.state.kind === 'refused' || close.state.kind === 'unconfirmed' ? <Banner kind="error">The chat may not have closed. Try again.</Banner> : null}
            <ChatThread sessionId={current.session_id} myId={user.id} otherLabel={current.applicant_name ?? 'Applicant'} canWrite />
          </section>
        ) : (
          <EmptyState title={active.length ? 'Choose a chat' : 'No chat open'}>{active.length ? 'Pick a conversation on the left.' : 'Accept a waiting chat to start.'}</EmptyState>
        )}
      </div>
    </div>
  )
}

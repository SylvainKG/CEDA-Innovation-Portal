import { useCallback, useState } from 'react'
import { Link } from 'react-router-dom'
import { Banner, Button, TextField } from '@/components'
import { ErrorState, LoadingState } from '@/components/states/States'
import { useChatAction, useChatStatus, useMyChat } from '@/features/chat/queries'
import { api } from '@/lib/api'
import { useSession } from '@/lib/session'
import { ChatThread } from './ChatThread'

const DAYS = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

/**
 * T15 chat, applicant side (CHT-01, CHT-02), Provisional UI built from the written spec (BCR-003; design review
 * pending). Built as a page reached from "Chat" in the applicant navigation rather than a floating widget.
 * States: closed (with the opening hours), start, waiting for a consultant, active, ended.
 */
export function ApplicantChatPage() {
  const { data: user } = useSession()
  const status = useChatStatus()
  const mine = useMyChat()
  const [first, setFirst] = useState('')
  const start = useChatAction(useCallback((msg: string) => api.chat.start(msg), []))
  const close = useChatAction(useCallback((id: string) => api.chat.close(id), []))

  if (status.isPending || mine.isPending) return <LoadingState what="chat" />
  if (status.isError || mine.isError) return <ErrorState level="h1" message="We couldn't load chat." onRetry={() => void Promise.all([status.refetch(), mine.refetch()])} />

  const s = mine.data
  const live = s && (s.status === 'queued' || s.status === 'active')

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-h1 font-semibold">Chat with CEDA</h1>
        <p className="text-ink-muted">A consultant answers questions about the portal and your idea. Don&apos;t share passwords or bank details.</p>
      </div>

      {live && user ? (
        <section aria-labelledby="chat-now" className="flex flex-col gap-3">
          <h2 id="chat-now" className="sr-only">
            Your conversation
          </h2>
          <p role="status" className="font-semibold">
            {s.status === 'queued' ? 'A consultant will join shortly.' : 'A consultant has joined.'}
          </p>
          <ChatThread sessionId={s.id} myId={user.id} otherLabel="CEDA consultant" canWrite />
          <div>
            <Button variant="tertiary" loading={close.state.kind === 'busy'} loadingLabel="Ending…" onClick={() => void close.run(s.id)}>
              End chat
            </Button>
          </div>
          {close.state.kind === 'refused' || close.state.kind === 'unconfirmed' ? <Banner kind="error">The chat may not have ended. Try again.</Banner> : null}
        </section>
      ) : !status.data.open ? (
        <Banner kind="info" title="Chat is closed now">
          <p>
            Chat is open {status.data.hours.filter((h) => h.is_working).map((h) => DAYS[h.weekday]).join(', ')}, {status.data.hours.find((h) => h.is_working)?.opens_at}–
            {status.data.hours.find((h) => h.is_working)?.closes_at} CAT. Until then, the <Link to="/help/faqs">FAQs</Link> may help.
          </p>
        </Banner>
      ) : (
        <form
          className="flex flex-col gap-3"
          aria-label="Start a chat"
          onSubmit={async (e) => {
            e.preventDefault()
            if (!first.trim()) return
            const r = await start.run(first.trim())
            if (r.kind === 'done') setFirst('')
          }}
        >
          {s && (s.status === 'closed' || s.status === 'missed') ? (
            <p className="text-ink-muted">{s.status === 'missed' ? 'No consultant was free for your last chat. You can try again.' : 'Your last chat has ended.'}</p>
          ) : null}
          <TextField
            multiline
            rows={3}
            id="chat-first"
            label="How can we help?"
            maxLength={2000}
            value={first}
            onChange={(e) => setFirst(e.target.value)}
            error={start.state.kind === 'refused' ? start.state.fields?.message : undefined}
          />
          {start.state.kind === 'refused' && !start.state.fields ? <Banner kind="error">{start.state.message ?? 'The chat did not start.'}</Banner> : null}
          {start.state.kind === 'unconfirmed' ? <Banner kind="warning">We couldn&apos;t confirm the chat started. Wait a moment: if it started, it appears here.</Banner> : null}
          <div>
            <Button type="submit" disabled={!first.trim()} disabledReason="Write a message first" loading={start.state.kind === 'busy'} loadingLabel="Starting…">
              Start chat
            </Button>
          </div>
        </form>
      )}
    </div>
  )
}

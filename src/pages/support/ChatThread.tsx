import { useCallback, useState } from 'react'
import { Banner, Button, TextField } from '@/components'
import { messageLanded, useChatAction, useChatMessages } from '@/features/chat/queries'
import { api } from '@/lib/api'
import { formatDateTimeCAT } from '@/lib/format'

/**
 * The messages of one chat and a box to write in (spec T15 ChatThread). Shared by the applicant's chat and the
 * consultant inbox. `otherLabel` names the other side ("CEDA consultant" or the applicant's name).
 */
export function ChatThread({ sessionId, myId, otherLabel, canWrite }: { sessionId: string; myId: string; otherLabel: string; canWrite: boolean }) {
  const messages = useChatMessages(sessionId)
  const [draft, setDraft] = useState('')
  const send = useCallback((body: string) => api.chat.send(sessionId, body), [sessionId])
  const landed = useCallback((body: string) => messageLanded(sessionId, myId, body), [sessionId, myId])
  const action = useChatAction(send, landed)

  async function submit() {
    const body = draft.trim()
    if (!body) return
    const r = await action.run(body)
    if (r.kind === 'done') setDraft('')
  }

  return (
    <div className="flex flex-col gap-3">
      {messages.isError ? <Banner kind="error">We couldn&apos;t load the conversation. It will try again in a few seconds.</Banner> : null}
      <ol aria-label="Conversation" aria-live="polite" className="flex max-h-[28rem] flex-col gap-2 overflow-y-auto rounded-md border border-line p-3">
        {(messages.data ?? []).length === 0 ? <li className="text-ink-muted">No messages yet.</li> : null}
        {(messages.data ?? []).map((m) => {
          const mine = m.sender_id === myId
          return (
            <li key={m.id} className={mine ? 'self-end' : 'self-start'}>
              <div className={`max-w-[34rem] rounded-md p-2 ${mine ? 'bg-brand-subtle' : 'bg-surface-sunken'}`}>
                <p className="text-sm font-semibold">{mine ? 'You' : otherLabel}</p>
                <p className="whitespace-pre-wrap break-words">{m.body}</p>
                <p className="text-xs text-ink-muted">{formatDateTimeCAT(m.created_at)}</p>
              </div>
            </li>
          )
        })}
      </ol>
      {canWrite ? (
        <form
          className="flex flex-col gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            void submit()
          }}
        >
          <TextField
            multiline
            rows={2}
            id={`chat-${sessionId}-msg`}
            label="Your message"
            maxLength={2000}
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value)
              if (action.state.kind !== 'idle' && action.state.kind !== 'busy') action.reset()
            }}
            error={action.state.kind === 'refused' ? (action.state.fields?.body ?? undefined) : undefined}
          />
          {action.state.kind === 'refused' && !action.state.fields ? <Banner kind="error">{action.state.message ?? 'Your message was not sent.'}</Banner> : null}
          {action.state.kind === 'unconfirmed' ? (
            <Banner kind="warning">We couldn&apos;t confirm your message was sent, and it isn&apos;t in the conversation yet. Check above before sending it again.</Banner>
          ) : null}
          <div>
            <Button type="submit" disabled={!draft.trim()} disabledReason="Write a message first" loading={action.state.kind === 'busy'} loadingLabel="Sending…">
              Send
            </Button>
          </div>
        </form>
      ) : null}
    </div>
  )
}

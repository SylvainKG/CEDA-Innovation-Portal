import { useId, useState } from 'react'
import { Banner, Button, Dialog, TextField } from '@/components'
import { useRequestFeedback } from '@/features/feedback/queries'
import type { FeedbackKind, StaffCase } from '@/lib/api/types'

/**
 * T10 "Request clarification" / "Request revision" (spec T10; contract §4.4 `request_feedback`), built from the
 * written spec (BCR-003; design review pending). A revision carries a FeedbackTaskBuilder: up to 10 tasks
 * (the contract's limit; the spec suggests 1–8), each 1–1,000 characters. Task wording is locked once sent.
 */
const MAX_TASKS = 10

function defaultDue(days: number): string {
  return new Date(Date.now() + days * 86_400_000).toLocaleDateString('en-CA', { timeZone: 'Africa/Gaborone' })
}
function tomorrow(): string {
  return defaultDue(1)
}

const COPY: Record<FeedbackKind, { title: string; consequence: string; button: string; messageLabel: string }> = {
  clarification: {
    title: 'Request clarification',
    consequence: 'The applicant must reply in writing. No new version is created.',
    button: 'Send question',
    messageLabel: 'Question',
  },
  revision: {
    title: 'Request revision',
    consequence: 'The applicant will submit a new version. Current scores stay with the current version.',
    button: 'Send revision request',
    messageLabel: 'Message',
  },
}

export function RequestFeedbackDialog({
  c,
  kind,
  open,
  onOpenChange,
  onDone,
}: {
  c: StaffCase
  kind: FeedbackKind
  open: boolean
  onOpenChange: (open: boolean) => void
  onDone: (kind: FeedbackKind) => void
}) {
  const command = useRequestFeedback(c.id)
  const [message, setMessage] = useState('')
  const [due, setDue] = useState(() => defaultDue(7))
  const [tasks, setTasks] = useState<string[]>(kind === 'revision' ? [''] : [])
  const [errors, setErrors] = useState<Record<string, string>>({})
  const id = useId()
  const copy = COPY[kind]

  async function submit() {
    const found: Record<string, string> = {}
    if (!message.trim()) found.message = kind === 'clarification' ? 'Write your question' : 'Write a message'
    if (!due) found.due = 'Choose a deadline'
    else if (due < tomorrow()) found.due = 'The deadline must be in the future'
    const list = tasks.map((t) => t.trim())
    list.forEach((t, i) => {
      if (!t) found[`task:${i + 1}`] = 'Write the task, or remove it'
    })
    setErrors(found)
    if (Object.keys(found).length) return
    // A deadline means the end of the working day: 17:00 CAT (UTC+2) on that date.
    const final = await command.run({ kind, message: message.trim(), dueAt: `${due}T15:00:00.000Z`, tasks: list })
    if (final.kind === 'done') {
      command.reset()
      setMessage('')
      setTasks(kind === 'revision' ? [''] : [])
      onDone(kind)
    } else if (final.kind === 'refused' && final.fields) {
      setErrors((e) => ({ ...e, ...final.fields }))
    }
  }

  const s = command.state
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) command.reset()
        onOpenChange(next)
      }}
      title={`${copy.title} for ${c.reference}`}
      consequence={copy.consequence}
      primaryLabel={copy.button}
      onPrimary={() => void submit()}
      busy={s.kind === 'saving'}
      audited
    >
      {s.kind === 'refused' && !s.fields ? <Banner kind="error">{s.message ?? 'The request was not sent.'}</Banner> : null}
      {s.kind === 'refused' && s.fields && s.message ? <Banner kind="error">{s.message}</Banner> : null}
      {s.kind === 'unconfirmed' ? (
        <Banner kind="warning" title="Not confirmed yet">
          We couldn't confirm the request was sent. Check your connection and try again: a second request can't be opened while one is open.
        </Banner>
      ) : null}
      <TextField
        multiline
        rows={4}
        id={`${id}-message`}
        label={copy.messageLabel}
        required
        maxLength={4000}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        error={errors.message}
      />
      <TextField
        id={`${id}-due`}
        type="date"
        label="Respond by"
        required
        min={tomorrow()}
        help="Replies are due by 17:00 CAT on this date. The default is 7 days from today."
        value={due}
        onChange={(e) => setDue(e.target.value)}
        error={errors.due ?? errors.due_at}
      />
      {kind === 'revision' ? (
        <fieldset className="flex flex-col gap-3">
          <legend className="font-semibold">Roadmap tasks</legend>
          <p className="text-sm text-ink-muted">
            Each task is something the applicant should change. They'll say whether they addressed it, and reviewers verify it. Task wording can't be
            changed after sending.
          </p>
          {tasks.length === 0 ? (
            <p className="text-sm">No tasks: the applicant gets only your message.</p>
          ) : (
            tasks.map((t, i) => (
              <div key={i} className="flex flex-col gap-2 rounded-md border border-line p-3">
                <TextField
                  multiline
                  rows={2}
                  id={`${id}-task-${i}`}
                  label={`Task ${i + 1}`}
                  maxLength={1000}
                  value={t}
                  onChange={(e) => setTasks((all) => all.map((x, k) => (k === i ? e.target.value : x)))}
                  error={errors[`task:${i + 1}`]}
                />
                <div>
                  <Button variant="tertiary" size="sm" onClick={() => setTasks((all) => all.filter((_, k) => k !== i))}>
                    Remove task {i + 1}
                  </Button>
                </div>
              </div>
            ))
          )}
          {tasks.length < MAX_TASKS ? (
            <div>
              <Button variant="secondary" size="sm" onClick={() => setTasks((all) => [...all, ''])}>
                Add a task
              </Button>
            </div>
          ) : (
            <p className="text-sm text-ink-muted">You can add up to {MAX_TASKS} tasks.</p>
          )}
        </fieldset>
      ) : null}
    </Dialog>
  )
}

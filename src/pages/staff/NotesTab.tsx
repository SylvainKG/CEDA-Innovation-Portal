import { useId, useState } from 'react'
import { Banner, Button, TextField } from '@/components'
import { useAddNote, useNotes } from '@/features/staff/queries'
import { formatDateTimeCAT } from '@/lib/format'

/**
 * T08 "Internal notes" tab (spec T08; contract §3, §4.2 `add_internal_note`). Staff with `case.note` read and add
 * notes; the applicant never can (no read policy for them, and this tab is never rendered in applicant markup).
 * The audit log records that a note was added, not its text.
 */
export function NotesTab({ proposalId }: { proposalId: string }) {
  const notes = useNotes(proposalId, true)
  const command = useAddNote(proposalId)
  const [body, setBody] = useState('')
  const [error, setError] = useState<string | undefined>()
  const id = useId()

  async function submit() {
    if (!body.trim()) {
      setError('Write a note first')
      return
    }
    setError(undefined)
    const final = await command.add(body)
    if (final.kind === 'done') {
      setBody('')
      command.reset()
    }
  }

  const s = command.state
  return (
    <div className="flex max-w-form flex-col gap-4">
      <p className="text-sm text-ink-muted">Only CEDA staff can see these notes. The applicant never sees them.</p>
      <form
        className="flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault()
          void submit()
        }}
      >
        {s.kind === 'refused' ? <Banner kind="error">{s.message ?? 'The note was not added.'}</Banner> : null}
        {s.kind === 'unconfirmed' ? (
          <Banner kind="warning" title="Not confirmed yet">
            We couldn't confirm the note was saved. Check the list below before adding it again, so it isn't saved twice.
          </Banner>
        ) : null}
        <TextField
          multiline
          rows={3}
          id={`${id}-note`}
          label="New note"
          maxLength={4000}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          error={error ?? (s.kind === 'refused' ? s.fields?.body : undefined)}
        />
        <div>
          <Button type="submit" loading={s.kind === 'saving'} loadingLabel="Adding…">
            Add note
          </Button>
        </div>
      </form>

      {notes.isPending ? (
        <p className="text-ink-muted">Loading notes…</p>
      ) : notes.isError ? (
        <p className="text-error">We couldn't load the notes.</p>
      ) : notes.data.length === 0 ? (
        <p className="text-ink-muted">No notes yet.</p>
      ) : (
        <ol className="flex flex-col gap-3" aria-label="Notes, newest first">
          {notes.data.map((n) => (
            <li key={n.id} className="flex flex-col gap-1 rounded-md bg-surface-card p-4 shadow-1">
              <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm text-ink-muted">
                <span className="font-semibold text-ink">{n.mine ? 'You' : (n.author_name ?? 'Staff')}</span>
                <time dateTime={n.created_at}>{formatDateTimeCAT(n.created_at)}</time>
              </div>
              <p className="whitespace-pre-wrap break-words">{n.body}</p>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}

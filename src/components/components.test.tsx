import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { Button, DataTable, EmptyState, FileUpload, ForbiddenState, StatusBadge, TextField, UnknownOutcomeBanner } from '.'

describe('Button', () => {
  it('blocks repeat clicks while loading and keeps a visible label', async () => {
    const onClick = vi.fn()
    render(
      <Button loading loadingLabel="Submitting…" onClick={onClick}>
        Submit idea
      </Button>,
    )
    const button = screen.getByRole('button', { name: 'Submitting…' })
    expect(button).toBeDisabled()
    await userEvent.click(button)
    expect(onClick).not.toHaveBeenCalled()
  })

  it('explains why it is disabled', () => {
    render(
      <Button disabled disabledReason="Answer all 3 tasks to submit">
        Submit Version 2
      </Button>,
    )
    expect(screen.getByRole('button', { name: 'Submit Version 2' })).toHaveAccessibleDescription('Answer all 3 tasks to submit')
  })
})

describe('TextField', () => {
  it('marks required fields in text and links the error to the input', () => {
    render(<TextField label="Problem statement" required error="Add a problem statement to submit." value="" onChange={() => {}} />)
    const input = screen.getByRole('textbox', { name: /Problem statement/ })
    expect(screen.getByText('Required')).toBeInTheDocument()
    expect(input).toBeRequired()
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input).toHaveAccessibleDescription(/Add a problem statement to submit\./)
  })

  it('shows a character counter when a maximum is set', () => {
    render(<TextField multiline label="Summary" maxLength={300} value="Hello" onChange={() => {}} />)
    expect(screen.getByText('5 / 300 characters')).toBeInTheDocument()
  })
})

describe('StatusBadge', () => {
  it('uses text, not colour alone, and the audience-specific label', () => {
    const { rerender } = render(<StatusBadge status="submitted" audience="applicant" />)
    expect(screen.getByText('Submitted')).toBeInTheDocument()
    rerender(<StatusBadge status="submitted" audience="staff" />)
    expect(screen.getByText('Awaiting screening')).toBeInTheDocument()
  })
})

describe('DataTable', () => {
  it('renders the empty state when there are no rows', () => {
    render(
      <DataTable
        caption="Screening queue"
        columns={[{ key: 'ref', header: 'Reference', cell: (r: { ref: string }) => r.ref }]}
        rows={[]}
        getRowKey={(r) => r.ref}
        empty={<EmptyState title="No cases are waiting for screening" />}
      />,
    )
    expect(screen.getByRole('heading', { name: 'No cases are waiting for screening' })).toBeInTheDocument()
  })

  it('renders rows as a table and as mobile cards', () => {
    render(
      <DataTable
        caption="Screening queue"
        columns={[
          { key: 'ref', header: 'Reference', cell: (r: { ref: string; title: string }) => r.ref, primary: true },
          { key: 'title', header: 'Title', cell: (r: { ref: string; title: string }) => r.title },
        ]}
        rows={[{ ref: 'CEDA-2026-0007', title: 'Livestock water point mapping' }]}
        getRowKey={(r) => r.ref}
        empty={null}
      />,
    )
    expect(screen.getByRole('table', { name: 'Screening queue' })).toBeInTheDocument()
    expect(screen.getByRole('list', { name: 'Screening queue' })).toBeInTheDocument()
  })
})

describe('FileUpload client pre-check (server stays authoritative)', () => {
  const setup = () => {
    const onFileSelected = vi.fn()
    const onFileRejected = vi.fn()
    render(
      <FileUpload
        label="Business plan"
        accept={['.pdf', '.docx']}
        maxSizeBytes={10 * 1024 * 1024}
        state={{ kind: 'idle' }}
        onFileSelected={onFileSelected}
        onFileRejected={onFileRejected}
      />,
    )
    return { onFileSelected, onFileRejected, input: screen.getByLabelText('Business plan') as HTMLInputElement }
  }

  it('states accepted types and size before upload', () => {
    setup()
    expect(screen.getByText('Accepted: .pdf, .docx · up to 10.0 MB')).toBeInTheDocument()
  })

  it('rejects a disallowed type', async () => {
    const { input, onFileRejected, onFileSelected } = setup()
    await userEvent.upload(input, new File(['x'], 'pitch.pptx'), { applyAccept: false })
    expect(onFileRejected).toHaveBeenCalledWith('pitch.pptx', expect.stringMatching(/not accepted/))
    expect(onFileSelected).not.toHaveBeenCalled()
  })

  it('rejects a file over the size limit', async () => {
    const { input, onFileRejected } = setup()
    const big = new File(['x'], 'plan.pdf')
    Object.defineProperty(big, 'size', { value: 11 * 1024 * 1024 })
    await userEvent.upload(input, big)
    expect(onFileRejected).toHaveBeenCalledWith('plan.pdf', expect.stringMatching(/larger than 10.0 MB/))
  })

  it('passes an acceptable file on', async () => {
    const { input, onFileSelected } = setup()
    await userEvent.upload(input, new File(['x'], 'plan.pdf'))
    expect(onFileSelected).toHaveBeenCalledTimes(1)
  })
})

describe('honest states', () => {
  it('Forbidden does not confirm that a record exists', () => {
    render(
      <MemoryRouter>
        <ForbiddenState />
      </MemoryRouter>,
    )
    expect(screen.getByRole('heading', { name: "You don't have access to this page" })).toBeInTheDocument()
    expect(document.body.textContent).not.toMatch(/not found|does not exist|exists/i)
  })

  it('an unknown outcome never says "Failed" and offers a status check', async () => {
    const onCheck = vi.fn()
    render(<UnknownOutcomeBanner what="submission" onCheckStatus={onCheck} />)
    expect(document.body.textContent).toMatch(/Not confirmed yet/)
    expect(document.body.textContent).not.toMatch(/fail/i)
    await userEvent.click(screen.getByRole('button', { name: 'Check status' }))
    expect(onCheck).toHaveBeenCalledTimes(1)
  })
})

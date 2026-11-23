import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { INNOVATOR_HIGHLIGHTED, INNOVATOR_TOOLS, REVIEWER_HIGHLIGHTED, REVIEWER_TOOLS } from '@/features/toolkit-preview/catalogue'
import { toolkitPreviewEnabled } from '@/features/toolkit-preview/flag'
import catalogueSource from '@/features/toolkit-preview/catalogue.ts?raw'
import flagSource from '@/features/toolkit-preview/flag.ts?raw'
import { ToolkitPreview } from './ToolkitPreview'
import componentSource from './ToolkitPreview.tsx?raw'

function renderPreview() {
  render(<ToolkitPreview eyebrow="Coming soon" title="Business Development Toolkit" workflow="Plan your business." tools={INNOVATOR_TOOLS} highlighted={INNOVATOR_HIGHLIGHTED} />)
}

describe('toolkit preview catalogue', () => {
  it('lists 14 innovator and 8 reviewer tools, all planned, with unique ids', () => {
    expect(INNOVATOR_TOOLS).toHaveLength(14)
    expect(REVIEWER_TOOLS).toHaveLength(8)
    const all = [...INNOVATOR_TOOLS, ...REVIEWER_TOOLS]
    expect(new Set(all.map((t) => t.id)).size).toBe(22)
    expect(all.every((t) => t.status === 'planned' && t.name && t.description)).toBe(true)
  })

  it('highlights four tools per toolkit, each from its own list', () => {
    expect(INNOVATOR_HIGHLIGHTED.every((id) => INNOVATOR_TOOLS.some((t) => t.id === id))).toBe(true)
    expect(REVIEWER_HIGHLIGHTED.every((id) => REVIEWER_TOOLS.some((t) => t.id === id))).toBe(true)
    expect(INNOVATOR_HIGHLIGHTED).toHaveLength(4)
    expect(REVIEWER_HIGHLIGHTED).toHaveLength(4)
  })
})

describe('toolkit preview flag', () => {
  it('is on only for the exact value "true"', () => {
    expect(toolkitPreviewEnabled({})).toBe(false)
    expect(toolkitPreviewEnabled({ VITE_TOOLKIT_PREVIEW: 'false' })).toBe(false)
    expect(toolkitPreviewEnabled({ VITE_TOOLKIT_PREVIEW: '1' })).toBe(false)
    expect(toolkitPreviewEnabled({ VITE_TOOLKIT_PREVIEW: 'true' })).toBe(true)
  })
})

describe('ToolkitPreview', () => {
  it('shows the four highlighted tools as cards, each marked planned, and says they are not yet available', () => {
    renderPreview()
    const section = screen.getByRole('region', { name: 'Business Development Toolkit' })
    expect(within(section).getByText(/not yet available/)).toBeInTheDocument()
    const cards = within(section).getByRole('list', { name: 'Business Development Toolkit: highlighted tools' })
    const items = within(cards).getAllByRole('listitem')
    expect(items.map((li) => within(li).getByRole('heading').textContent)).toEqual([
      'Business Model Canvas',
      'Business Budgeter',
      'Break-Even & Pricing Calculator',
      'Funding Readiness Checker',
    ])
    expect(items.every((li) => within(li).queryByText('Planned feature'))).toBe(true)
    // No links or actions into tools that don't exist.
    expect(within(section).queryAllByRole('link')).toHaveLength(0)
  })

  it('opens a dialog listing every tool, closes with the close button and with Escape, and returns focus', async () => {
    const user = userEvent.setup()
    renderPreview()
    const open = screen.getByRole('button', { name: 'View planned tools' })

    await user.click(open)
    const dialog = screen.getByRole('dialog', { name: 'Business Development Toolkit' })
    const list = within(dialog).getByRole('list', { name: 'Business Development Toolkit: planned tools' })
    expect(within(list).getAllByRole('listitem')).toHaveLength(14)
    expect(within(list).getAllByText('Planned feature')).toHaveLength(14)
    expect(within(dialog).getByText(/not yet available/)).toBeInTheDocument()

    await user.click(within(dialog).getByRole('button', { name: 'Close' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(open).toHaveFocus()

    await user.click(open)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(open).toHaveFocus()
  })

  it('makes no requests: the component and catalogue import no API or network module', () => {
    for (const source of [componentSource, catalogueSource, flagSource]) {
      expect(source).not.toMatch(/@\/lib\/api|supabase|fetch\(|useQuery/)
    }
  })
})

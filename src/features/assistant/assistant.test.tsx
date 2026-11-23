import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ask, AssistantError, pickRecordingType, readAssistantConfig, transcribe } from './leseding'
import { PeolwaneAssistant, PeolwaneSidebarLauncher } from './PeolwaneAssistant'
import { getState, resetAssistant, sendQuestion, setMode, setOpen } from './store'

const CFG = { base: 'https://engine.example', key: 'lsk_test_key' }

/** A fetch Response whose body streams the given chunks, like the engine's text/plain reply. */
function streamed(chunks: string[], status = 200) {
  const enc = new TextEncoder()
  const body = new ReadableStream<Uint8Array>({
    start(c) {
      chunks.forEach((s) => c.enqueue(enc.encode(s)))
      c.close()
    },
  })
  return new Response(body, { status, headers: { 'Content-Type': 'text/plain' } })
}

function renderAssistant(config: typeof CFG | null = CFG, placement: 'default' | 'applicant' | 'sidebar' = 'default') {
  render(
    <MemoryRouter>
      {placement === 'sidebar' ? <PeolwaneSidebarLauncher config={config} /> : null}
      <PeolwaneAssistant config={config} placement={placement} />
    </MemoryRouter>,
  )
  return userEvent.setup()
}

const fetchMock = vi.fn()

beforeEach(() => {
  resetAssistant()
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  act(() => resetAssistant())
  vi.unstubAllGlobals()
})

describe('configuration', () => {
  it('needs both values and an https base (http only for localhost)', () => {
    expect(readAssistantConfig({})).toBeNull()
    expect(readAssistantConfig({ VITE_LESEDING_BASE: 'https://e.example' })).toBeNull()
    expect(readAssistantConfig({ VITE_LESEDING_KEY: 'k' })).toBeNull()
    expect(readAssistantConfig({ VITE_LESEDING_BASE: 'http://e.example', VITE_LESEDING_KEY: 'k' })).toBeNull()
    expect(readAssistantConfig({ VITE_LESEDING_BASE: 'not a url', VITE_LESEDING_KEY: 'k' })).toBeNull()
    expect(readAssistantConfig({ VITE_LESEDING_BASE: 'http://localhost:8000/', VITE_LESEDING_KEY: 'k' })).toEqual({ base: 'http://localhost:8000', key: 'k' })
    expect(readAssistantConfig({ VITE_LESEDING_BASE: ' https://e.example/ ', VITE_LESEDING_KEY: ' k ' })).toEqual({ base: 'https://e.example', key: 'k' })
  })

  it('is not shown at all when the service is not configured', () => {
    renderAssistant(null)
    expect(screen.queryByRole('button', { name: 'Peolwane AI' })).not.toBeInTheDocument()
  })
})

describe('client (Leseding AI Engine API)', () => {
  it('asks with the key header, English, the last 10 turns, and streams the reply', async () => {
    fetchMock.mockResolvedValue(streamed(['Open ', 'Challenges ', 'from the menu.']))
    const history = Array.from({ length: 14 }, (_, i) => ({ role: i % 2 ? 'assistant' : 'user', content: `t${i}` }) as const)
    const seen: string[] = []
    const reply = await ask(CFG, { question: 'How do I apply?', history, sessionId: 's1', turnIndex: 3, source: 'text' }, (t) => seen.push(t))
    expect(reply).toBe('Open Challenges from the menu.')
    expect(seen.at(-1)).toBe('Open Challenges from the menu.')
    const [url, init] = fetchMock.mock.calls[0]!
    expect(url).toBe('https://engine.example/api/chat')
    expect(init.headers['X-API-Key']).toBe('lsk_test_key')
    const body = JSON.parse(init.body)
    expect(body).toMatchObject({ question: 'How do I apply?', language: 'english', session_id: 's1', turn_index: 3, source: 'widget' })
    expect(body.history).toHaveLength(10)
    expect(body.history[0].content).toBe('t4')
  })

  it('sends the recording as a file with language=english and returns the text', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ text: ' where is my receipt ' }), { status: 200 }))
    const text = await transcribe(CFG, new Blob(['x'], { type: 'audio/webm' }))
    expect(text).toBe('where is my receipt')
    const [url, init] = fetchMock.mock.calls[0]!
    expect(url).toBe('https://engine.example/api/transcribe')
    expect((init.body as FormData).get('language')).toBe('english')
    expect((init.body as FormData).get('file')).toBeInstanceOf(Blob)
  })

  it('turns refusals and network loss into plain messages', async () => {
    fetchMock.mockResolvedValueOnce(new Response('no', { status: 403 }))
    await expect(transcribe(CFG, new Blob())).rejects.toThrow('Peolwane AI is not available on this site right now.')
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'))
    await expect(transcribe(CFG, new Blob())).rejects.toBeInstanceOf(AssistantError)
  })

  it('records in a format the engine accepts, or reports none', () => {
    expect(pickRecordingType((t) => t === 'audio/ogg')).toBe('audio/ogg')
    expect(pickRecordingType((t) => t.startsWith('audio/webm'))).toBe('audio/webm;codecs=opus')
    expect(pickRecordingType(() => false)).toBeNull()
  })
})

describe('conversation persistence', () => {
  it('restores the completed conversation, mode and engine turn after a reload', async () => {
    fetchMock.mockResolvedValue(streamed(['Open Challenges to read the brief.']))
    setMode('text')
    await sendQuestion(CFG, 'Where is the brief?', 'text')
    window.dispatchEvent(new Event('pagehide'))

    const saved = JSON.parse(window.sessionStorage.getItem('ceda.peolwane.session.v1')!)
    expect(saved).toMatchObject({ mode: 'text', turnIndex: 1 })
    expect(saved.messages.slice(-2)).toEqual([
      { id: 1, role: 'user', content: 'Where is the brief?' },
      { id: 2, role: 'assistant', content: 'Open Challenges to read the brief.' },
    ])

    vi.resetModules()
    const reloadedStore = await import('./store')
    expect(reloadedStore.getState().mode).toBe('text')
    expect(reloadedStore.getState().messages.slice(-2).map(({ role, content }) => ({ role, content }))).toEqual([
      { role: 'user', content: 'Where is the brief?' },
      { role: 'assistant', content: 'Open Challenges to read the brief.' },
    ])
  })
})

describe('Peolwane AI panel', () => {
  it('opens from the bottom-right button in voice mode, and Esc closes it and returns focus', async () => {
    const user = renderAssistant()
    const launcher = screen.getByRole('button', { name: 'Peolwane AI' })
    expect(launcher.className).toContain('peolwane-launcher')
    await user.click(launcher)
    const dialog = screen.getByRole('dialog', { name: 'Peolwane AI' })
    expect(dialog).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Voice' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Start speaking' })).toHaveFocus()
    expect(screen.getByText(/Hello, I'm Peolwane AI/)).toBeInTheDocument()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Peolwane AI' })).toHaveFocus()
  })

  it('folds the launcher and closes the panel when the page scrolls', async () => {
    const user = renderAssistant()
    await user.click(screen.getByRole('button', { name: 'Peolwane AI' }))
    Object.defineProperty(window, 'scrollY', { configurable: true, value: 40 })
    act(() => window.dispatchEvent(new Event('scroll')))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(document.querySelector('.peolwane-panel')).toHaveClass('peolwane-panel--closing')
    expect(screen.getByRole('button', { name: 'Peolwane AI' }).className).toContain('peolwane-launcher--compact')
    await waitFor(() => expect(document.querySelector('.peolwane-panel')).not.toBeInTheDocument())
    Object.defineProperty(window, 'scrollY', { configurable: true, value: 0 })
  })

  it('uses the applicant placement while keeping one assistant launcher', () => {
    renderAssistant(CFG, 'applicant')
    expect(screen.getByRole('button', { name: 'Peolwane AI' }).className).toContain('peolwane-launcher--applicant')
  })

  it('staff: opens from the sidebar launcher beside the sidebar, with no floating launcher, and Esc returns focus to it', async () => {
    const user = renderAssistant(CFG, 'sidebar')
    const launcher = screen.getByRole('button', { name: 'Peolwane AI' })
    expect(launcher.className).toContain('peolwane-sidebar-launcher')
    expect(document.querySelector('.peolwane-launcher')).not.toBeInTheDocument()
    await user.click(launcher)
    expect(launcher).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('dialog', { name: 'Peolwane AI' })).toHaveClass('peolwane-panel--beside-sidebar')
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(launcher).toHaveFocus()
  })

  it('staff: shows no sidebar launcher when the assistant is not configured', () => {
    renderAssistant(null, 'sidebar')
    expect(screen.queryByRole('button', { name: 'Peolwane AI' })).not.toBeInTheDocument()
  })

  it('switches to text, sends a typed question and shows the streamed answer (not spoken)', async () => {
    fetchMock.mockResolvedValue(streamed(['Your receipt is on ', 'the idea page.']))
    const user = renderAssistant()
    await user.click(screen.getByRole('button', { name: 'Peolwane AI' }))
    await user.click(screen.getByRole('button', { name: 'Text' }))
    const input = screen.getByRole('textbox', { name: 'Your question' })
    expect(input).toHaveFocus()
    await user.type(input, 'Where is my receipt?{Enter}')
    expect(await screen.findByText('Your receipt is on the idea page.')).toBeInTheDocument()
    expect(screen.getByText('Where is my receipt?')).toBeInTheDocument()
    expect(input).toHaveValue('')
    expect(fetchMock).toHaveBeenCalledTimes(1) // chat only: no /api/speak in text mode
    expect(getState().status).toBe('idle')
  })

  it('shows a failed answer as an alert and keeps the question', async () => {
    fetchMock.mockResolvedValue(new Response('busy', { status: 429 }))
    const user = renderAssistant()
    await user.click(screen.getByRole('button', { name: 'Peolwane AI' }))
    await user.click(screen.getByRole('button', { name: 'Text' }))
    await user.type(screen.getByRole('textbox', { name: 'Your question' }), 'Hello{Enter}')
    expect(await screen.findByRole('alert')).toHaveTextContent('Peolwane AI is busy. Wait a moment and try again.')
    expect(screen.getByText('Hello')).toBeInTheDocument()
  })

  it('falls back to text, saying why, when the browser cannot record', async () => {
    vi.stubGlobal('MediaRecorder', undefined)
    const user = renderAssistant()
    await user.click(screen.getByRole('button', { name: 'Peolwane AI' }))
    await user.click(screen.getByRole('button', { name: 'Start speaking' }))
    expect(await screen.findByRole('alert')).toHaveTextContent("Voice isn't available in this browser.")
    expect(screen.getByRole('button', { name: 'Text' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('in voice mode, speaks the answer and is idle again when the audio ends', async () => {
    fetchMock.mockImplementation(async (url: string) =>
      url.endsWith('/api/chat') ? streamed(['Sure.']) : new Response(new Uint8Array([1, 2, 3]), { status: 200 }),
    )
    const played: FakeAudio[] = []
    class FakeAudio {
      onended: (() => void) | null = null
      onerror: (() => void) | null = null
      constructor(readonly src: string) {
        played.push(this)
      }
      play = vi.fn(async () => {})
      pause = vi.fn()
    }
    vi.stubGlobal('Audio', FakeAudio)
    vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: vi.fn(() => 'blob:reply'), revokeObjectURL: vi.fn() }))
    act(() => setOpen(true))
    await act(() => sendQuestion(CFG, 'Hi', 'voice'))
    expect(fetchMock.mock.calls.map((c) => c[0])).toEqual(['https://engine.example/api/chat', 'https://engine.example/api/speak'])
    expect(JSON.parse(fetchMock.mock.calls[1]![1].body)).toEqual({ text: 'Sure.', language: 'english' })
    expect(played).toHaveLength(1)
    expect(played[0]!.src).toBe('blob:reply')
    expect(getState().status).toBe('speaking')
    act(() => played[0]!.onended?.())
    expect(getState().status).toBe('idle')
    expect(getState().error).toBeNull()
  })
})

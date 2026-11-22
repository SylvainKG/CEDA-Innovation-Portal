import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { dismissSplash, SPLASH_ID } from './splash'

function addSplash() {
  const el = document.createElement('div')
  el.id = SPLASH_ID
  document.body.append(el)
  return el
}

beforeEach(() => vi.useFakeTimers())
afterEach(() => {
  vi.useRealTimers()
  document.getElementById(SPLASH_ID)?.remove()
})

describe('loading splash', () => {
  it('stays at least 1.8 s from page start, then fades out and is removed', () => {
    const el = addSplash()
    dismissSplash({ now: () => 200, reducedMotion: false })
    vi.advanceTimersByTime(1599)
    expect(el).not.toHaveClass('pw-splash--out')
    vi.advanceTimersByTime(1)
    expect(el).toHaveClass('pw-splash--out')
    expect(el).toHaveAttribute('aria-hidden', 'true')
    vi.advanceTimersByTime(499)
    expect(document.getElementById(SPLASH_ID)).toBe(el)
    vi.advanceTimersByTime(1)
    expect(document.getElementById(SPLASH_ID)).toBeNull()
  })

  it('leaves at once when the app took longer than the minimum', () => {
    const el = addSplash()
    dismissSplash({ now: () => 3000, reducedMotion: false })
    vi.advanceTimersByTime(0)
    expect(el).toHaveClass('pw-splash--out')
  })

  it('reduced motion: a short minimum and a quick fade', () => {
    const el = addSplash()
    dismissSplash({ now: () => 100, reducedMotion: true })
    vi.advanceTimersByTime(299)
    expect(el).not.toHaveClass('pw-splash--out')
    vi.advanceTimersByTime(1)
    expect(el).toHaveClass('pw-splash--out')
    vi.advanceTimersByTime(200)
    expect(document.getElementById(SPLASH_ID)).toBeNull()
  })

  it('does nothing when there is no splash', () => {
    expect(() => dismissSplash({ now: () => 0, reducedMotion: false })).not.toThrow()
    vi.runAllTimers()
  })
})

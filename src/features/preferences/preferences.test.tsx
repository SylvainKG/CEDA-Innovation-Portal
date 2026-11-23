import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import { AccessibilitySettingsButton, CookiePreferencesButton } from './PreferenceDialogs'
import {
  A11Y_KEY,
  applyA11y,
  COOKIES_KEY,
  DEFAULT_A11Y,
  loadA11y,
  loadCookiePrefs,
  prefersReducedMotion,
  saveA11y,
  saveCookiePrefs,
} from './settings'

const root = () => document.documentElement

beforeEach(() => {
  window.localStorage.clear()
  window.sessionStorage.clear()
  applyA11y(DEFAULT_A11Y)
})

describe('accessibility settings and cookie preferences (storage)', () => {
  it('starts from the defaults, and ignores corrupt or unknown saved values', () => {
    expect(loadA11y()).toEqual(DEFAULT_A11Y)
    expect(loadCookiePrefs()).toEqual({ rememberPreferences: false })
    window.sessionStorage.setItem(A11Y_KEY, '{not json')
    expect(loadA11y()).toEqual(DEFAULT_A11Y)
    window.sessionStorage.setItem(A11Y_KEY, JSON.stringify({ textSize: 'huge', highContrast: 'yes' }))
    expect(loadA11y()).toEqual(DEFAULT_A11Y)
  })

  it('sets one class on <html> per setting', () => {
    applyA11y({ textSize: 'larger', highContrast: true, reduceMotion: true, underlineLinks: true })
    expect([...root().classList]).toEqual(expect.arrayContaining(['a11y-text-larger', 'a11y-contrast', 'a11y-reduce-motion', 'a11y-underline']))
    expect(root().classList.contains('a11y-text-large')).toBe(false)
    expect(prefersReducedMotion()).toBe(true)
    applyA11y(DEFAULT_A11Y)
    expect([...root().classList].filter((c) => c.startsWith('a11y-'))).toEqual([])
  })

  it('keeps settings for this visit only, until preference storage is allowed; then on this device', () => {
    const big = { ...DEFAULT_A11Y, textSize: 'large' as const }
    saveA11y(big)
    expect(window.sessionStorage.getItem(A11Y_KEY)).not.toBeNull()
    expect(window.localStorage.getItem(A11Y_KEY)).toBeNull()

    saveCookiePrefs({ rememberPreferences: true })
    expect(JSON.parse(window.localStorage.getItem(COOKIES_KEY)!)).toEqual({ rememberPreferences: true })
    expect(JSON.parse(window.localStorage.getItem(A11Y_KEY)!)).toEqual(big)
    expect(window.sessionStorage.getItem(A11Y_KEY)).toBeNull()

    saveCookiePrefs({ rememberPreferences: false })
    expect(window.localStorage.getItem(A11Y_KEY)).toBeNull()
    expect(loadA11y()).toEqual(big)
  })
})

describe('footer dialogs', () => {
  it('Accessibility settings: changes apply at once, Escape closes, focus returns, reset clears them', async () => {
    const user = userEvent.setup()
    render(<AccessibilitySettingsButton className="" />)
    const open = screen.getByRole('button', { name: 'Accessibility settings' })
    await user.click(open)
    const dialog = screen.getByRole('dialog', { name: 'Accessibility settings' })

    await user.click(within(dialog).getByRole('radio', { name: 'Larger (125%)' }))
    await user.click(within(dialog).getByRole('checkbox', { name: 'High contrast' }))
    expect(root().classList.contains('a11y-text-larger')).toBe(true)
    expect(root().classList.contains('a11y-contrast')).toBe(true)
    expect(loadA11y()).toMatchObject({ textSize: 'larger', highContrast: true })
    expect(within(dialog).getByText(/last for this visit/)).toBeInTheDocument()

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(open).toHaveFocus()

    await user.click(open)
    await user.click(screen.getByRole('button', { name: 'Reset to defaults' }))
    expect([...root().classList].filter((c) => c.startsWith('a11y-'))).toEqual([])
    expect(screen.getByRole('radio', { name: 'Default' })).toBeChecked()
  })

  it('Cookie preferences: necessary storage is always on, analytics is not used, and remembering is the one choice', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <CookiePreferencesButton className="" />
      </MemoryRouter>,
    )
    await user.click(screen.getByRole('button', { name: 'Cookie preferences' }))
    const dialog = screen.getByRole('dialog', { name: 'Cookie preferences' })
    expect(within(dialog).getByText(/no advertising or analytics cookies/)).toBeInTheDocument()
    const analytics = within(dialog).getByRole('checkbox', { name: 'Analytics and advertising cookies' })
    expect(analytics).toBeDisabled()
    expect(analytics).not.toBeChecked()

    const remember = within(dialog).getByRole('checkbox', { name: 'Remember my accessibility settings on this device' })
    expect(remember).not.toBeChecked()
    await user.click(remember)
    expect(loadCookiePrefs()).toEqual({ rememberPreferences: true })
    expect(within(dialog).getByRole('link', { name: 'privacy notice' })).toHaveAttribute('href', '/privacy')
  })
})

/**
 * Accessibility settings and cookie preferences (footer: "Accessibility settings", "Cookie preferences").
 *
 * The portal sets no analytics or advertising cookies. What it keeps in the browser:
 * - strictly necessary: the sign-in session and the cookie choice itself (always on);
 * - preference storage (the one real choice): whether accessibility settings are remembered on this device
 *   (localStorage) or only for this visit (sessionStorage, cleared when the tab closes). Off until the person allows it.
 *
 * Accessibility settings are applied as classes on <html> (styles in src/styles/index.css), before the app renders.
 */
export type TextSize = 'default' | 'large' | 'larger'

export interface A11ySettings {
  textSize: TextSize
  highContrast: boolean
  reduceMotion: boolean
  underlineLinks: boolean
}

export interface CookiePrefs {
  /** Remember accessibility settings on this device. */
  rememberPreferences: boolean
}

export const DEFAULT_A11Y: A11ySettings = { textSize: 'default', highContrast: false, reduceMotion: false, underlineLinks: false }
export const DEFAULT_COOKIES: CookiePrefs = { rememberPreferences: false }

export const A11Y_KEY = 'peolwane.a11y'
export const COOKIES_KEY = 'peolwane.cookie-preferences'

const CLASS = {
  large: 'a11y-text-large',
  larger: 'a11y-text-larger',
  contrast: 'a11y-contrast',
  motion: 'a11y-reduce-motion',
  underline: 'a11y-underline',
} as const

function store(kind: 'local' | 'session'): Storage | null {
  try {
    return kind === 'local' ? window.localStorage : window.sessionStorage
  } catch {
    return null // storage blocked (private mode, sandboxed frame): settings then last until reload
  }
}

function read<T>(storage: Storage | null, key: string): Partial<T> | null {
  try {
    const raw = storage?.getItem(key)
    if (!raw) return null
    const value: unknown = JSON.parse(raw)
    return value && typeof value === 'object' ? (value as Partial<T>) : null
  } catch {
    return null
  }
}

function write(storage: Storage | null, key: string, value: unknown) {
  try {
    storage?.setItem(key, JSON.stringify(value))
  } catch {
    /* full or blocked: the setting still applies to this page */
  }
}

function remove(storage: Storage | null, key: string) {
  try {
    storage?.removeItem(key)
  } catch {
    /* blocked */
  }
}

function clean(s: Partial<A11ySettings> | null): A11ySettings {
  const size = s?.textSize
  return {
    textSize: size === 'large' || size === 'larger' ? size : 'default',
    highContrast: s?.highContrast === true,
    reduceMotion: s?.reduceMotion === true,
    underlineLinks: s?.underlineLinks === true,
  }
}

export function loadCookiePrefs(): CookiePrefs {
  const saved = read<CookiePrefs>(store('local'), COOKIES_KEY)
  return { rememberPreferences: saved?.rememberPreferences === true }
}

/** Saves the cookie choice and moves the accessibility settings to the matching storage. */
export function saveCookiePrefs(prefs: CookiePrefs) {
  const current = loadA11y()
  write(store('local'), COOKIES_KEY, prefs)
  if (prefs.rememberPreferences) {
    write(store('local'), A11Y_KEY, current)
    remove(store('session'), A11Y_KEY)
  } else {
    write(store('session'), A11Y_KEY, current)
    remove(store('local'), A11Y_KEY)
  }
}

export function loadA11y(): A11ySettings {
  return clean(read<A11ySettings>(store('local'), A11Y_KEY) ?? read<A11ySettings>(store('session'), A11Y_KEY))
}

export function saveA11y(settings: A11ySettings) {
  const remember = loadCookiePrefs().rememberPreferences
  write(store(remember ? 'local' : 'session'), A11Y_KEY, settings)
  if (!remember) remove(store('local'), A11Y_KEY)
}

export function applyA11y(settings: A11ySettings, root: HTMLElement = document.documentElement) {
  root.classList.toggle(CLASS.large, settings.textSize === 'large')
  root.classList.toggle(CLASS.larger, settings.textSize === 'larger')
  root.classList.toggle(CLASS.contrast, settings.highContrast)
  root.classList.toggle(CLASS.motion, settings.reduceMotion)
  root.classList.toggle(CLASS.underline, settings.underlineLinks)
}

/** True when the system asks for reduced motion or the person turned it on in Accessibility settings. */
export function prefersReducedMotion(): boolean {
  if (typeof document !== 'undefined' && document.documentElement.classList.contains(CLASS.motion)) return true
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

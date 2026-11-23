import * as RadixDialog from '@radix-ui/react-dialog'
import { Accessibility, Cookie, X } from 'lucide-react'
import { useId, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/Button'
import {
  applyA11y,
  DEFAULT_A11Y,
  loadA11y,
  loadCookiePrefs,
  saveA11y,
  saveCookiePrefs,
  type A11ySettings,
  type TextSize,
} from './settings'

/**
 * A side sheet opened from a footer button (same pattern as the toolkit preview): Radix with a Trigger, so Escape
 * closes it, focus stays inside and returns to the button. Full screen on phones, a sheet on the right from 768 px.
 */
function Sheet({ label, icon, triggerClassName, title, intro, onOpen, children }: { label: string; icon: ReactNode; triggerClassName: string; title: string; intro: string; onOpen?: () => void; children: ReactNode }) {
  return (
    <RadixDialog.Root onOpenChange={(open) => (open ? onOpen?.() : undefined)}>
      <RadixDialog.Trigger asChild>
        <button type="button" className={triggerClassName}>
          {icon}
          {label}
        </button>
      </RadixDialog.Trigger>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="fixed inset-0 z-40 bg-black/40" />
        <RadixDialog.Content className="fixed inset-0 z-50 flex flex-col bg-surface-card text-ink shadow-2 md:inset-y-0 md:left-auto md:right-0 md:w-full md:max-w-[480px]">
          <div className="flex items-start justify-between gap-4 border-b border-line bg-[var(--ceda-surface-warm)] p-5 sm:p-6">
            <RadixDialog.Title className="text-h3 font-semibold">{title}</RadixDialog.Title>
            <RadixDialog.Close asChild>
              <button type="button" aria-label="Close" className="inline-flex min-h-touch min-w-touch items-center justify-center rounded-full border border-line bg-surface-card hover:bg-surface-sunken">
                <X aria-hidden className="h-5 w-5" />
              </button>
            </RadixDialog.Close>
          </div>
          <RadixDialog.Description className="border-b border-line bg-brand-subtle px-5 py-3 text-sm sm:px-6">{intro}</RadixDialog.Description>
          <div className="flex flex-1 flex-col gap-6 overflow-y-auto p-5 sm:p-6">{children}</div>
          <div className="flex justify-end border-t border-line p-5 sm:p-6">
            <RadixDialog.Close asChild>
              <Button>Done</Button>
            </RadixDialog.Close>
          </div>
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  )
}

function Toggle({ checked, onChange, label, hint, disabled = false }: { checked: boolean; onChange?: (next: boolean) => void; label: string; hint: string; disabled?: boolean }) {
  const id = useId()
  return (
    <div className="flex items-start gap-3">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange?.(e.target.checked)}
        aria-describedby={`${id}-hint`}
        className="mt-1 h-5 w-5 shrink-0 accent-[var(--brand-primary-text)]"
      />
      <div className="flex flex-col">
        <label htmlFor={id} className="font-semibold">
          {label}
        </label>
        <span id={`${id}-hint`} className="text-sm text-ink-muted">
          {hint}
        </span>
      </div>
    </div>
  )
}

const SIZES: { value: TextSize; label: string }[] = [
  { value: 'default', label: 'Default' },
  { value: 'large', label: 'Large (112%)' },
  { value: 'larger', label: 'Larger (125%)' },
]

/** Footer button and sheet: text size, high contrast, reduced motion, underlined links. Changes apply at once. */
export function AccessibilitySettingsButton({ className }: { className: string }) {
  const [settings, setSettings] = useState<A11ySettings>(() => loadA11y())
  const [remembered, setRemembered] = useState(() => loadCookiePrefs().rememberPreferences)
  const nameId = useId()
  const update = (next: A11ySettings) => {
    setSettings(next)
    applyA11y(next)
    saveA11y(next)
  }
  return (
    <Sheet
      label="Accessibility settings"
      icon={<Accessibility aria-hidden className="h-4 w-4 shrink-0 text-[var(--ceda-gold)]" />}
      triggerClassName={className}
      title="Accessibility settings"
      intro="Changes apply straight away, on every page. Your browser's and device's own settings keep working alongside these."
      onOpen={() => {
        setSettings(loadA11y())
        setRemembered(loadCookiePrefs().rememberPreferences)
      }}
    >
      <fieldset className="flex flex-col gap-2">
        <legend id={nameId} className="mb-1 font-semibold">
          Text size
        </legend>
        {SIZES.map((s) => (
          <label key={s.value} className="flex min-h-touch items-center gap-3">
            <input
              type="radio"
              name={nameId}
              value={s.value}
              checked={settings.textSize === s.value}
              onChange={() => update({ ...settings, textSize: s.value })}
              className="h-5 w-5 accent-[var(--brand-primary-text)]"
            />
            {s.label}
          </label>
        ))}
      </fieldset>
      <fieldset className="flex flex-col gap-4">
        <legend className="mb-1 font-semibold">Display</legend>
        <Toggle label="High contrast" hint="Darker text and borders, and a thicker focus outline." checked={settings.highContrast} onChange={(v) => update({ ...settings, highContrast: v })} />
        <Toggle label="Reduce motion" hint="Turns off page transitions and other animations." checked={settings.reduceMotion} onChange={(v) => update({ ...settings, reduceMotion: v })} />
        <Toggle label="Underline all links" hint="Makes every link stand out from the text around it." checked={settings.underlineLinks} onChange={(v) => update({ ...settings, underlineLinks: v })} />
      </fieldset>
      <div className="flex flex-col gap-3 rounded-md bg-surface-sunken p-4 text-sm">
        <p>
          {remembered
            ? 'These settings are remembered on this device.'
            : 'These settings last for this visit. To keep them next time, allow preference storage in Cookie preferences.'}
        </p>
        <Button variant="secondary" className="self-start" onClick={() => update(DEFAULT_A11Y)}>
          Reset to defaults
        </Button>
      </div>
    </Sheet>
  )
}

/** Footer button and sheet: what the portal keeps in the browser, and the one choice (remember preferences). */
export function CookiePreferencesButton({ className }: { className: string }) {
  const [remember, setRemember] = useState(() => loadCookiePrefs().rememberPreferences)
  const change = (next: boolean) => {
    setRemember(next)
    saveCookiePrefs({ rememberPreferences: next })
  }
  return (
    <Sheet
      label="Cookie preferences"
      icon={<Cookie aria-hidden className="h-4 w-4 shrink-0 text-[var(--ceda-gold)]" />}
      triggerClassName={className}
      title="Cookie preferences"
      intro="Peolwane uses no advertising or analytics cookies. This is everything it keeps in your browser, and the choice you have."
      onOpen={() => setRemember(loadCookiePrefs().rememberPreferences)}
    >
      <section aria-labelledby="cookies-necessary" className="flex flex-col gap-2">
        <h3 id="cookies-necessary" className="font-semibold">
          Strictly necessary · always on
        </h3>
        <p className="text-sm">
          Your sign-in session, kept in this browser so you stay signed in, and the choice you make on this page. The portal cannot work without them, so
          they can&apos;t be turned off. Signing out removes the session.
        </p>
      </section>
      <section aria-labelledby="cookies-preferences" className="flex flex-col gap-3">
        <h3 id="cookies-preferences" className="font-semibold">
          Preferences · your choice
        </h3>
        <Toggle
          label="Remember my accessibility settings on this device"
          hint="When this is off, your accessibility settings last only until you close the tab."
          checked={remember}
          onChange={change}
        />
      </section>
      <section aria-labelledby="cookies-session" className="flex flex-col gap-2">
        <h3 id="cookies-session" className="font-semibold">
          While you use Peolwane AI
        </h3>
        <p className="text-sm">The assistant keeps the current conversation in this tab&apos;s session storage so it survives a reload. It clears when the tab closes.</p>
      </section>
      <section aria-labelledby="cookies-none" className="flex flex-col gap-2">
        <h3 id="cookies-none" className="font-semibold">
          Analytics and advertising · not used
        </h3>
        <Toggle label="Analytics and advertising cookies" hint="Peolwane does not set any, so there is nothing to allow." checked={false} disabled />
      </section>
      <p className="text-sm">
        More in the{' '}
        <RadixDialog.Close asChild>
          <Link to="/privacy">privacy notice</Link>
        </RadixDialog.Close>
        , including your rights under the Data Protection Act, 2024.
      </p>
    </Sheet>
  )
}

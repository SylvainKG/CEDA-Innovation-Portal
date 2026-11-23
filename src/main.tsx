import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { dismissSplash } from '@/brand/splash'
import { applyA11y, loadA11y } from '@/features/preferences/settings'
import '@/styles/index.css'

// Accessibility settings (footer) apply before the first paint, so a reload never flashes the default look.
applyA11y(loadA11y())

const rootElement = document.getElementById('root')
if (!rootElement) throw new Error('Root element #root not found in index.html')
const root = createRoot(rootElement)

// The app is loaded dynamically so a configuration error (for example VITE_API_MODE not set in a
// production build) shows a clear message instead of a blank page.
import('./App')
  .then(({ App }) => {
    root.render(
      <StrictMode>
        <App />
      </StrictMode>,
    )
    requestAnimationFrame(() => dismissSplash())
  })
  .catch((error: unknown) => {
    console.error(error)
    root.render(
      <main className="mx-auto flex max-w-form flex-col gap-3 p-8">
        <h1 className="text-h1 font-bold">This site isn't configured</h1>
        <p>The portal couldn't start because its build settings are incomplete. Please tell the team that deployed it.</p>
        <p className="text-sm text-ink-muted">{error instanceof Error ? error.message : 'Unknown configuration error.'}</p>
      </main>,
    )
    requestAnimationFrame(() => dismissSplash())
  })

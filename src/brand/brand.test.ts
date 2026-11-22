import { describe, expect, it } from 'vitest'
import indexHtml from '/index.html?raw'
import { ACTIVE, BRANDS, brand } from '.'

/**
 * Guards a brand change (docs/design/brand.md): the parts outside src/brand must follow the ACTIVE line, or a
 * half-done swap would ship the old favicon or page title. Files are read through Vite (`?raw`), so the app's
 * browser-only TypeScript settings stay as they are.
 */
const served = import.meta.glob<string>('/public/*.{ico,png}', { query: '?raw', import: 'default', eager: true })
const kept = import.meta.glob<string>('/src/brand/*/icons/*', { query: '?raw', import: 'default', eager: true })
const marks = import.meta.glob<string>('/src/brand/*/mark.svg', { query: '?raw', import: 'default', eager: true })
const ICONS = ['favicon.ico', 'favicon-32.png', 'apple-touch-icon.png']

describe('brand', () => {
  it('uses the brand that ACTIVE names', () => {
    expect(brand).toBe(BRANDS[ACTIVE])
    expect(brand.id).toBe(ACTIVE)
  })

  it.each(ICONS)('public/%s is the active brand’s icon (copy it from src/brand/<brand>/icons/)', (file) => {
    const expected = kept[`/src/brand/${brand.id}/icons/${file}`]
    expect(expected).toBeDefined()
    expect(served[`/public/${file}`] === expected).toBe(true)
  })

  it('the page title in index.html is the active brand’s full name', () => {
    expect(indexHtml).toContain(`<title>${brand.fullName}</title>`)
  })

  it('index.html shows the loading splash of the active brand', () => {
    expect(indexHtml).toContain(`id="pw-splash" class="pw-splash" data-brand="${brand.id}"`)
    // Outside #root, so React's first render doesn't wipe it before its exit (src/brand/splash.ts).
    expect(indexHtml).toContain('<div id="root"></div>')
    expect(indexHtml).toContain('role="status"')
    expect(indexHtml).toContain('prefers-reduced-motion')
    expect(indexHtml.match(/<script\b/g)).toHaveLength(1)
  })

  it('the splash draws the brand’s vector mark exactly', () => {
    const mark = marks[`/src/brand/${brand.id}/mark.svg`]
    if (mark === undefined) return

    const paths = Array.from(mark.matchAll(/\bd="([^"]+)"/g), (match) => match[1]).filter(
      (path): path is string => path !== undefined,
    )
    for (const path of paths) {
      expect(indexHtml).toContain(`d="${path}"`)
    }
  })

  it('every brand keeps its three icons, so switching back is a copy', () => {
    for (const id of Object.keys(BRANDS)) for (const file of ICONS) expect(kept[`/src/brand/${id}/icons/${file}`]).toBeDefined()
  })
})

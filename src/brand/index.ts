import cedaLogo from '@/assets/ceda-logo.png'
import peolwaneLogo from './peolwane/logo.png'
import peolwaneMark from './peolwane/mark.png'

/**
 * The portal's brand: every logo, name and tagline the screens show comes from here, so changing the brand is
 * one line (ACTIVE below) plus the steps in docs/design/brand.md (favicons and the page title, which a test
 * checks). Screens never import a logo file directly.
 */

export interface BrandImage {
  src: string
  /** Intrinsic size, so the browser reserves space before the image loads (no layout shift). */
  width: number
  height: number
}

export interface Brand {
  /** Folder under src/brand/ that holds this brand's icons. */
  id: 'ceda' | 'peolwane'
  /** Full name: the header link's accessible name, alt text and the page title. */
  fullName: string
  /** Text beside the mark in the header from 768 px (phones show the mark alone). */
  header: { title: string; subtitle?: string }
  tagline: string
  /** Emblem for small places: header, auth cards, home hero, printed receipt. */
  mark: BrandImage
  /** Full lockup (emblem, name and tagline) for large spaces. */
  logo: BrandImage
}

export const BRANDS = {
  ceda: {
    id: 'ceda',
    fullName: 'CEDA Innovation Portal',
    // The CEDA logo carries the name, so the header text adds only what it is.
    header: { title: 'Innovation Portal' },
    tagline: 'Advancing Botswana through innovation',
    mark: { src: cedaLogo, width: 1432, height: 900 },
    logo: { src: cedaLogo, width: 1432, height: 900 },
  },
  peolwane: {
    id: 'peolwane',
    fullName: 'Peolwane · CEDA Innovation Portal',
    header: { title: 'Peolwane', subtitle: 'CEDA Innovation Portal' },
    tagline: 'Where Ideas Take Flight.',
    // From the team's concept PDF (Option 1, 21 Nov 2026): raster, background removed. Replace with the vector
    // file when there is one (docs/design/brand.md).
    // Mark at 320 px wide: sharp at the largest size shown (64 px tall) on high-density screens, about 50 kB.
    mark: { src: peolwaneMark, width: 320, height: 272 },
    logo: { src: peolwaneLogo, width: 608, height: 744 },
  },
} as const satisfies Record<string, Brand>

/**
 * The brand in use. To change brand, change this one line and follow docs/design/brand.md.
 * Peolwane, as the team agreed (21 Nov 2026); CEDA stays one line away.
 */
export const ACTIVE: keyof typeof BRANDS = 'peolwane'

export const brand: Brand = BRANDS[ACTIVE]

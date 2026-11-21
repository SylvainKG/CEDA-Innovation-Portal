# Brand: logo, name and how to change them

**Owner:** ABM · **Updated:** 21 Nov 2026 · **Active brand:** Peolwane · CEDA Innovation Portal, as the team agreed. Switching back to CEDA is the steps below.

Every logo, name and tagline the portal shows comes from one file, `src/brand/index.ts`. Screens never import a logo file directly. A test (`src/brand/brand.test.ts`) fails if the favicons or the page title don't match the active brand, so a half-done change can't ship.

## Where the brand appears

| Place | What it shows | From |
|---|---|---|
| Header, every page | Mark, plus the name and subtitle from 768 px. Phones show the mark only, and screen readers always hear the full name | `brand.mark`, `brand.header`, `brand.fullName` |
| Sign-in and register cards | Mark (decorative) | `brand.mark` |
| Home page hero and its picture frame | Mark | `brand.mark` |
| Printed receipt | Mark, named for screen readers | `brand.mark`, `brand.fullName` |
| Browser tab and home-screen icon | Favicons | `public/favicon.ico`, `public/favicon-32.png`, `public/apple-touch-icon.png` |
| Page title and description | Full name | `index.html` |

The footer, the judge guide and other documents name the "CEDA Innovation Portal" in words. That stays true under either brand.

## Switch between the brands we have (CEDA or Peolwane)

1. In `src/brand/index.ts`, change `ACTIVE` to `'ceda'` or `'peolwane'`.
2. Copy the three files from `src/brand/<brand>/icons/` into `public/`, replacing the ones there.
3. In `index.html`, set `<title>` (and the description) to that brand's `fullName`.
4. Run `npm run test`. The brand test names anything still missing.

## Replace the Peolwane artwork (for example with a vector file)

1. Save the new files over `src/brand/peolwane/mark.png` (emblem only) and `src/brand/peolwane/logo.png` (full lockup), with transparent backgrounds. An SVG works too: change the two imports in `src/brand/index.ts` to the `.svg` files.
2. Update `width` and `height` for each image in `src/brand/index.ts` to the new files' sizes (for an SVG, its `viewBox` size).
3. Make new favicons from the mark (48 px `favicon.ico`, 32 px `favicon-32.png`, 180 px `apple-touch-icon.png` on white). Put them in `src/brand/peolwane/icons/` and copy them into `public/`.
4. Run `npm run test`, then check the header, sign-in, home page and a printed receipt at 360 and 1280 px.

## Add a new brand

Add a folder `src/brand/<id>/` with `mark`, `logo` and `icons/`. Add an entry to `BRANDS` in `src/brand/index.ts` (and its id to `Brand['id']`), then follow "Switch between the brands" above.

## Sources

| Brand | Artwork | Notes |
|---|---|---|
| CEDA | `src/assets/ceda-logo.png`, CEDA's official logo, upscaled from the supplied 447 px PNG | Kept so the portal can switch back. Replace with CEDA's vector file when available |
| Peolwane | Team concept "CEDA Innovation Portal / Brand concepts", Option 1 (PDF, 21 Nov 2026). Raster 728 × 840 px; background removed and the emblem cut out for the mark and favicons | **[confirm at release]** who made the artwork, with which tool, and its licence. Also the CIPA name search. Replace with a vector file when there is one |

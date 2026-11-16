# Design tokens

**Maintained by:** Sandra · **Consumer:** Obvious (Tailwind theme / `tokens.json`) · **Last updated:** 16 Nov 2026 (TASK-01 first pass)

**Rule (D-32):**
- Where the existing Figma file defines a value, **Figma wins**: fill in its *Figma variable* and *Value*.
- Where it defines nothing, the placeholder from `02-figma-ui-ux-spec.md` §3 stays, and *Source* says `placeholder`.
- CEDA brand guidance, when received, replaces both (D-04).

The code token names are fixed so implementation can start now. Only values change.

**Where the "Figma" values come from:** the design source is a Figma Make prototype, which has no Figma variables. Values below were read from its stylesheet (`src/index.css`, CSS custom properties and repeated literals) and are marked `Figma (Make CSS)`. Contrast ratios were calculated with the WCAG 2 formula.

> **Two values fail the project's own contrast targets** (spec §3.1: text ≥ 4.5:1, UI ≥ 3:1) and should not be built as they are. Proposed fixes are listed under *Open fixes*; they need team approval because they touch existing branding (D-39, handoff-notes #1, #9).

## Colour

| Code token | Figma variable | Value | Source (Figma / placeholder) | Use |
|---|---|---|---|---|
| `brand-primary` | `--orange` | `#F58220` | Figma (Make CSS) | Primary buttons, active nav, links, focus border. **White text on it = 2.59:1 (fails)**; as text on white = 2.59:1 (fails) |
| `brand-primary-hover` | `--orange-dark` | `#D96508` | Figma (Make CSS) | Hover/pressed. 3.61:1 on white |
| `brand-primary-subtle` *(new)* | `--orange-pale` | `#FFF3E9` | Figma (Make CSS) | Active nav background, in-progress badge background, focus halo |
| `brand-accent` | `--gold` | `#F9C51C` | Figma (Make CSS) | Shortlisted/selected, highlights. Decorative only (fails as text) |
| `brand-accent-subtle` *(new)* | `--gold-pale` | `#FFF9DC` | Figma (Make CSS) | Gold badge background |
| `surface-page` | `--bg` | `#F7F7F5` | Figma (Make CSS) | Page background |
| `surface-card` | — | `#FFFFFF` | Figma (Make CSS) | Cards, tables, dialogs |
| `surface-sunken` | — (literal) | `#FAF9F7` | Figma (Make CSS) | Table header, read-only areas |
| `text-primary` | `--ink` | `#333333` | Figma (Make CSS) | Body text. 12.63:1 on white ✓ |
| `text-secondary` | `--muted` | `#727272` | Figma (Make CSS) | Help text, metadata. 4.81:1 ✓ — but `#888`, `#999` and `#AAA` are also used for text and fail (see contrast table) |
| `border-default` | `--line` | `#E6E3DF` | Figma (Make CSS) | Cards, dividers. Inputs use `#DCD9D5` |
| `focus-ring` | — | `#1A73E8` | placeholder | Make removes outlines on search and filters and has no visible focus there. Keep the placeholder until a branded ring is approved |
| `feedback-error` | `--red` | `#E53935` | Figma (Make CSS) | Errors, destructive button (white on it 4.23:1: passes UI, fails small text) |
| `feedback-error-subtle` *(new)* | `--red-pale` | `#FFF0EF` | Figma (Make CSS) | Error badge background |
| `feedback-success` | — (literal) | `#3F7650` text / `#5A9B6E` dot | Figma (Make CSS) | Completed / available |
| `feedback-warning` | — | `#B54708` | placeholder | Make has no warning colour distinct from orange |
| `demo` | — | `#6941C6` | placeholder | DEMO badge, Sample labels (none in Make) |

**Status colours.** Make draws badges as a pill with a coloured dot + text (no icon). It defines four tones only, and several blueprint statuses have no tone yet.

| Code token | Figma variable | Background | Text | Source |
|---|---|---|---|---|
| `status-draft` | `.status` default | `#F3F2EF` | `#6E6E6E` (4.55:1) | Figma (Make CSS) |
| `status-submitted` | `.status-submitted` | `#FFF3E9` | `#B65C0E` (4.25:1, fails at 8 px) | Figma (Make CSS) |
| `status-review` | `.status-under-evaluation` | `#FFF3E9` | `#B65C0E` | Figma (Make CSS). Same tone as Submitted, so the two can't be told apart by colour |
| `status-action-required` | `.status-feedback-requested` | `#FFF0EF` | `#B42C28` (5.69:1) | Figma (Make CSS). Red reads as an error; spec uses amber |
| `status-approved` | `.status-completed` (nearest) | `#EDF7F0` | `#3F7650` (4.89:1) | Figma (Make CSS), reused |
| `status-closed` | — | `#F2F4F7` | `#344054` | placeholder |
| `status-awarded` | `.status-selected` (nearest) | `#FFF9DC` | `#7E6500` (5.29:1) | Figma (Make CSS), reused |

## Typography

Make uses **Inter** (Google Fonts, weights 400/500/600/700/800) with no system fallback declared, and **25 distinct font sizes**. Most of the UI is set at 7–10 px (about 140 rules): table text 10 px, table headers 8 px, inputs 10 px, badges 8 px, helper text 9 px.

| Code token | Figma style | Size / line height / weight | Source |
|---|---|---|---|
| `font-family` | `:root` | Inter, add `system-ui` fallback | Figma (Make CSS) |
| `type-display` | `.hero h1` | 64 / 1.07, 800 (public home only) | Figma (Make CSS) |
| `type-h1` | `.page-header h1` | 26 / 1.3, 700 | Figma (Make CSS) — matches spec |
| `type-h2` | `.panel-head h2` | 14, 700 | Figma (Make CSS). Spec 20/28 |
| `type-h3` | — | 17/24, 600 | placeholder |
| `type-body` | `td`, `.page-header p` | **10–11 px** | Figma (Make CSS). **Below the spec minimum (16/24). Do not build at this size** |
| `type-small` | `.panel-head p`, `th`, `.status` | **8–9 px** | Figma (Make CSS). **Below the spec minimum (14/20)** |
| `type-mono` | — | 14/20 | placeholder (references use Inter at 8–11 px) |
| Button label | `.button` | 13, 700 | Figma (Make CSS) |

## Space, shape, layout

| Code token | Figma variable | Value | Source |
|---|---|---|---|
| `space-*` | — | 4, 8, 12, 16, 24, 32, 48, 64 px | placeholder (Make spacing is ad hoc: 9, 11, 17, 34 px etc.) |
| `radius-sm / md / pill` | — | Make uses 3, 4, 5, 6, 7, 8, 9, 10, 12, 20 px. Most common: 5, 8/9, 20 (pill) | Figma (Make CSS), needs consolidating |
| `shadow-1 / shadow-2` | — | Cards are flat with 1 px border; modal `0 20px 80px #0003`; primary button `0 3px 10px #F5822030` | Figma (Make CSS) |
| Breakpoints | `@media` | Make: 1100 / 820 / 520 px. Spec: 360 / 768 / 1024 / 1280 | Figma (Make CSS) vs placeholder — use spec values for frames |
| Shell | `.sidebar`, `.topbar` | Sidebar 246 px; top bar 74 px; content padding 34 px, max width 1600 px | Figma (Make CSS). Spec: 240 px sidebar, 1200 px content |
| Content / form max width | — | 1200 / 720 px | placeholder |
| Controls | `.button`, `.field-grid input` | Button min-height 42 px; input height 40 px | Figma (Make CSS). Spec touch target ≥ 44 px |
| Icon set | inline SVG in `Icon()` | Custom stroke icons, 20 px default; several icon-only buttons | Figma (Make CSS). Spec: Lucide, always with a label |

## Contrast checks

| Foreground / background | Ratio | Pass (text ≥ 4.5:1, UI ≥ 3:1) | Checked by, date |
|---|---|---|---|
| `#FFFFFF` on `#F58220` (primary button) | 2.59:1 | **Fail** (text and UI) | Sandra (assisted), 16 Nov 2026 |
| `#F58220` on `#FFFFFF` (links, table actions) | 2.59:1 | **Fail** | 16 Nov 2026 |
| `#D96508` on `#FFFFFF` | 3.61:1 | UI only | 16 Nov 2026 |
| `#333333` on `#FFFFFF` | 12.63:1 | Pass | 16 Nov 2026 |
| `#333333` on `#F7F7F5` | 11.78:1 | Pass | 16 Nov 2026 |
| `#727272` on `#FFFFFF` | 4.81:1 | Pass | 16 Nov 2026 |
| `#666666` on `#FFFFFF` (table text) | 5.74:1 | Pass | 16 Nov 2026 |
| `#888888` on `#FFFFFF` (page/panel subtitles) | 3.54:1 | **Fail** (text) | 16 Nov 2026 |
| `#999999` on `#FAF9F7` (table headers) | 2.71:1 | **Fail** | 16 Nov 2026 |
| `#AAAAAA` on `#FFFFFF` (table IDs, placeholders) | 2.32:1 | **Fail** | 16 Nov 2026 |
| `#B65C0E` on `#FFF3E9` (submitted/review badge) | 4.25:1 | Fail (text) | 16 Nov 2026 |
| `#B42C28` on `#FFF0EF` (feedback badge) | 5.69:1 | Pass | 16 Nov 2026 |
| `#7E6500` on `#FFF9DC` (gold badge) | 5.29:1 | Pass | 16 Nov 2026 |
| `#3F7650` on `#EDF7F0` (completed badge) | 4.89:1 | Pass | 16 Nov 2026 |
| `#6E6E6E` on `#F3F2EF` (default badge) | 4.55:1 | Pass (just) | 16 Nov 2026 |
| `#FFFFFF` on `#E53935` (danger button) | 4.23:1 | UI only | 16 Nov 2026 |

## Open fixes (proposed, need team approval — not applied)

| # | Problem | Proposal | Keeps branding? |
|---|---|---|---|
| F1 | Type scale too small | Adopt the spec scale on Inter: body 16/24, small 14/20, h2 20/28, h3 17/24, inputs 16 px, badges and table headers 14 px (12 px uppercase only if contrast ≥ 4.5:1) | Yes (same typeface) |
| F2 | Primary button and link contrast | Keep `#F58220` for fills that don't carry text (accents, active indicators, illustrations). For buttons with white text and for links, use a darker CEDA-orange step: candidates `#B65C0E` (4.64:1) or `#C2410C` (5.18:1). Alternative: dark text `#333` on `#F58220` | Yes, with a darker step — confirm with CEDA guidance |
| F3 | Grey text fails | Use `text-secondary #727272` for all secondary text; drop `#888`, `#999`, `#AAA` for text | Yes |
| F4 | Status tones overlap or are missing | Separate Submitted and Under review; amber for Action required; add Closed; add icons next to the dot (spec: icon + text) | Mostly |
| F5 | Radius sprawl | 4 (inputs, badges), 8 (cards, dialogs — round 9 → 8), 999 (pills) | Yes |
| F6 | No focus indicator on some controls | 2 px focus ring + 2 px offset on every interactive element | Yes |

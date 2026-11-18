# Design tokens

**Maintained by:** Sandra · **Consumer:** Obvious (Tailwind theme / `tokens.json`) · **Last updated:** 16 Nov 2026 (TASK-01 first pass)

**Rule (D-32):**
- Where the existing Figma file defines a value, **Figma wins**: fill in its *Figma variable* and *Value*.
- Where it defines nothing, the placeholder from `02-figma-ui-ux-spec.md` §3 stays, and *Source* says `placeholder`.
- CEDA brand guidance, when received, replaces both (D-04).

The code token names are fixed so implementation can start now. Only values change.

**Where the "Figma" values come from:** the design source is a Figma Make prototype, which has no Figma variables. Values below were read from its stylesheet (`src/index.css`, CSS custom properties and repeated literals) and are marked `Figma (Make CSS)`. Contrast ratios were calculated with the WCAG 2 formula.

> **Brand decision (16 Nov 2026, Sandra):** the existing Make brand colours are **approved** (D-04 closed for colour; handoff-notes #1). The placeholder teal palette is retired. Nothing below introduces a new brand colour.
>
> **Two values fail the project's own contrast targets** (spec §3.1: text ≥ 4.5:1, UI ≥ 3:1). F2 below resolves them using colours already in the Make file. The other fixes are listed under *Open fixes*.

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
| `border-default` | `--line` | `#E6E3DF` | Figma (Make CSS) | Cards, dividers only (decorative, no contrast needed) |
| `border-input` | — | `#8A8580` | **Decided 18 Nov (Sandra)** | Borders of text fields, selects, textareas, checkboxes, radios and the upload drop zone. 3.65:1 on white, 3.47:1 on `#FAF9F7` (WCAG 1.4.11 needs ≥ 3:1). Replaces Make's `#DCD9D5` (1.41:1, fails). Warm grey, in the Make palette's family. **States:** default 1 px `#8A8580` · hover 1 px `#727272` · focus: border unchanged + 2 px `focus-ring` with 2 px offset · error 2 px `#B42C28` (6.30:1) + error text below, never colour alone · disabled 1 px `#E6E3DF` on `#FAF9F7` with `#727272` text and a visible reason · read-only: no border, `#FAF9F7` fill |
| `focus-ring` | — | `#1A73E8` | placeholder | Make removes outlines on search and filters and has no visible focus there. Keep the placeholder until a branded ring is approved |
| `feedback-error` | `--red` | `#E53935` | Figma (Make CSS) | Errors, destructive button (white on it 4.23:1: passes UI, fails small text) |
| `feedback-error-subtle` *(new)* | `--red-pale` | `#FFF0EF` | Figma (Make CSS) | Error badge background |
| `feedback-success` | — (literal) | `#3F7650` text / `#5A9B6E` dot | Figma (Make CSS) | Completed / available |
| `feedback-warning` | — | `#B54708` | placeholder | Make has no warning colour distinct from orange |
| `demo` | — | `#6941C6` | placeholder | DEMO badge, Sample labels (none in Make) |

**Status colours — F4 decided 18 Nov (Sandra), existing colours only.** Every badge is a pill with an **icon + text**, never colour alone. Badge **label text is `#333333`** in every tone (it passes on all backgrounds below); the tone comes from the background, border and icon colour (icon is UI: ≥ 3:1). Only Awarded uses `#1F1F1F` for text and icon. 

| Code token | Label (applicant / staff) | Background | Icon colour, icon | Source |
|---|---|---|---|---|
| `status-draft` | Draft | `#F3F2EF` | `#6E6E6E` icon (4.55:1), Lucide `PencilLine` | Decided 18 Nov (Make values) |
| `status-submitted` | Submitted / Awaiting screening | `#FFF3E9` | `#B65C0E` icon (4.25:1), `Send` | Decided 18 Nov (Make values) |
| `status-review` | Under review / In evaluation | `#FAF9F7` + 1 px `#E6E3DF` border | `#B65C0E` icon (4.41:1), `Search` | Decided 18 Nov. **Replaces the indigo placeholder `#E8EAFB` / `#3538CD`** (not a brand colour). Told apart from Submitted by background, border and icon |
| `status-action-required` | Action required / Waiting on applicant | `#FFF9DC` | `#7E6500` icon (5.29:1), `AlertCircle` | Decided 18 Nov. **Amber, not red**: red stays for errors only |
| `status-approved` | Approved | `#EDF7F0` | `#3F7650` icon (4.89:1), `CheckCircle2` | Decided 18 Nov (Make values) |
| `status-closed` | Not approved / Closed | `#FFFFFF` + 1 px `#8A8580` border | `#333333` icon (12.63:1), `XCircle` | Decided 18 Nov. **Replaces placeholder `#F2F4F7` / `#344054`** |
| `status-awarded` | Awarded | `#F9C51C` (solid gold) | `#1F1F1F` text and icon (10.23:1), `Award` | Decided 18 Nov. Solid fill so it can't be confused with Action required |

**Challenge timing pills (T01, T03)** reuse the same tones: Open → `status-approved` · Closing soon → `status-action-required` · Opening soon → `status-review` · Closed → `status-closed`. Same rule: icon + text. Don't lower the opacity of closed cards (it drops text below 4.5:1); use the Closed pill and the "Closed on …" line instead.

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
| `#8A8580` on `#FFFFFF` (input border) | 3.65:1 | Pass (UI) | 18 Nov 2026 |
| `#8A8580` on `#FAF9F7` (input border, sunken) | 3.47:1 | Pass (UI) | 18 Nov 2026 |
| `#DCD9D5` on `#FFFFFF` (Make input border) | 1.41:1 | **Fail** — retired | 18 Nov 2026 |
| `#B42C28` on `#FFFFFF` (error border) | 6.30:1 | Pass | 18 Nov 2026 |
| `#B65C0E` on `#FAF9F7` (Under review icon) | 4.41:1 | Pass (UI) | 18 Nov 2026 |
| `#333333` on `#FAF9F7` (badge text) | 12.01:1 | Pass | 18 Nov 2026 |
| `#333333` on `#FFF9DC` (badge text) | 11.93:1 | Pass | 18 Nov 2026 |
| `#1F1F1F` on `#F9C51C` (Awarded badge) | 10.23:1 | Pass | 18 Nov 2026 |

## Fixes (F2 and F4 decided; F1, F3, F5, F6 applied in code as proposed, pending team approval)

**Input borders:** decided 18 Nov, see `border-input` under *Colour*.

| # | Problem | Proposal | Keeps branding? |
|---|---|---|---|
| F1 | Type scale too small | Adopt the spec scale on Inter: body 16/24, small 14/20, h2 20/28, h3 17/24, inputs 16 px, badges and table headers 14 px (12 px uppercase only if contrast ≥ 4.5:1) | Yes (same typeface) |
| F2 | Primary button and link contrast | **Decided 16 Nov (existing colours only):** primary buttons keep the `#F58220` fill with **dark label text `#1F1F1F` (6.35:1)** instead of white; orange **text** (links, table actions, active labels) uses `#B65C0E`, already in the Make file as the badge text colour (4.64:1 on white). `#F58220` stays for fills, icons, active indicators and illustrations. New tokens: `brand-primary-on` = `#1F1F1F`, `brand-primary-text` = `#B65C0E` | Yes — no new colour |
| F3 | Grey text fails | Use `text-secondary #727272` for all secondary text; drop `#888`, `#999`, `#AAA` for text | Yes |
| F4 | Status tones overlap or are missing | **Decided 18 Nov (Sandra):** see *Status colours* above. Existing colours only; indigo and slate placeholders retired | Yes — no new colour |
| F5 | Radius sprawl | 4 (inputs, badges), 8 (cards, dialogs — round 9 → 8), 999 (pills) | Yes |
| F6 | No focus indicator on some controls | 2 px focus ring + 2 px offset on every interactive element | Yes |

# Design tokens

**Maintained by:** Sandra · **Consumer:** Obvious (Tailwind theme / `tokens.json`) · **Last updated:** —

**Rule (D-32):**
- Where the existing Figma file defines a value, **Figma wins**: fill in its *Figma variable* and *Value*.
- Where it defines nothing, the placeholder from `02-figma-ui-ux-spec.md` §3 stays, and *Source* says `placeholder`.
- CEDA brand guidance, when received, replaces both (D-04).

The code token names are fixed so implementation can start now. Only values change.

## Colour

| Code token | Figma variable | Value | Source (Figma / placeholder) | Use |
|---|---|---|---|---|
| `brand-primary` | | `#0B5A7A` | placeholder | Primary buttons, active nav, links |
| `brand-primary-hover` | | `#08465F` | placeholder | Hover/pressed |
| `brand-accent` | | `#C8962E` | placeholder | Award highlights |
| `surface-page` | | `#F6F7F9` | placeholder | Page background |
| `surface-card` | | `#FFFFFF` | placeholder | Cards, tables, dialogs |
| `surface-sunken` | | `#EEF1F4` | placeholder | Read-only fields, previous versions |
| `text-primary` | | `#1A1F24` | placeholder | Body text |
| `text-secondary` | | `#4A5560` | placeholder | Help text, metadata |
| `border-default` | | `#D5DBE1` | placeholder | Inputs, dividers |
| `focus-ring` | | `#1A73E8` | placeholder | Focus outline |
| `feedback-error` | | `#B42318` | placeholder | Errors |
| `feedback-success` | | `#067647` | placeholder | Success |
| `feedback-warning` | | `#B54708` | placeholder | Deadlines |
| `demo` | | `#6941C6` | placeholder | DEMO badge, Sample labels |

Status colours (background / text) are listed in spec §3.1. Add Figma values here if the file defines them:

| Code token | Figma variable | Background | Text | Source |
|---|---|---|---|---|
| `status-draft` | | `#EEF1F4` | `#4A5560` | placeholder |
| `status-submitted` | | `#E0EEF7` | `#0B5A7A` | placeholder |
| `status-review` | | `#E8EAFB` | `#3538CD` | placeholder |
| `status-action-required` | | `#FEF0C7` | `#93370D` | placeholder |
| `status-approved` | | `#DCFAE6` | `#067647` | placeholder |
| `status-closed` | | `#F2F4F7` | `#344054` | placeholder |
| `status-awarded` | | `#FDF3DC` | `#7A4F0E` | placeholder |

## Typography

| Code token | Figma style | Size / line height / weight | Source |
|---|---|---|---|
| `font-family` | | Source Sans 3, system-ui fallback | placeholder |
| `type-display` | | 32/40, 700 | placeholder |
| `type-h1` | | 26/32, 700 | placeholder |
| `type-h2` | | 20/28, 600 | placeholder |
| `type-h3` | | 17/24, 600 | placeholder |
| `type-body` | | 16/24, 400 | placeholder |
| `type-small` | | 14/20, 400 | placeholder |
| `type-mono` | | 14/20 | placeholder |

## Space, shape, layout

| Code token | Figma variable | Value | Source |
|---|---|---|---|
| `space-*` | | 4, 8, 12, 16, 24, 32, 48, 64 px | placeholder |
| `radius-sm / md / pill` | | 4 / 8 / 999 px | placeholder |
| `shadow-1 / shadow-2` | | spec §3.3 | placeholder |
| Breakpoints | | 360 / 768 / 1024 / 1280 px | placeholder |
| Content / form max width | | 1200 / 720 px | placeholder |
| Icon set | | Lucide, 20 px, always with a text label | placeholder |

**Contrast checks** (record each token pair you measured):

| Foreground / background | Ratio | Pass (text ≥ 4.5:1, UI ≥ 3:1) | Checked by, date |
|---|---|---|---|
| | | | |

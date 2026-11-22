# 7. UI consistency specification (UI-only demo)

**Rule:** no new dashboard style. Every toolkit screen is built from the tokens and components that are already on `main`. A component that is missing is built **once**, in U-02 (Shawnjembu), and used by both developers. ABM reviews the visuals as design owner (D-31).

## 7.1 Tokens (`src/styles/tokens.css` via `tailwind.config.ts`)

- **Colours: semantic names only, never raw hex in components** (the rule at the top of `tailwind.config.ts`):
  - `brand` (`#f58220`), used for fills and UI only, **never as text on white** (2.59:1); text uses `brand-text`. `brand-accent` (`#f9c51c`) is decorative only.
  - `surface-page`, `surface-card`, `surface-sunken`; `ink`, `ink-muted`; `line`, `line-input`; `focus`.
  - `error`, `success`, `warning`; the `status-*` pairs for case states.
  - Use these as they are; add no new palette.
- **Type:** `Inter Variable` (`--font-sans`):
  - scale `sm` 14, `base` 16 (all inputs, so phones don't zoom), `h3` 17, `h2` 20, `h1` 26, `display` 32;
  - headings `font-semibold`. Avoid `font-bold` and heavy weights in body text and forms (the brief asks for restraint).
- **Shape:** `rounded-sm`, `rounded-md` (8 px) and `rounded-full` for pills; shadows `shadow-1` and `shadow-2` only.
- **Layout:**
  - breakpoints `sm` 360, `md` 768, `lg` 1024, `xl` 1280;
  - widths `max-w-content` (1200 px) for dashboards and `max-w-form` (720 px) for forms;
  - touch targets `min-h-touch` / `min-w-touch` (44 px).
- **Money:** Botswana Pula everywhere, through `formatBWP` / `parseBWP` (`src/lib/money.ts`). Stored as thebe (integer minor units).
- **Dates:** `formatDateCAT` / `formatDateTimeCAT` (`src/lib/format.ts`), always Gaborone time.

## 7.2 Components to reuse (`src/components/`)

| Need | Use | Notes |
|---|---|---|
| Buttons, links that look like buttons | `Button`, `ButtonLink`, `button-styles.ts` | Variants primary, secondary, tertiary; `loading` + `loadingLabel` |
| Text and long text | `TextField` (`multiline`, `help`, `error`, `required` → `RequiredTag`, `maxLength` counter) | No raw `<input>` |
| Choices | `Select` | |
| Errors on submit | `ErrorSummary` + field errors | Focus moves to the summary |
| Messages | `Banner` (`info`, `warning`, `error`, `success`, `action`) | Errors announce at once |
| Save state | `AutosaveIndicator`, `useAutosave` | Same autosave behaviour as the proposal form |
| Tables | `DataTable` (caption, `primary` column, empty state) | Scrolls inside its box on phones, never the page |
| Filters | `QueueFilters` (search + chips) | |
| Tabs | `Tabs` | |
| Dialogs | `Dialog` (Radix: focus trap, Esc, focus return) | One pattern for every action |
| Tiles | `DashboardCard` (label, value, definition) | KPI tiles on hubs and workload |
| Progress | `CompletenessMeter`, `ProgressIndicator`, `StageTimeline` | Readiness checker reuses the meter |
| Loading, empty, error, forbidden, not found | `src/components/states/States.tsx` | Every page uses all that apply |
| Files | `FileUpload` | Same checks as attachments |
| Status | `StatusBadge`, `ReferencePill` | |
| Markdown text | `PlainMarkdown` | Content pages, learning hub |

## 7.3 New shared components (built once in U-02)

| Component | Built from | Used by |
|---|---|---|
| `MoneyInput` | `TextField` + `parseBWP`; shows "P" and thebe precision | Budget, pricing, inventory, market |
| `BarChart` | Moved out of `ReportsPage.tsx` (`BarList`: one hue from a zero baseline, values in ink, "Show as table" toggle) | Budget, financial viewer, survey summaries, workload |
| `SourceBadge` | `StatusBadge` look | Every figure: entered / estimate / calculated; "updated …" |
| `PrintLayout` | Peolwane mark (`src/brand`), print CSS like the receipt page | Canvas, plan, deck, branding exports |
| `ToolCard` | `DashboardCard` + `ChallengeCard` patterns | Toolkit hub |
| `EvidenceCard` | Card + `SourceBadge` + provenance (sample data; no file downloads in the demo) | Include step, evidence mapper, compare |
| `DemoNotice` | `Banner` (`demo` kind, which already exists) | Top of every demo screen: "Demo: sample data, not saved" |

## 7.4 Patterns

- **Navigation:**
  - innovators get one "Business toolkit" item in `ApplicantShell`, opening a hub that lists the tools;
  - reviewer tools sit **inside** the existing pages (scorecard, case page, My reviews), not in a new area;
  - staff navigation (`StaffShell`) gains only "Learning hub".
- **Page frame:** the existing eyebrow (small capitals in `brand-text`), then the h1, then a one-line purpose, as on the 21 Nov frames (`ScreeningQueuePage`, `DecisionQueuePage`). One h1 per page.
- **Brand identity:**
  - the Peolwane swallow mark comes only from `src/brand` (`brand.mark`);
  - cultural details stay restrained: no new illustrations or patterns without ABM's approval;
  - the CEDA product line in the footer is unchanged.
- **Charts:** one series per chart, a zero baseline, a title that names the measure, units in BWP, and always a table view (as Reports).
- **Forms:** the order is label, help, input, error. Required fields carry `RequiredTag`. Validation happens on submit, then on change.

## 7.5 Accessibility and motion (already enforced; keep it so)

- **Keyboard:** every action works by keyboard; the focus ring is visible (`focus` token); `Dialog` returns focus to its opener.
- **Screen readers:** status messages use `role="status"`; tables carry captions; icon buttons carry text (`sr-only`); `eslint-plugin-jsx-a11y` runs in CI.
- **Reduced motion:** `index.html` and `src/brand/splash.ts` honour `prefers-reduced-motion`. New work adds **no** decorative animation in forms or review screens.
- **Checks per page:** 360 and 1280 px with no sideways scroll; the smoke suite (`tests/e2e/shell-smoke.spec.ts`) gets a row for each new page.

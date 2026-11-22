# Toolkit preview: two-hour implementation plan

**Status:** Proposed, not started. · **Prepared:** 22 Nov 2026, after the code freeze · **Timebox:** 2 hours · **Approver for merge and enabling:** Sylvain (release owner)

## 1. Goal

Introduce the planned toolkits to users without building them. That means two information sections on existing dashboards:

| | Innovator | Reviewer |
|---|---|---|
| Section title | **Business Development Toolkit** | **Reviewer Intelligence Toolkit** |
| Page | My ideas (`/ideas`, applicants only) | Staff home (`/staff`), inside its existing reviewer-only part |
| Highlighted (4) | Business Model Canvas, Business Budgeter, Break-Even & Pricing Calculator, Funding Readiness Checker | Evidence-to-Criteria Mapper, Financial Analysis Viewer, Structured Feedback Builder, Guided Evaluation Assistant |
| "View planned tools" dialog | All 14 innovator tools | All 8 reviewer tools |

Every tool shows its name, a one-line description and a **Planned feature** badge. Each section says plainly that these tools are **not yet available**.

## 2. What is not done (safety)

- No database changes, migrations, API calls or new requests of any kind. The catalogue is static data.
- No new routes or pages; no change to roles, permissions, scoring, adjudication or submitted ideas.
- No simulated tool functionality, no calculations, no AI.
- **Off by default:** shown only when `VITE_TOOLKIT_PREVIEW=true`. The judged build doesn't set it.
- **No merge into `main` before the release tag or Sylvain's explicit approval** (the code freeze passed at 18:00 CAT, 22 Nov). Enabling it in the submission build needs the team's approval.
- No document (judge guide, user manual, claim register) may describe these tools as built.

## 3. Design (reuse only)

| Need | Existing piece |
|---|---|
| Dialog with Escape to close, focus trap, focus return, phone scrolling | `src/components/Dialog.tsx` (Radix) |
| Button | `Button` (`variant="secondary"`) |
| Cards and tiles | Card pattern of `DashboardCard` (`rounded-md bg-surface-card shadow-1`) |
| "Planned feature" badge | `rounded-full` pill in the `status-draft` colours (neutral, not a case status) |
| Eyebrow + heading | The 21 Nov frame pattern (`text-brand-text` eyebrow, `text-h2 font-semibold` heading) |
| Icons | `lucide-react` (already a dependency) |
| Layout | `grid gap-3 md:grid-cols-2` cards, one column at 360 px; no animation |

Motion: nothing animates, so reduced-motion is respected by default.

## 4. Files

| File | Change | Owner |
|---|---|---|
| `src/features/toolkit-preview/catalogue.ts` | **New.** Typed static data: `ToolkitTool { id, name, description, status: 'planned' }`, the 14 + 8 tools, and the highlighted ids per role | Shared (agreed first, written by one person) |
| `src/components/ToolkitPreview.tsx` | **New.** Props `{ title, eyebrow, workflow, tools, highlighted }`: section, cards, "View planned tools" button, dialog | Shawnjembu |
| `src/features/toolkit-preview/flag.ts` | **New.** `toolkitPreviewEnabled` from `import.meta.env.VITE_TOOLKIT_PREVIEW === 'true'` | Stacey |
| `src/pages/applicant/MyIdeasPage.tsx` | Render the innovator section when the flag is on | Stacey |
| `src/pages/staff/StaffHomePage.tsx` | Render the reviewer section inside the existing `reviewer` block when the flag is on | Shawnjembu |
| `src/components/ToolkitPreview.test.tsx` | **New.** Component tests | Shawnjembu |
| `src/pages/applicant/toolkit-preview.test.tsx` | **New.** Innovator page tests | Stacey |
| `src/pages/staff/toolkit-preview.test.tsx` | **New.** Reviewer page tests | Shawnjembu |
| `src/vite-env.d.ts` (if present), `.env.example` | The flag's type and name (names only) | Stacey |
| `CHANGELOG.md` | One entry | Whoever opens the PR |

Each developer edits different page files, so there is nothing to merge between them except the shared catalogue and component, which come first.

## 5. Timeboxed steps (both developers)

| Minutes | Stacey | Shawnjembu |
|---|---|---|
| 0–15 | Together: agree the `ToolkitTool` type and the component props (above); Stacey writes `catalogue.ts` with the 22 descriptions | Writes the `ToolkitPreview` component skeleton |
| 15–50 | Flag, `.env.example`, innovator section on My ideas | Finishes the component (cards, dialog, badge) and its tests |
| 50–80 | Innovator page tests (§6) | Reviewer section on staff home and its tests |
| 80–100 | Full checks: `npm run lint`, `npm run typecheck`, `npx vitest run`, `npm run build`; 360 px and 1280 px check in a mock build with the flag on | The same, on his part |
| 100–120 | Buffer: fixes, one combined PR from a `ui/toolkit-preview` branch, review by the other | |

**Fallback if time runs short:** one card per dashboard with the full catalogue in the dialog (the brief's minimum).

**If Shawnjembu is unavailable:** one developer can do all of it in about 90 minutes, in the same order.

## 6. Tests and acceptance

- [ ] **Flag off** (default): neither section renders; My ideas and staff home are unchanged (their existing tests pass unchanged).
- [ ] **Flag on, applicant:** only the innovator section appears on My ideas.
- [ ] **Flag on, reviewer:** only the reviewer section appears on staff home. A staff user without the reviewer role sees no section.
- [ ] Each dialog opens from "View planned tools" and closes with the close button and with Escape; focus returns to the button.
- [ ] The innovator dialog lists exactly 14 tools and the reviewer dialog exactly 8. Every one carries "Planned feature", and the text "not yet available" is present.
- [ ] No network request: the component makes no API call (it imports no API module).
- [ ] Lint, typecheck, all unit tests and the production build pass.
- [ ] At 360 px: one column, no sideways scroll, the dialog scrolls inside the screen. At 1280 px: two columns.

## 7. Branch and merge

- One branch, `ui/toolkit-preview`, from the latest `main`. Each developer works in separate files and pushes to it, or uses their own branch merged into it. No force-push.
- Commit with an imperative summary and a body naming this plan. No co-author trailers that name a tool.
- **Open the PR but do not merge** until the release is tagged or Sylvain approves.
- **Enabling** (`VITE_TOOLKIT_PREVIEW=true` in Amplify) is a separate decision by the team.

## 8. Deliverables at the end of the two hours

1. Two preview sections, behind the flag.
2. One shared `ToolkitPreview` component.
3. A static catalogue of the 22 tools.
4. Test results (the commands' summary lines).
5. The list of changed files.
6. A note in the PR: **these tools are planned, not operational.**

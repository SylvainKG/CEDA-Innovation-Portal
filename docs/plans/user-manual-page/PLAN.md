# User manual on the website: implementation plan

**Status:** Proposed · **Prepared:** 23 Nov 2026, after the code freeze · **Source text:** `docs/submission/user-manual.md` (DOC-02) · **Approver for merge:** Sylvain (release owner)

## 1. Goal

Publish the role manual inside the portal, so people read it where they work instead of in the repository:

| | |
|---|---|
| Route | `/help/manual`, in the `SiteShell` group beside the other help pages (visitors and signed-in people) |
| Title | **How to use the portal** (eyebrow "Help") |
| Sections | The six sections of the manual since #162: Everyone, Applicant, Screening officer, Reviewer, Administrator, Auditor |
| Navigation | A contents list at the top with an anchor per section (`#everyone`, `#applicant`, …); a "Back to contents" link after each section |
| Signed-in people | Their own role sections open first and the others stay collapsed; visitors see Everyone and Applicant open |
| Entry points | A new first item in the help side panel (`HELP_TOPICS`), a "User manual" footer link, and the staff and applicant Help links |

The page says what the portal does **today**. Nothing planned, flagged off or Deferred is described as working.

## 2. What is not done (safety)

- No database change, migration, RPC or new request. The manual is static text bundled with the app; it is not a `content_pages` kind, so administrators can't edit it from Content (that would need a migration after freeze).
- No change to roles, permissions or any existing screen other than the help side panel, the footer links and the Help nav entry.
- No screenshots in the first version (they go stale and weigh the bundle); text and icons only.
- The manual is the one finalised for `v1.0.1-judging` (#173, every **[confirm at release]** mark resolved); if any marker remains, it is resolved before the text is copied, and none appears on the page.
- Wording marked **Sample** in the manual (for example email being Simulated) keeps the existing `SampleLabel`.
- The toolkit preview (behind `VITE_TOOLKIT_PREVIEW`) is not mentioned.
- **No merge into `main` without Sylvain's explicit approval.**

## 3. Design (reuse only)

| Need | Existing piece |
|---|---|
| Page frame, header and help side panel | `PageFrame` and `HelpAside` in `src/pages/help/HelpPages.tsx` |
| Body text (paragraphs, `**bold**`, `- ` lists) | `PlainMarkdown`; numbered steps become `- ` lists, or a small `ol` if the team prefers numbers |
| Collapsible role sections | The FAQ accordion pattern in `FaqPage` (native `details`/`summary` or the same button + `aria-expanded`) |
| Role icons | `lucide-react` (already a dependency) |
| Current user's roles | The existing auth/session hook used by the shells |
| Placeholder labels | `SampleLabel` |

At 360 px: one column, the contents list wraps, no sideways scroll. From 1024 px: the side panel stays beside the text, as on the other help pages. Focus moves to the section heading when a contents link is followed.

## 4. Files

| File | Change |
|---|---|
| `src/features/manual/content.ts` | **New.** Typed static data: `ManualSection { id, title, roles: Role[] \| 'everyone', icon, blocks: { heading?: string; body: string; sample?: boolean }[] }`, copied from `docs/submission/user-manual.md` |
| `src/pages/help/ManualPage.tsx` | **New.** Contents list, sections, role-aware open state, anchors |
| `src/pages/help/HelpPages.tsx` | Export `PageFrame` (or move it to a shared file) and add **User manual** as the first `HELP_TOPICS` entry |
| `src/routes/router.tsx` | Add `{ path: '/help/manual', element: <ManualPage /> }` to the `SiteShell` group (lazy-loaded like `BranchNetworkMap`) |
| `src/layouts/ShellParts.tsx` | Add `{ to: '/help/manual', label: 'User manual' }` to `FOOTER_LINKS` |
| `src/navigation/nav-config.ts` | Point staff at Help: add a staff Help entry to `/help/manual` (applicants keep `/help/faqs`, which now lists the manual first) |
| `src/pages/help/manual-page.test.tsx` | **New.** Page tests (§6) |
| `src/features/manual/content.test.ts` | **New.** Drift test against the Markdown manual (§6) |
| `docs/submission/user-manual.md` | One line under the title: "Also on the portal at /help/manual" |
| `docs/submission/judge-guide.md` | One line pointing evaluators to `/help/manual` |
| `CHANGELOG.md` | One entry |

## 5. Steps (about two hours, one developer)

| Minutes | Step |
|---|---|
| 0–20 | Check the finalised manual against the judged build (log in as each demo role). Fix the Markdown manual first, so both copies say the same thing |
| 20–45 | Write `content.ts` from the corrected manual |
| 45–75 | `ManualPage.tsx`, route, side-panel, footer and nav links |
| 75–95 | Tests (§6) |
| 95–110 | Full checks: `npm run lint`, `npm run typecheck`, `npx vitest run`, `npm run build`; 360 px and 1280 px check in a mock build, signed out and as applicant, reviewer and administrator |
| 110–120 | Buffer, CHANGELOG, PR |

**Fallback if time runs short:** ship the page with every section open (no role-aware state); the contents list and anchors are enough.

## 6. Tests and acceptance

- [ ] `/help/manual` renders for a visitor with the six section headings in the manual's order, and the contents list links to each anchor.
- [ ] Signed in as an applicant: the Applicant section is open; signed in as a reviewer: the Reviewer section is open. Everyone is open in both cases.
- [ ] Every section can be opened and closed with the keyboard; `aria-expanded` reflects the state.
- [ ] **Drift test:** every `## ` heading in `docs/submission/user-manual.md` has a matching section title in `content.ts` (read with `fs` in Vitest), so the two copies can't silently diverge.
- [ ] No text on the page contains `[confirm at release]`, `Planned feature` or `toolkit`.
- [ ] The page imports no API module and makes no request.
- [ ] The help side panel, footer and nav links lead to `/help/manual`; the existing help, shell and public-page tests pass (update the footer link assertions in `shell-design.test.tsx` and `public-pages.test.tsx`).
- [ ] Lint, typecheck, all unit tests and the production build pass.
- [ ] At 360 px: one column, no sideways scroll. At 1280 px: text beside the side panel.

## 7. Branch and merge

- One branch, `ui/help-manual-page`, from the latest `main`. No force-push.
- Commit with an imperative summary and a body naming this plan and DOC-02. No co-author trailers that name a tool.
- **Open the PR but do not merge** until Sylvain approves. Because the manual is part of the submission, any wording change on the page needs the same change in `docs/submission/user-manual.md` in the same PR.

## 8. Deliverables

1. The `/help/manual` page with the six sections.
2. A static, typed copy of the manual, with a drift test against the Markdown source.
3. Links from the help side panel, footer and navigation.
4. Test results (the commands' summary lines) and the list of changed files.

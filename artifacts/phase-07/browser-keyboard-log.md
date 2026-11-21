# Browser, device and keyboard log (QA-01)

**Owner:** Sylvain, with Obvious for fixes · **Run:** 21 Nov 2026, 06:20–06:40 UTC (08:20–08:40 CAT) · **Blueprint:** §5 Phase 7, "browser/device/keyboard test log, timed key tasks, unrun checks labelled"

| | |
|---|---|
| Commit | `f42e31d` (`main`) |
| Build | `VITE_API_MODE=mock npm run build`, served by `vite preview` on localhost |
| Browser | Chromium 1243 (Playwright), headless, Linux container |
| Viewports | 360 × 800 (touch, mobile) and 1280 × 800 |
| Data | Mock adapters, fictional data. **Not** the real backend |
| Method | Scripted Playwright sweep (not committed; the probe scripts are described below). Each screen was opened as the role that uses it |

## 1. Screen sweep: 31 screens × 2 widths

Every screen in the route map was opened as the role that uses it, signed out for public pages. Checks per screen:
- one `h1`;
- no sideways scroll;
- every visible control has an accessible name;
- controls are at least 44 × 44 px (checkboxes, radios and the skip link excluded);
- the first 40 Tab stops each show a visible focus indicator;
- no console errors.

| Check | 360 px | 1280 px |
|---|---|---|
| Exactly one `h1` | 31 of 31 | 31 of 31 |
| No sideways scroll | 30 of 31 (**Reports**, admin: 3 px) | 30 of 31 (**Two-step sign-in**: 49 px) |
| Every control named | 31 of 31 | 31 of 31 |
| Visible focus on every Tab stop | 31 of 31 † | 31 of 31 † |
| No console errors | 31 of 31 | 31 of 31 |
| First Tab reaches "Skip to main content" | All shell pages ‡ | All shell pages ‡ |
| Controls at least 44 px | 18 of 31 | 19 of 31 (see §3) |

† The script first flagged the date and text fields on Reports, Audit log and Chat settings. A screenshot after tabbing into a date field shows a 2 px focus ring, and each field shows `outline: solid 2px` when focused. The flag came from Chromium focusing a part inside the date field, so these count as passing.

‡ The sign-in, register, forgot-password and two-step pages move focus to their heading on load, after the skip link, so the first Tab goes to the first field. That is intended.

Screens covered:
- **Public:** home, challenges, challenge brief, sign in, register, forgot password, FAQs, contacts, privacy.
- **Applicant:** My ideas, case view, new idea form, chat, notifications.
- **Staff:**
  - two-step sign-in, staff home;
  - screening queue, staff case, My reviews, decision queue;
  - All cases, Reports, Audit log, support inbox;
  - Users and roles, Roles, Challenges, Content, Chat settings;
  - committee home and committee cases.

## 2. Keyboard-only tasks

| Task | Width | Result | Actions |
|---|---|---|---|
| Applicant: new idea on Water-Smart, fill every step, attach the business plan PDF, accept the declaration, **Submit idea** | 1280 | **Passed**: receipt `CEDA-2026-0009` | 53 key actions (Tab, Enter, Space, Arrow; each typed answer counts as one) |
| Same | 360 | **Passed**: receipt `CEDA-2026-0009` | 53 |
| Screening officer: open **Record screening**, Tab inside, Escape | 1280 | Focus moves in and stays in; Escape closes. **Failed:** focus was then lost (on `body`). **Fixed in #94** | — |
| Admin: **Assign reviewers**, same steps | 1280 | Same failure; fixed in #94 | — |
| Admin: **Remove role** on Users and roles, same steps | 1280 | Same failure; fixed in #94 | — |

With #94 applied, all three dialogs return focus to the button that opened them (local Chromium, same method).

**Timed key tasks:** the scripted submission took 7.9 s. That is machine speed, not a person's, so it says nothing about how long the task takes. **Timing with a person: Not run.**

## 3. Defects found (open)

| Where | Width | Finding | Owner |
|---|---|---|---|
| Two-step sign-in (`/auth/mfa`) | 1280 | Page scrolls sideways by 49 px | Obvious |
| Reports (admin) | 360 | Page scrolls sideways by 3 px | Obvious |
| Notifications, "All" filter | both | 42 × 44 px | Obvious |
| Case reference links in staff tables (screening queue, My reviews, decision queue, All cases) | both | 19 px tall | Obvious |
| "← My ideas" and "← Screening queue" back links | both | 20 px tall | Obvious |
| Staff home "All notifications" | 360 | 24 px tall | Obvious |
| Challenges admin: challenge and rubric links | both | 20–24 px tall | Obvious |
| Challenge brief "Read the FAQs"; Register "Sign in" | both | 20 px tall | Obvious |
| Action dialogs lose focus on close | both | WCAG 2.4.3 | **Fixed in #94** (awaiting review) |

Text links inside a sentence or a table cell can be exempt from the 44 px target under WCAG 2.5.8. The spec (§3.3) asks for 44 px on every control, so these are listed.

## 4. Not run

| Check | Why | Who can run it |
|---|---|---|
| Firefox and Edge (desktop) | Only Chromium is installed in the test container | Anyone on a laptop, on the judging URL |
| Safari, iPhone; Chrome, Android phone | Needs a real device | Anyone with a phone |
| Screen reader (NVDA, VoiceOver) | Needs a person | Sylvain or Obvious |
| The same sweep in Supabase mode (real backend) | Needs the journey settings on #72 | Sylvain, once they are added |
| Timed key tasks with a person | Needs a person and a stopwatch | Any teammate |

Checks still Not run at upload stay labelled **Not run** in the final evidence.

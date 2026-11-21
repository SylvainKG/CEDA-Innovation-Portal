# Test plan

**Owner:** Sylvain (Stacey for pgTAP) · **Status:** Draft · 15 Nov 2026
**Sources:** blueprint §3.2 (main journey), §3.3 (negative journey N1–N11), §5 (slice tests); evidence skill `testing-and-evidence.md`
Every check starts as **Not run**. A check becomes Passed or Failed only with a run record (commit, environment, command, date in UTC and CAT, who ran it, quoted output) in `artifacts/phase-NN/`.

---

## 1. Layers and tools

| Layer | Tool | Proves | Owner |
|---|---|---|---|
| Domain rules and refusals | pgTAP on RPCs | Each refusal leaves rows unchanged (before/after snapshot) | Stacey |
| Idempotency, transactions | pgTAP | Same key → same result; status, events and audit commit together | Stacey |
| Access control | pgTAP per seeded role | RLS returns zero rows for denied roles on every table and view | Stacey (Sylvain contributes) |
| Adapter mapping | Vitest | Email relay maps provider responses to outcome statuses | Stacey |
| Concurrency | Script making parallel RPC calls against a disposable DB | Double submit → one case; double publish → one event | Sylvain |
| End-to-end and negative | Playwright (`--trace off`; `--trace on` only to debug a failure) | User-visible truth across real roles, on staging | Sylvain |
| Accessibility | Keyboard walkthrough + automated scan | Keyboard path through T04, T09, T10; announcements on T06, T11. Automated scans cover only part of WCAG and are labelled so | Sylvain + Obvious |
| Performance (QA-01) | Timed sample on the hosted build | p95 against D-16 targets, with sample size, network and device | Sylvain |

**Rule:** a test that passed only against mocks proves only the mock. RLS and RPC claims need pgTAP or a run against a real database.

## 1a. Browser test harness (in place from 16 Nov)

- **Run:** `npm run test:e2e -- --trace off`. By default it builds the app in mock mode and serves the production build. `E2E_BASE_URL=https://… npm run test:e2e -- --trace off` runs the same tests against a deployed site (staging or judging). The `E2E` workflow can do the same through *Run workflow* with a `base_url`.
- **Projects:** Chromium at **360 px** and **1280 px** (spec §3.3). Edge and Firefox are added for QA-01 (§5).
- **Specs:** `tests/e2e/`. `shell-smoke.spec.ts` covers what exists today: page heading and DEMO label, no horizontal scroll, skip link, signed-out redirect, Forbidden and Not-found states, 44 px targets.
- **What it does not prove:** the route guard is a UI convenience. **Access control is evidenced only by the N-tests against the real backend** (pgTAP now, Playwright once screens call the RPCs).
- **CI:** `.github/workflows/e2e.yml`, separate from `ci.yml`. Not a required check until the N1–N11 suite runs against the backend.

## 2. Negative suite (blueprint §3.3), required on video and automated

Status 17 Nov 2026: every N-test passes at the database layer: pgTAP on the Supabase local stack in CI, and **on the hosted project** (all suites, 468/468 with migrations 001–013 on 17 Nov; run record `artifacts/phase-00/hosted-supabase.md`, PR #39; 012 and 013 reach `main` with #35 and #40). The files are `supabase/tests/database/0NN_*.test.sql` on `main` (migration 012 is in PR #35). Browser (Playwright) and hosted-build runs through the UI are still Not run.

Each case is tested at **every entry route** that applies: the page, the PostgREST table/view, the RPC, Storage and Realtime.

| # | Attempt | Expected | Accounts | pgTAP | Playwright | Slice | Status |
|---|---|---|---|---|---|---|---|
| N1 | Applicant B opens A's case and calls the REST endpoint | 403 page / zero rows | applicant.b | ✓ | ✓ | S1 | pgTAP **Passed** (002; [CI run 44067341804 on `main`](https://github.com/SylvainKG/CEDA-Innovation-Portal/actions/runs/44067341804)); Playwright Not run |
| N2 | Applicant B requests A's attachment URL; an expired 60 s link | Refused; expired link fails | applicant.b, applicant.a | ✓ | ✓ | S1 | pgTAP: refusal **Passed**, 60-second expiry **Not run** (002; [CI run 44067341804 on `main`](https://github.com/SylvainKG/CEDA-Innovation-Portal/actions/runs/44067341804)); Playwright Not run |
| N3 | Unassigned Reviewer 3 opens the case | Zero rows, no file link | reviewer.3 | ✓ | ✓ | S2 | pgTAP **Passed** (001, 002, 003, 005; [CI run 44067341804 on `main`](https://github.com/SylvainKG/CEDA-Innovation-Portal/actions/runs/44067341804)); Playwright Not run |
| N4 | Applicant A queries the decision before publication | Nothing returned (not in payload) | applicant.a | ✓ | ✓ | S5 | pgTAP **Passed** (001, 006; [CI run 44067341804 on `main`](https://github.com/SylvainKG/CEDA-Innovation-Portal/actions/runs/44067341804)); Playwright Not run |
| N5 | Admin awards a case that is not approved | `CASE_NOT_APPROVED`; no rows change | admin | ✓ | ✓ | S5 | pgTAP **Passed** (001, 006; [CI run 44067341804 on `main`](https://github.com/SylvainKG/CEDA-Innovation-Portal/actions/runs/44067341804)); Playwright Not run |
| N6 | Any role updates V1 or deletes an audit row | Trigger refuses | every role | ✓ | — | S1 (V1), S5 (full) | pgTAP **Passed** (001, 002, 006; [CI run 44067341804 on `main`](https://github.com/SylvainKG/CEDA-Innovation-Portal/actions/runs/44067341804)); Playwright Not run |
| N7 | Support consultant calls proposal/score endpoints | Zero rows | consultant | ✓ | ✓ | S2 | pgTAP **Passed** (001, 002, 003; [CI run 44067341804 on `main`](https://github.com/SylvainKG/CEDA-Innovation-Portal/actions/runs/44067341804)); Playwright Not run |
| N8 | Admin grants a role to themself | Refused + audited | admin | ✓ | ✓ | S2 | pgTAP **Passed** (001, 003; [CI run 44067341804 on `main`](https://github.com/SylvainKG/CEDA-Innovation-Portal/actions/runs/44067341804)); Playwright Not run |
| N9 | Submit to the closed challenge | Refused; draft preserved | applicant.a | ✓ | ✓ | S1 | pgTAP **Passed** (002; [CI run 44067341804 on `main`](https://github.com/SylvainKG/CEDA-Innovation-Portal/actions/runs/44067341804)); Playwright Not run |
| N10 | Assigned reviewer requests proposal/files before declaring | Zero rows / no file link | reviewer.1 | ✓ | ✓ | S3 | pgTAP **Passed** (001, 003, 004; [CI run 44067341804 on `main`](https://github.com/SylvainKG/CEDA-Innovation-Portal/actions/runs/44067341804)); Playwright Not run |
| N11 | Reviewer declares a conflict, then reopens the case | Assignment revoked; zero rows; audit entry | reviewer.2 | ✓ | ✓ | S3 | pgTAP **Passed** (004; [CI run 44067341804 on `main`](https://github.com/SylvainKG/CEDA-Innovation-Portal/actions/runs/44067341804)); Playwright Not run |

## 3. Slice tests owned by Sylvain (blueprint §5)

| Slice | Check | Layer | Status |
|---|---|---|---|
| S1 | V1 cannot be updated or deleted after submit | pgTAP + Playwright | Not run |
| S1 | Double-click submit / retry returns the same reference, one case | Playwright + concurrency script | Not run |
| S1 | Lost reply on submit shows "Not confirmed yet" and the status check finds the reference | Playwright (network interception) | Not run |
| S3 | Peer scores hidden until own scorecard submitted | pgTAP + Playwright | Not run |
| S3 | Live-update leak: a second account receives no Realtime events for a case it can't read | Playwright, two browser contexts | Not run |
| S4 | V1 scores preserved after V2; old reviews tied to V1 | pgTAP + Playwright | Not run |
| S4 | Clarification reply creates no new version; empty reply refused | pgTAP + Playwright | Not run |
| S4 | V2 refused while any task lacks status or explanation | pgTAP + Playwright | Not run |
| S4 | Applicant cannot edit tasks or verifications | pgTAP | Not run |
| S4 | Unassigned reviewer cannot verify a task | pgTAP | Not run |
| S5 | **Full main journey (steps 0–17) passes on staging** | Playwright | Not run |
| S6 | Report counts reconcile with seed data; CSV matches screen | pgTAP (`013_report_reconciliation`) + Playwright | **Passed (database layer)**: 14 assertions, PGlite stand-in 21 Nov; mutation check (report drops closed cases) fails 6. Browser comparison of screen and downloaded CSV: Not run |
| S6 | OpenAPI export generated; scaling note written | Manual | Not run |

## 4. Main journey (blueprint §3.2) as one Playwright suite

One spec per step group, run in order against a freshly seeded staging database:

| Spec | Steps | Roles |
|---|---|---|
| `01-submit.spec.ts` | 0–4 | visitor, admin, applicant.a |
| `02-screen-assign.spec.ts` | 5–6 | screening, applicant.a, admin, reviewer.3 |
| `03-evaluate.spec.ts` | 7–8 | reviewer.1, reviewer.2 |
| `04-revise.spec.ts` | 9–11 | reviewer.2, applicant.a, reviewer.1 |
| `05-decide-award.spec.ts` | 12–15 | adjudicator, applicant.a, admin |
| `06-chat-oversight.spec.ts` | 16–17 | applicant.a, consultant, admin |

Credentials come from `DEMO_PASSWORD` in the environment, never from the spec files (D-17).

## 5. Browser and device matrix (QA-01)

| Browser / device | Main journey | Negative suite | Keyboard path | Status |
|---|---|---|---|---|
| Chrome (desktop) | ✓ | ✓ | ✓ | Not run |
| Edge (desktop) | ✓ | — | — | Not run |
| Firefox (desktop) | ✓ | — | — | Not run |
| Mobile viewport (360 px) | Steps 2–4, 10, 15 | — | — | Not run |

Checks not run by the deadline stay labelled **Not run** in the final evidence.

## 6. Run record format

```text
Check:        N1 cross-applicant read
Commit:       <sha>
Environment:  staging (<url>)
Command:      npx playwright test tests/negative/n1.spec.ts --trace off
Date:         2026-11-16 12:40 UTC / 14:40 CAT
Run by:       <name>
Result:       <quoted summary line, e.g. "3 passed (12.4s)">
```

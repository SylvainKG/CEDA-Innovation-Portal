# Changelog

Classification follows the evidence-led skill: `feature`, `refactor`, `repair`, `policy change`.

## [Unreleased]

- `feature` **Slice 4, part 3: reviewers verify the roadmap on version 2** (INN-02, D-10, APP-04), Provisional UI built from the written spec. When a reviewer scores a revised version, the scorecard shows the applicant's "What changed" note and a **Roadmap verification** block above the criteria: each task with the applicant's answer, **Verified** or **Not verified** (a note is required), **Save check**, and "n of m tasks verified". Checks can change until the scorecard is submitted, then they lock. Submitting is refused until every task answered in that version is verified; the error summary links to each task. Staff see the checks on the roadmap; the applicant does not until the decision is published (BCR-001 B6). Version 1 scores stay with version 1: after a revision the reviewer's status is Not started and they score version 2 afresh. `ReviewPort.verifyTask` (`verify_feedback_task`); the workspace reads the tasks answered in the scored version (`get_roadmap`) and the reviewer's own checks (`task_verifications`, explicit columns). The mock keys scorecards per version. `repair` (tests only): a full run on a loaded machine pushed some route-level tests past Vitest's 5 s and Testing Library's 1 s defaults; the suite now allows 15 s per test and 3 s for findBy/waitFor.

  Evidence: 2 journey tests and 1 adapter test (252 in total, three consecutive full runs); lint and type-check pass.

- `feature` **Slice 4, part 2: version 2 resubmission** (APP-04, INN-02, D-10, BCR-001 B9), Provisional UI built from the written spec. `/ideas/:id/revise` (T04 V2 mode, from "Revise your idea"): the request and deadline; a **Roadmap** where each task is marked Addressed or Not addressed with an explanation ("n of m tasks answered"); the answers pre-filled from the current version; **What changed?**; the declaration; and **Submit Version N**, disabled with the reason until every task is answered. The receipt reads "Version 2 submitted". The case returns to the stage it came from; the roadmap shows the answers and the version they arrived in; staff see version 2. Same honest-outcome rules as the first submission: one request key per revision request, reused until a receipt arrives; a lost reply is "not confirmed yet" with a status check by that key; the same key replays the receipt and a key used elsewhere is a conflict. `SubmissionPort.submitRevision` saves the working copy with `save_draft` only when edited, then calls `submit_revision`. Files carry forward; uploading replacements in V2 mode is not built yet. Reviewer task verification and V2 scoring follow in part 3.

  Evidence: 5 journey tests and 2 adapter tests (249 in total, two consecutive full runs); lint and type-check pass.

- `feature` **Slice 4, part 1: feedback requests, the roadmap and clarification replies** (REV-04, INN-02, D-21), built from the written spec (BCR-003; design review pending). Screening officers and adjudicators get **Request clarification** ("The applicant must reply in writing. No new version is created.") and **Request revision** with a task builder (add and remove tasks, up to 10, each required; "Current scores stay with the current version"), with a deadline defaulting to 7 days (due 17:00 CAT). The case moves to "action required" and back to where it was afterwards. A **Feedback** tab on the staff and applicant case pages lists each request (kind, status, message, deadline, the reply, and the roadmap with "n of m tasks addressed"; reviewers' checks only where the server includes them, never for the applicant before publication, BCR-001 B6). The applicant sees a banner, opens on Feedback, and answers a clarification (10–1,000 characters, "Your reply doesn't change your submitted idea"); an open revision offers **Revise your idea** (the V2 form is the next PR); an expired request shows the deadline notice with no form. My ideas shows the open request. New `FeedbackPort` (`getRoadmap`, `requestFeedback`, `respondClarification`); the mock mirrors the seed's open clarification on CEDA-2026-0003. Long journey tests get a 20 s limit, and a post-refresh check waits for the final render.

  Evidence: 4 journey tests and 1 adapter test (242 in total, three consecutive full runs); lint and type-check pass. Not screenshotted at 360 px this time (the capture script was blocked), so the layout is covered by tests only.

- `feature` **T08 applicant case view and Next steps (INN-05)**, built from the written spec (BCR-003; design review pending). `/ideas/:id` (the "View idea" and "View my idea" links): reference, applicant status, the five public stages, a confidentiality line, and tabs **Proposal** (the submitted answers and files), **Timeline** (public stages with times; the closure reason if closed) and **Decision** (once published: outcome, reason, the award in BWP, and a **Next steps** panel of 3–4 referral cards labelled "Sample referral information" and "Listed for information; not an endorsement"). It opens on Decision when there is one. Privacy: an unpublished decision never reaches the applicant (N4); the case history is read without its `reason` column and only the closure reason is read separately, so an eligible screening reason never shows (migration 013, #40, moves it server-side too). The seeded idea on My ideas now follows its live state (screened, decided, awarded). `SubmissionPort.getMyCase`; shared `Tabs` component (from the staff case page) and `NextStepsPanel`.

  Evidence: 4 screen tests and 1 adapter test (237 in total); headless Chromium at 360 and 1280 px: no horizontal scroll.

- `feature` **Slice 5, staff side: record, publish, award and close** (DEC-01, DEC-02, D-05, N4, N5), built from the written spec (BCR-003; design review pending). On a case in adjudication the adjudicator sees **Record decision** (outcome, reason, assessed version; "The applicant won't see this until you publish"); with a draft, **Publish decision** ("The applicant is notified now. This can't be unpublished") and **Change decision**, which keeps the earlier draft as replaced. The status reads "Decision drafted (unpublished)" meanwhile. On an approved case the administrator sees **Record award** (amount in BWP, parsed as text into thebe, shown back as "Recorded as BWP 250,000.50"; description); the same award again is replayed. Screening officers and adjudicators can **Close case** with a reason while it is still open. A **Decision** tab shows the active decision (and whether it is published), the award, and earlier drafts. `StaffPort` gains `recordDecision`, `publishDecision`, `recordAward`, `closeCase`; `getCase` reads `decisions` and `awards` (explicit columns) and marks drafts on an earlier version, which cannot be published. New `src/lib/money.ts` (thebe, never floating point).

  Evidence: 6 screen tests and 1 adapter test (232 in total); headless Chromium at 360 and 1280 px: no horizontal scroll.

- `feature` **Slice 3, adjudicator side: Ready for decision and the score panel** (REV-03, BCR-001 B7), built from the written spec (BCR-003; design review pending). `/staff/queue/decision` (T07 decision): cases in adjudication, oldest first, with version, scores received (n/quorum), the weighted aggregate and a spread flag. `/staff/cases/:id/panel` (T09 panel): aggregate (mean of weighted scores, range, spread), a criterion × reviewer matrix with mean and spread per criterion and each reviewer's weighted score, flags where scores differ by 2 or more, each reviewer's reasons on demand, and a warning while reviews are outstanding. Adjudicators and admins open it from the queue or from **Open score panel** on the case; a reviewer reaches it from their submitted scorecard and sees it only after submitting (contract §4.3). `ReviewPort.getPanel` reads `get_score_panel`, converting numeric text, and reads FORBIDDEN as not visible. `round2` rounds like PostgreSQL numeric (1.005 → 1.01).

  Evidence: 6 screen tests and 1 adapter test (225 in total); headless Chromium at 360 and 1280 px: no page-level horizontal scroll (on phones the matrix scrolls inside its own box, with a hint).

- `feature` **Slice 3, reviewer side: My reviews, declaration gate and scorecard** (REV-03, D-19, D-20), built from the written spec (BCR-003; design review pending). `/staff/reviews` (T07 reviewer): the reviewer's own assignments from `my_review_queue()`, grouped Declaration needed / Not started / In progress / Submitted (group in the address, opens on the first with work), with version, due date and an overdue flag. `/staff/cases/:id/score` (T09): before declaring, only reference, title, challenge and organisation (enough to recognise a conflict; proposal text and files stay closed, N10). "No conflict and confidential" opens the proposal; "I have a conflict" asks to confirm, then withdraws the reviewer. Scorecard beside the read-only proposal (Proposal | Scorecard toggle on phones): per criterion a 1–5 choice with the anchor text, the weight and guidance, and a reason (at least 20 characters on submit); optional overall comment; live weighted score (Σ score × weight ÷ Σ weight); Save draft; Submit after a confirm ("You can't change scores after submitting"); then read-only with the time. When the second active reviewer submits, the case moves to adjudication (D-11 quorum 2) and the screen says so. All three actions are safe to repeat (contract §4.3); after a lost reply the screen re-reads the workspace before saying anything. **Server issue raised:** `save_scorecard` stores items as given, and a score without a reason violates the `scorecard_items.reason` check, so a draft save would fail with a raw database error; until fixed, Save draft sends only criteria with both a score and a reason and lists the ones not saved yet. New `ReviewPort` (`myQueue`, `getWorkspace`, `declare`, `saveScorecard`, `submitScorecard`) and `src/lib/scoring.ts`.

  Evidence: 9 screen tests and 4 adapter tests (218 in total); headless Chromium at 360 and 1280 px: no horizontal scroll on My reviews or the scorecard.

- `feature` **Slice 2, part 3: internal notes** (T08 Notes tab), built from the written spec (BCR-003; design review pending). Staff with `case.note` (screening officers, reviewers, adjudicators, admins) read notes newest first and add one (1–4,000 characters); the tab says the applicant never sees notes and is never rendered for applicants. Your notes read "You"; other authors' names show only to admins (profiles are admin-only), otherwise "Staff". Adding a note has no request key and a repeat would save it twice, so after a lost reply the screen looks for the note in a fresh list and, if it isn't there, says to check the list before adding it again. Case tabs now wrap on phones instead of scrolling a tab out of view (spec T08 asks for a scrollable bar with arrows; wrapping keeps every tab visible; noted for design review). `StaffPort` gains `listNotes` and `addNote`.

  Evidence: 5 screen tests and 1 adapter test (206 in total); headless Chromium at 360 px: no horizontal scroll.

- `feature` **Slice 2, part 2: assigning reviewers** (REV-01), built from the written spec (BCR-003; design review pending). On a case in evaluation an admin sees **Assign reviewers** (T10): each reviewer with their current number of active reviews, those already on the case shown checked and locked, and a due date (default 14 days, due 17:00 CAT); the button says how many will be assigned. The Reviewers tab offers **Remove reviewer** with a required reason (submitted scores are kept). **All cases** (`/staff/cases`, T07 admin): every submitted case, most recently updated first, with status, active reviewers, last update and challenge; the status filter lives in the address. The committee variant is still to come (D-08). Neither action has a request key: after a lost reply the case is re-read and success is reported only if the change is there; repeating is safe (already-assigned reviewers are skipped, a second removal is refused). `StaffPort` gains `listReviewers`, `assignReviewers`, `revokeAssignment`; list rows carry `active_reviewers`. Reviewer names and roles are read only by admins (`role.manage`), as RLS allows.

  Evidence: 7 screen tests and 3 adapter tests (198 in total); headless Chromium at 360 and 1280 px: no horizontal scroll on All cases or the case page.

- `feature` **Slice 2, part 1: screening** (REV-01), built from the written spec (BCR-003; design review pending). `/staff/queue/screening` (T07): submitted cases oldest first, with reference, title, challenge, submitted date, days waiting and status; cards on phones. `/staff/cases/:id` (T08): header with reference, staff status, challenge, stage timeline and the one action for this role and state; Proposal tab (the submitted answers by section, files), Timeline tab (each event with its reason), Reviewers tab (declaration state; names only for admins, who may read profiles). **Record screening** (T10): Eligible / Not eligible and a required reason, audit note, server wording for refusals; only for screening officers (admins read but cannot screen, as in the contract). With no request key, a lost reply re-reads the case: moved on means recorded, otherwise "Not confirmed yet", and repeating is safe (the server refuses a second screening). New `StaffPort` (`listCases`, `getCase`, `recordScreening`): Supabase reads use explicit columns and exclude drafts in the query; the mock mirrors the seed's 8 cases and includes ideas submitted in the same session, so the demo journey runs end to end in mock mode.

  Evidence: 13 screen tests and 4 adapter tests (188 in total); headless Chromium at 360 and 1280 px: one h1 and no horizontal scroll on the queue and the case page.

- `feature` **Help and privacy pages** (T03 content variants, HLP-01), built from the written spec (BCR-003; design review pending). Routes `/help/faqs`, `/help/contacts`, `/help/support`, `/privacy`, which the footer, the Help navigation and the Chat link already pointed to. FAQs: native disclosures with a search over questions and answers, a live match count and a no-match state. Contacts: regulatory offices and referral programmes ("listed for information only") as cards. Support and privacy: the server's text; the privacy notice with its version. Sample wording is labelled. **Not done:** the severity and response-time table spec T03 lists for fault support; the seed has no times, so none are invented. New `ContentPort` (`api.content.list(kind)`): published `content_pages` of one kind, explicit columns, in position order; the mock mirrors the seed.

  Evidence: 6 page tests and 1 adapter test (171 in total); headless Chromium at 360 and 1280 px: one h1 and no horizontal scroll on all four pages.

- `feature` **CEDA logo everywhere it belongs**: header of every shell (logo alone below 768 px), the T02 auth card above the title (spec T02), and the printed receipt (the header is not printed; the DEMO line stays). Browser tab and home-screen icons (`favicon.ico`, `favicon-32.png`, `apple-touch-icon.png`) made from the logo's arc, since the wordmark is unreadable at 16 px. Source: the supplied 447 px PNG, upscaled 4x; replace with CEDA's vector logo when available.

- `feature` **T02 sign in, register, verify, forgot and reset**, built from the written spec (BCR-003; design review by Sandra pending). MFA stays a placeholder until the staff slice (demo staff skip it, D-07).
  - Centred card (max 440 px); error summary linking to each field; focus moves to the heading.
  - Messages never say which of email or password was wrong, nor whether an account exists: an existing address on register, and an unknown one on reset or resend, look like success.
  - Register shows the current privacy notice (with its Sample label) and a required consent box; its version goes with the sign-up, and the server keeps it only if current. Password rule shown in advance: at least 12 characters (spec). The server's Auth minimum is also 12 (hosted since 19 Nov; `config.toml` in #50); email links return to `/auth/sign-in?verified=1` and `/auth/reset`, which hosted Auth now allows.
  - Verify page: resend waits 60 s. The address travels in navigation state, never in the URL.
  - Reset: needs the recovery session from the email link; afterwards the person is signed out and signs in again.
  - **Sign out** in every shell's top bar. Signing out, or a different person signing in on this device, removes unsent drafts, pending submit keys and cached data; the same person keeps their unsent work.
  - Sign out is an icon (with a screen-reader label) below 768 px, and the staff header's gaps tighten on phones, so the 360 px staff shells don't scroll sideways (e2e, Stacey's #47 review).
  - Sign-in and sign-out from another tab or an email link are followed (`useAuthSync`).
  - `repair`: a session read started on page load could land after sign-in and overwrite the new session with "signed out"; in-flight session reads are now cancelled first.
  - Session port gains `signIn`, `register`, `resendVerification`, `requestPasswordReset`, `updatePassword`, `signOut`, `getPrivacyNotice`, `onChange`. The mock signs the seed's demo emails in as their persona (not authentication; development only) and keeps the labelled role picker.

  Evidence: 13 screen tests and 7 Supabase Auth adapter tests (163 in total); lint, type-check and build pass.

- `feature` **Supabase adapters** (`src/lib/api/supabase/`, the only place that imports supabase-js). `VITE_API_MODE=supabase` now selects them; it fails at start-up without `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`, or with a non-https URL (http only for a local stack). The mock stays the default for development and the staging demo.
  - Session: Supabase Auth for identity, `my_access()` for roles (unknown role keys dropped), own `profiles.full_name` for the name.
  - Slice 1: challenge, brief, form and declaration reads; draft read (unsubmitted files only); `list_my_ideas()` (migration 014, PR #42); `save_draft`, `register_attachment` after a Storage upload to `proposal-files/<proposal>/<uuid>.<ext>` (the user's file name never goes into the path), `remove_attachment`, `submit_proposal` and `get_submission_receipt`; template downloads from the public `challenge-files` bucket.
  - Explicit columns everywhere (no `select *`); challenge lists filter `status in ('published','closed')` in the query; criteria are read without anchors.
  - Outcomes: a known code is a refusal; a lost or malformed submit reply is UNKNOWN with the same request key; registration is retried once after a lost reply (idempotent by path); a lost save reply throws, so autosave keeps the answers on the device.
  - `@supabase/supabase-js` pinned to 2.119.0 (released 4 Nov 2026). Production dependency audit: 0 vulnerabilities.

  Evidence: 19 adapter tests against a recording fake client (142 in total); lint, type-check, and build in both modes pass. Not yet run against the hosted project. Before any build is switched to `supabase` mode, #42 (`list_my_ideas`, migration 014) must be merged and on hosted; the build uses the publishable key, and its URL must be on the Auth redirect allow-list (Stacey's #46 review). A Storage policy denial is recognised by its body (`statusCode` "403" / `Unauthorized`), not by the HTTP 400 it arrives with.

- `feature` **T04 proposal form and T05 receipt**, built from the written spec (BCR-003, D-45 proposed; design review by Sandra pending). Routes `/ideas/new?challenge=`, `/ideas/:id/edit`, `/ideas/:id/receipt?v=`:
  - sections from the challenge's form schema, plus Attachments and Review & declare. Stepper on desktop, "Section n of m" on mobile; the step is in the URL hash, and focus moves to the step heading;
  - autosave with the honest indicator; "restore unsaved changes from this device" prompt; offline banner. The first save moves the address to `/ideas/:id/edit` without remounting the form;
  - attachments per required document with server-worded refusals and remove;
  - review step: read-only summary with Edit links, the declaration, an error summary linked to each field, and submit with unknown-outcome recovery;
  - receipt from the server's data only; "What happens next"; print stylesheet with a print-only DEMO line;
  - closed challenge, someone else's draft or receipt (Not found), and error states;
  - `TextField` and `Select` accept a caller `id`; `ReceiptCard` can render its heading as the page h1; `saveNow` reports whether the save was confirmed.

  Evidence: 8 new screen tests through the real route table (101 in total), lint, type-check and build pass. Mock only.

- `feature` **T06 My ideas** (applicant), built from the written spec (BCR-003): one IdeaCard per idea, sorted by action needed (a response, then drafts), then most recent update; action banner; empty state listing open challenges; "Start a new idea". New reads `listMyIdeas` (own `proposals` + open `feedback_requests` + `case_events` stages) and `listChallenges`, with the seed's case 0008 in the mock so Applicant A sees two cards. IdeaCard gains `deadlineLabel` ("Submit by" for drafts). The list refreshes after a submit or an edit.

  Evidence: 7 new tests (rules and page), 108 in total.

- `feature` **T01 public home and challenge list, T03 challenge brief**, built from the written spec (BCR-003). Routes `/`, `/challenges`, `/challenges/:slug`:
  - intro band with Register and Sign in;
  - challenge cards (Open / Closing soon / Closed, closing date in CAT with a relative hint), open first; "How it works" in the 5 public stages;
  - brief with status, dates and audience; "How your idea is assessed" (criteria and weights, never anchors); templates listed; the primary action is a sticky aside on desktop and a bottom bar on mobile, "Continue your draft" for an applicant with one, disabled with the reason when closed; unknown or unpublished → Not found;
  - new read `getChallengeBrief`; `challengeTiming` ("Closing soon" = last 7 days, an assumption); `PlainMarkdown` renders seeded text without interpreting HTML; `ChallengeCard`.
  - The e2e smoke test's expected home heading changes from the placeholder to the spec's title.

  Evidence: 7 new tests, 115 in total; lint, type-check and build pass.

- `repair` #38 review fixes:
  - **F4 status colours** (decided 18 Nov, Sandra) in `tokens.css`: indigo and slate placeholders retired, Action required amber, Awarded solid gold, review and closed with borders; `PencilLine` for Draft. `TonePill` shares the tones, so challenge pills follow F4 (Open = Approved, Closing soon = Action required, Opening soon = Under review, Closed = Closed);
  - closed challenge cards keep full contrast (no reduced opacity);
  - upload shows "Uploading…" with an indeterminate bar, never a made-up percentage;
  - T04 on mobile: a "Progress & help" button near the top; progress links are 44 px targets;
  - `ButtonLink` replaces seven copies of link-as-button styling;
  - expired feedback requests: a notice, no action (`open_feedback.status`);
  - template downloads use the backend's public URL (`templateUrl`), hidden when none;
  - the T03 mobile action bar is sticky, so it never covers the footer.

  Evidence: 6 new tests, 121 in total.

- `feature` Hosted pgTAP runner and run record: `tools/pglite-db-tests/run-hosted.mjs` runs every pgTAP file against the hosted database without Docker (each file rolls back; the reference sequence is restored), and `artifacts/phase-00/hosted-supabase.md` records the hosted schema, test, account and Edge Function results with commits and times, including the Auth URL configuration and the 10-character password minimum set on 17 Nov.
- `feature` Slice 1 behaviour hooks (APP-01, APP-03; no screens yet), in `src/features/submission/`:
  - `useSubmitIdea`: one request key per draft, reused on every retry; a lost reply is "Not confirmed yet" with a status check by key; opening the page with a pending key checks before allowing another submit;
  - `useAutosave`: debounced, one save at a time, every change also kept on the device; lost updates retried with back-off; the first (unkeyed) save and refusals are never retried blindly;
  - read hooks for the challenge form, declaration, draft and receipt.

  Evidence: 9 new tests (81 in total), lint, type-check and build pass. Mock only.

  Review fixes (Stacey, Sylvain): typing during the first save is kept on the device under the new draft id; `INVALID_STATE` and `REQUEST_CONFLICT` on submit look up this idea's receipt by its id (never by the conflicting key); a pending key that belongs to another idea is dropped; device copies and submit keys are cleared whenever the person changes (`clearDeviceData`); the draft id is returned from state. 93 tests.

- `feature` Slice 1 data layer, mock only (APP-01, APP-02, APP-03; no screens yet):
  - types for the form schema, draft, attachments and receipt, copied from the API contract (Stacey, Draft for review, `db/phase-0-foundation`);
  - `SubmissionPort` mapping one-to-one to the documented reads and RPCs (`save_draft`, `register_attachment`, `remove_attachment`, `submit_proposal`, `get_submission_receipt`);
  - RPC error mapping: a known code is a refusal with field errors; a lost reply on a keyed command is an unknown outcome, never "failed";
  - submit request keys kept per draft until a receipt arrives (contract §4.1 rule 1);
  - client form check mirroring the server's rules and wording, plus completeness counts;
  - mock adapter following the contract's check order, idempotent replay, `REQUEST_CONFLICT`, first reference `CEDA-2026-0009` (B10), and a lost-reply switch for testing the unknown path. Fixtures copied from the seed.

  Evidence: 17 new unit tests (72 in total), lint, type-check and build pass. Proves the mock only; server behaviour is evidenced by the pgTAP suites.

  Review fixes (Stacey, Sylvain): `IMMUTABLE` is a known refusal, never an unknown outcome; "open" is status **and** dates (`isChallengeOpen`, as `private.challenge_is_open`), with `opens_at` and the `unpublished` status from migration 011; mock attachment refusals use the server's wording and field keys; lengths count characters as Postgres does; optional `versionNo` on the receipt lookup. 76 tests.
- `feature` Supabase keep-alive workflow (OPS-03): the hosted project stays on the Free plan, which pauses after about a week without activity, so `.github/workflows/keep-alive.yml` calls the public `health()` RPC every second day and on demand. Needs the `SUPABASE_URL` variable and `SUPABASE_PUBLISHABLE_KEY` secret in the repository settings.
- `policy change` CI `audit` gate (SEC-02): fails on high or critical findings in **shipped** packages (`npm audit --omit=dev`). Findings in dev-only tooling are listed in the job summary and the saved report, and must be recorded in ADR-001; they no longer block every PR while no fix exists (GHSA-fc5q-39xc-vjpf in `picomatch`, build and test tooling only, 18 Nov 2026).
- `repair` Whitespace-only answers (migration 012): `private.validate_submission` trimmed with `btrim`, which strips only spaces, so an answer of newlines or tabs passed "Required" on submit and revision while the browser refused it. Answers are now trimmed of all surrounding whitespace before every check.
- `policy change` Slice 1 contract review (migration 011, from the frontend review in PR #16): `submit_proposal` refuses an unverified email with `VALIDATION` and `fields.email` instead of `FORBIDDEN`, so the form can tell the applicant to verify; an applicant keeps reading the challenge their own case belongs to after it is unpublished (ADM-02), through the definer helper `private.owns_case_in_challenge`. The first-autosave duplicate risk is recorded as known debt.
- `repair` Function privileges (SEC-02, migration 010): the schema-level default-privilege lines in migration 001 could not remove PostgreSQL's built-in PUBLIC execute, so `my_access()` was callable signed out (it returned null) and internal `private` helpers were executable by everyone (not reachable through the API). New functions now start closed, `my_access` is signed-in only, and `private` exposes only the helpers access policies use.
- `feature` Privilege regression suite `010_security_privileges.test.sql`: exact function allow-lists, `search_path` pinning, no views, no browser table writes, private proposal bucket.

  Evidence: PGlite stand-in run, 010 suite 11/11 (all suites 457/457).

- `feature` Scheduled maintenance (REV-04, CHT-03, NTF-02): `run_maintenance` expires overdue feedback requests (requester notified, audited as system) and sweeps missed chats; `extend_feedback_deadline` reopens a request; `pg_cron` runs maintenance every 10 minutes and triggers `email-relay` every 2 minutes through `pg_net`, with the relay URL and secret kept in Supabase Vault. Schedules are skipped where `pg_cron` is unavailable.

  Evidence: PGlite stand-in run, 009 suite 20/20 (all suites 446/446). Schedules not run on Supabase yet.

- `feature` CI database workflow (`.github/workflows/db.yml`, D-42): pgTAP on the PGlite stand-in, pgTAP on the real Supabase local stack (`supabase start` + `supabase test db`), and `deno check` on every Edge Function. Runs on pull requests and on pushes to `main`, `db/**` and `test/ci-db-**` that touch the database.

- `feature` Slice 6b backend: admin settings (ADM-01/02, HLP-01, CHT-02, ARC-01, IAM-01):
  - content pages with draft/published and versioned privacy and declaration wording;
  - chat hours, closure days and the demo override;
  - new roles and their permissions as data (ARC-01); built-in roles protected;
  - rubric drafts, criteria with 1/3/5 anchors, publish at 100% (ARC-01 new criterion);
  - challenges: create, edit, validated form schema, publish, new form versions without touching existing ideas, unpublish/close, delete unused drafts;
  - `invite-staff` Edge Function.

  Evidence: PGlite stand-in run, 008 suite 52/52 (all suites 426/426). Not run on the Supabase stack yet.

- `feature` Slice 6a backend: reports, audit, chat (RPT-01, SEC-03, CHT-01/02/03):
  - `get_programme_report` (participation, outcomes, funnel, time in stage, overdue, impact) and `report_case_rows` for CSV, reconciled with the seed;
  - `query_audit` with case, actor, action-prefix and date filters and keyset paging;
  - chat: hours in Gaborone time with holidays and a demo override, one conversation per applicant, consultants hold several, missed-chat sweep, statistics, Realtime on messages and sessions.
- `repair` Audit action filter: `%` and `_` are matched literally instead of acting as wildcards.

  Evidence: PGlite stand-in run, 007 suite 45/45 (all suites 374/374). Not run on the Supabase stack yet.

- `feature` Slice 5 backend (DEC-01, DEC-02, D-05):
  - `record_decision`: unpublished, invisible to the applicant (N4), re-recordable before publication with history kept;
  - `publish_decision`: approved / not approved, once, only for the current version;
  - `record_award`: administrator only, after a published approval (N5 `CASE_NOT_APPROVED`), a separate Award stage, safe to retry;
  - `close_case`: with a reason the applicant can read; expires open requests;
  - email templates for decision and award (no outcome in the email).

  Evidence: PGlite stand-in run, 006 suite 45/45 (all suites 329/329). Not run on the Supabase stack yet.

- `feature` Slice 4 backend (REV-04, APP-04, INN-02, NTF-02):
  - `request_feedback`: clarification (a question) or revision with up to 10 roadmap tasks; the case waits on the applicant and remembers where it came from;
  - `respond_clarification`: required reply, no new version, case returns (BCR-001 B1);
  - `submit_revision`: new immutable version with change note and an answer to every task, same reference, files carried forward, idempotent (B9), case returns to the requesting stage (D-10);
  - `verify_feedback_task` and the verification gate on V2 scorecards; verifications lock with the scorecard and stay hidden from the applicant until publication (B6); `get_roadmap` summary;
  - email outbox relay: lease-based claim, outcome recording with backoff (B4), `email-relay` Edge Function, admin outbox viewer.

  Evidence: PGlite stand-in run, 005 suite 72/72 (all suites 284/284). Not run on the Supabase stack; SMTP not configured (email Simulated).

- `feature` Slice 3 backend (REV-02, REV-03, NTF-01, D-11, D-19, D-20):
  - `declare_assignment`: the case opens only after a no-conflict declaration (N10); a conflict revokes the assignment and alerts admins (N11);
  - `save_scorecard` / `submit_scorecard`: 1–5 scores with reasons of at least 20 characters; quorum moves the case to adjudication automatically; retries are safe;
  - `get_score_panel` (weighted aggregate, spread, 2-point flag), `my_review_queue`, `mark_notifications_read`;
  - notifications and case history published for Realtime; published rubrics and challenge versions locked.

  Evidence: PGlite stand-in run, 004 suite 61/61 (all suites 212/212). Not run on the Supabase stack yet.

- `feature` Slice 2 backend (REV-01, IAM-01, D-08):
  - `record_screening` (eligible to evaluation, ineligible closes with reason), `assign_reviewers` (safe to retry; reviewer-role, conflict and self checks), `revoke_assignment`;
  - `grant_role` / `revoke_role`: a self-grant is refused and audited (N8);
  - `add_internal_note` (audit records the event, not the text);
  - `list_case_status` and `case_stage_counts` for the committee (reference and stage only);
  - user roles and assignments are revoke-only.

  Evidence: PGlite stand-in run, 003 suite 56/56 (all suites 151/151). Not run on the Supabase stack yet.

- `feature` Database foundation and Slice 1 backend (FND-01, IAM-02, APP-01/02/03, SEC-01):
  - migration 001: every core table, RLS on every table with SELECT-only grants, append-only versions/audit/history, `has_permission()` with the D-07 MFA rule, `health()`, `my_access()`;
  - migration 002: `save_draft`, `submit_proposal` (idempotent; `REQUEST_CONFLICT`), `get_submission_receipt`, private `proposal-files` bucket, attachment registration, `record_consent`, sign-up trigger;
  - `attachment-url` Edge Function (60-second signed links after an access check);
  - fictional seed (8 cases; demo case `CEDA-2026-0009`) and `scripts/set-demo-passwords.mjs`;
  - API contract `docs/blueprint/03-api-contracts-and-permissions.md`;
  - pgTAP suites (95 assertions) and a PGlite runner for machines without Docker.

  Evidence: PGlite stand-in run, 95/95 passed. Not run on the Supabase stack yet.

- `feature` Browser test harness (QA-01, SEC-02 groundwork): Playwright `1.63.0` with `npm run test:e2e`, projects at 360 px and 1280 px, local mock-mode build by default or `E2E_BASE_URL` for a deployed site. First suite `tests/e2e/shell-smoke.spec.ts` (10 checks × 2 widths): one h1 and the DEMO label per page, no horizontal scroll, skip link focus and outline, signed-out redirect, Forbidden and Not-found states, 44 px targets. Separate `E2E` workflow (not required yet). Vitest now only collects `src/**` tests.

  Evidence: 20 passed locally (Ubuntu, Node 22); the workflow run on the PR.

- `feature` Slice 1 components (UX-01, APP-03 presentation only):
  - ReferencePill (copyable), StageTimeline (5 stages; Feedback only when it occurred), IdeaCard, ReceiptCard;
  - Banner (one style for all messages), CompletenessMeter (INN-03), DeclarationPanel (applicant D-22 and reviewer D-19 with the conflict path), AutosaveIndicator (server-confirmed vs device-only);
  - development-only component gallery at `/dev/components` (mock mode only, lazy-loaded).

  Evidence: the components PR.

- `feature` Frontend foundation (FND-01, UX-01):
  - Vite + React + TypeScript scaffold;
  - design tokens from the Figma Make audit;
  - public, applicant and staff shells with role navigation;
  - route table with honest "Not built yet" placeholders;
  - state kit, including the unknown-outcome state;
  - shared components: Button, TextField, Select, StatusBadge, DataTable, Dialog, FileUpload, ProgressIndicator, NotificationItem, DashboardCard, DemoBadge;
  - typed API layer with a development-only mock session;
  - ADR-001.

  Evidence: the scaffold PR.

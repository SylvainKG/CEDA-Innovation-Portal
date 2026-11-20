# Data-handling note

**Owner:** Stacey (backend) with Sylvain (submission) · **Status:** Draft for team review · 17 Nov 2026
**Answers:** backlog SEC-02 ("Document data purpose, access and proposed retention against the Data Protection Act, 2024"), blueprint D-15, D-18, D-25
**Implementation:** `supabase/migrations/001`–`010`, API contract `docs/blueprint/03-api-contracts-and-permissions.md`

This portal is a **demonstration prototype that uses fictional data only**. It is designed with reference to Botswana's Data Protection Act, 2024. It makes **no claim of compliance** (D-18) and has not been assessed by a data protection officer or a lawyer.

---

## 1. What we hold and why

| Data | Where | Purpose | Who can read it |
|---|---|---|---|
| Account: name, email, organisation, phone (optional) | `profiles`, Supabase Auth | Sign-in, contacting the applicant about their idea | The person; administrators (`role.manage`) |
| Privacy-notice consent and its version | `profiles.consent_version`, `consent_at` | Proof of informed consent at registration (IAM-02) | The person; administrators |
| Proposal content and every submitted version | `proposal_versions`, `proposal_drafts` | Assessing the idea (APP-01, APP-04) | The applicant; screening officer, adjudicator, administrator once submitted; an assigned reviewer **only after a no-conflict declaration** (D-19). Drafts: the applicant only |
| Attachments | Private Storage bucket `proposal-files` | Supporting documents (APP-02) | As proposal content. Downloaded only through 60-second signed links after an access check; every download is audited |
| Scores, reasons, roadmap verifications | `scorecards`, `scorecard_items`, `task_verifications` | Evaluation (REV-03, INN-02) | The reviewer; peers only after submitting their own; adjudicator and administrator. **Never the applicant** (verifications only after the decision is published) |
| Internal notes | `internal_notes` | Staff working notes | Staff on the case. **Never the applicant** |
| Decisions and awards | `decisions`, `awards` | Outcome (DEC-01, DEC-02) | Staff; the applicant **only after publication** |
| Case history, notifications | `case_events`, `notifications` | Timeline and alerts (NTF-01) | Those who can read the case; notifications only their recipient |
| Email queue | `email_outbox` | Opt-in email alerts (NTF-02) | No browser access; only the relay function (service role). Emails carry the reference and a link, **never proposal content or outcomes** |
| Chat messages | `chat_sessions`, `chat_messages` | Support (CHT-01) | The applicant and the consultant handling the conversation; statistics are counts only |
| Copies on the applicant's device | Browser local storage: unsaved draft answers (`ceda.draft.local.*`) and pending submit keys (`ceda.submit.key.*`) | Typing is never lost when the connection drops; a lost submit reply can be checked without creating a duplicate (APP-01, APP-03) | Anyone using that browser profile. **Rule: the frontend clears both on sign-out**, and draft copies once the server confirms the save (**Proposed**: requested in the review of PR #18, not built yet) |
| Audit trail | `audit_events` | Accountability (SEC-01, SEC-03) | Administrator and auditor. Contains who, what, when and outcome; **no passwords, no proposal text, no note text** |

**Data minimisation:** the form stores only fields the published challenge form defines (unknown fields are dropped); phone is optional; file names are kept as display names only, never in storage paths.

**No external AI:** no proposal data is sent to any AI service (D-25). The completeness meter and field help (INN-03) are rule-based.

## 2. How access is controlled

- **Server-side, not just hidden in the UI.** Row-level security is enabled on every table and denies by default. Browsers can only read; every change goes through a database function that checks the permission and the case state and writes the audit entry in the same transaction (D-02).
- **Roles and least privilege.** Nine roles with explicit permissions (contract §2). Nobody can grant a role to themselves; the attempt is refused and audited (N8). The external committee sees reference and stage only (D-08).
- **Staff MFA.** Staff permissions require a second factor (aal2). Seeded demo staff accounts are exempt behind a flag so judges can sign in (D-07); this exemption must be switched off for any real use.
- **Passwords** are handled by Supabase Auth (hashed; minimum length 12, set on hosted 19 Nov 2026 (spec T02); email confirmation required; neutral "if an account exists" recovery message). Auth rate limits apply to sign-in and recovery.
- **Transport.** The hosted site and Supabase endpoints are HTTPS only.
- **Evidence.** 463 pgTAP assertions, including negative tests N1–N11 and a privilege regression suite, **pass on the hosted project** (17 Nov 2026, migrations 001–012; run record `artifacts/phase-00/hosted-supabase.md`), on the Supabase local stack in CI and on the PGlite stand-in (contract §9). Browser-level checks (Playwright) are not run yet. The claim register states which claims are verified.

## 3. Proposed retention (D-15)

| Data | Proposed retention | Notes |
|---|---|---|
| Applicant records, proposals, versions, attachments, decisions, awards | 5 years after the case is closed | Proposal for CEDA to confirm. **Not automated** in the MVP |
| Draft never submitted | 12 months after last edit | Proposal; not automated |
| Audit trail and case history | Same as the case they belong to | Append-only by design; deletion would be a separate, approved archival process |
| Chat messages | 12 months | Proposal; not automated |
| Email queue rows | 90 days after acceptance | Proposal; not automated |
| **Demo deployment** | **Wiped after judging** (results on 3 December 2026) | All data is fictional |

Deletion of confidential rows is soft (`deleted_at`) so that Realtime never broadcasts a deleted row's content.

## 4. Data subjects' requests

Not automated in the MVP. Proposed process: the request goes to the portal administrator; access and correction are handled from the administrator views; deletion follows the retention rules above and is recorded in the audit trail.

## 5. Processors and location

| Processor | Role | Location |
|---|---|---|
| Supabase (Postgres, Auth, Storage, Realtime, Edge Functions) | Database, authentication, files | **EU Central (Frankfurt)**. Measured from Gaborone on mobile data: p50 263 ms, p95 315 ms (`artifacts/phase-00/region-latency.md`, D-14); the Mumbai comparison is not run. Free plan now; Pro recommended from judging (runbook §1) |
| Web hosting: AWS Amplify (`docs/process/hosting-aws-amplify.md`); staging `https://main.d270qrk6a7zs47.amplifyapp.com` | Serves the static frontend; holds no proposal data | AWS region to be recorded |
| SMTP provider | **None for the MVP** (deferred, 17 Nov 2026). Opt-in alerts are queued but not sent; the admin outbox view shows **Simulated** | — |

Data leaves Botswana because no African Supabase region exists. This is recorded as a known limitation for any real deployment.

## 6. Breach handling (proposed)

The named contact (backlog DEF-01/OPS-03) is alerted; affected access is revoked (role revoke, key rotation); the audit trail identifies what was read or changed; affected people and the regulator are informed as the Act requires. The audit trail is append-only, so it remains reliable evidence.

## 7. Known gaps (also in the contract's debt register)

- No malware scan on uploads; file type is checked from the declared content type, not the file's bytes.
- Retention and data-subject requests are manual.
- Demo staff MFA exemption (D-07) must be off for real use.
- The web host's region is still to be recorded; the Mumbai latency comparison is not run.
- Device copies (local storage) depend on the frontend clearing them on sign-out; on a shared computer, the applicant must sign out.

# Testing and evidence

**Fidelity note.** The section *Phase 7. Verification* is reproduced **verbatim** from `evidence-led-system-builder_skill.pdf`. Related source rules: core principle 13 (*Quality is a claim that needs evidence*) and the *How to behave* rule on never fabricating evidence, both in [engineering-principles.md](engineering-principles.md). Sections titled **CEDA adaptation (added)** are project-specific additions.

### Phase 7. Verification

Derive tests from requirements, contracts and failure cuts. Typical suite:

| Layer | Proves | Examples |
|---|---|---|
| Domain unit | Rules and refusals | stale version refused, state unchanged |
| Application | Orchestration and idempotency | retry returns saved result; conflicting reuse refused |
| Contract | Adapter mapping | supplier codes to Accepted, Rejected, Retryable, UnknownOutcome |
| Persistence integration | Constraints and transactions | duplicate pair rejected; audit and status commit together |
| Concurrency | Races | two simultaneous bookings produce one |
| Failure injection | Recovery | crash after commit; dependency timeout; restart resumes jobs within attempt limit |
| Security | Access and disclosure | denied caller triggers zero sensitive queries on every entry route |
| End to end and UI | User truth | lost reply shows unconfirmed, check finds the record |
| Accessibility and usability | Real use | keyboard path, announcements, participant understands status |
| Performance (when a scenario demands it) | Proposed targets | percentiles, not averages, with stated load |

Tests vary one condition at a time and assert preserved state, not just error labels. Test doubles prove only the collaboration they simulate. Record version, environment, command and result for every run.

## Test stack mapping — CEDA adaptation (added)

| Source layer | CEDA tool | CEDA examples |
|---|---|---|
| Domain unit | pgTAP on RPC functions | `record_award` on a not-approved case raises `CASE_NOT_APPROVED` and the `awards` and `proposals` rows are unchanged (before/after snapshot) |
| Application (orchestration, idempotency) | pgTAP | Same `client_request_id` + same content → same reference, one case. Same key + different content → `REQUEST_CONFLICT` (if `command_receipts` is approved) |
| Contract | Vitest | Email adapter maps provider 2xx/4xx/5xx/timeout to `Accepted`/`Rejected`/`Retryable`/`UnknownOutcome` |
| Persistence integration | pgTAP | Duplicate active assignment refused; status, `case_events` and `audit_events` commit together or not at all; V1 cannot be updated or deleted |
| Concurrency | Script issuing parallel RPC calls against a disposable database | Double submit creates one case; two concurrent `publish_decision` calls produce one publication event |
| Failure injection | Vitest/Edge Function test with a stubbed provider | Relay crash after commit resumes the row; provider timeout leaves `unknown_outcome`, not `rejected` |
| Security | pgTAP per seeded role + Playwright | Blueprint N1–N11: denied caller gets zero rows and no signed URL on every entry route (RPC, table, Storage, Realtime) |
| End to end and UI | Playwright in Chrome, Edge, Firefox + one mobile viewport | Blueprint §3.2 main journey; a lost reply on submit shows "Not confirmed yet" and the status check finds the reference |
| Accessibility and usability | Keyboard walkthrough + automated scan + short task check | Keyboard path through T04/T09/T10; status announcements on T06/T11. Automated scans cover only part of WCAG and are labelled so |
| Performance (QA-01) | Timed sample on the hosted build | p95 for key tasks with stated sample size, network and device |

## Evidence records — CEDA adaptation (added)

Evidence follows the blueprint skill's artifact standard (`references/delivery-and-evidence.md` in project-blueprint-builder):

```text
artifacts/phase-NN/
├── README.md                 # commit, environment, date, testers, results, security/isolation status, defects, accept/reject decision
├── automated-test-summary.txt
├── manual-test-cases.md
├── api-evidence/             # if applicable
├── screenshots/              # if applicable
├── accessibility/            # if applicable
└── defects.md
```

Every run record states: **commit SHA, environment (local/staging/hosted URL), command, date (UTC and CAT), who ran it, and the quoted result**. Large binaries stay in CI artifact storage. No personal data, secrets or real proposals in evidence.

## Claim register — CEDA adaptation (added)

Applies source principle 13 in this format (kept in `docs/testing/claim-register.md`, one row per claim made in the proposal, README, manual or demo):

| Claim | Proposed check | Observed result | Evidence link | Unresolved gap |
|---|---|---|---|---|
| Applicant B cannot read Applicant A's proposal | pgTAP `n1_cross_applicant` + Playwright N1 | *Not run* | — | — |

## Status vocabulary — CEDA adaptation (added)

| Word | Meaning | Allowed only when |
|---|---|---|
| **Passed** | The check ran and met its expectation | A run record with quoted output exists |
| **Failed** | The check ran and did not meet its expectation | A run record exists; a defect is logged |
| **Not run** | The check exists or is planned but has no run record | Default for every check |
| **Proposed** | A target or value awaiting agreement | Targets, timeouts, retention, response times |
| **Implemented — not verified** | Code merged but no passing check yet | Code exists in the named commit |
| **Simulated** | A labelled stand-in, visible as such in the UI | Blueprint classification "Simulated" |
| **Deferred** | Not built; named in the proposal | Blueprint classification "Deferred" |

## What is not evidence — CEDA adaptation (added)

- A screenshot without the commit and environment it came from.
- A test that passed only against mocks, presented as proof of database or RLS behaviour (test doubles prove only the collaboration they simulate).
- A UI that hides a button, presented as proof of access control.
- A local run presented as proof of the hosted build.
- A provider's acceptance response presented as proof of delivery.

## Pre-submission checks — CEDA adaptation (added)

From the backlog: before the final upload, run one complete journey and one permission-denied journey **on the hosted build** and record the exact version tested. The security suite (SEC-02) and browser/device log (QA-01) are attached to the final artifact folder with unrun checks labelled.

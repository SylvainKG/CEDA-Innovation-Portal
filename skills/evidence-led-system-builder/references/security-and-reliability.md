# Security and reliability

**Fidelity note.** Sections that keep the original headings (*Phase 5*, *Observability*, *Performance and scale*, *IoT, devices and offline systems*) are reproduced **verbatim** from `evidence-led-system-builder_skill.pdf`. Sections titled **CEDA adaptation (added)** are project-specific additions. Where the hackathon scales a practice down, the reduction is stated and recorded as debt; the safeguard's intent is never dropped silently.

### Phase 5. Harden: failures, security, privacy (Topics 4, 7 and 8)

**Reliability recipes**

- *Idempotent command:* authenticate → authorise → find receipt by (actor, operation, key) → same fingerprint returns saved result, different fingerprint returns `RequestConflict` → otherwise execute and store receipt in the same transaction.
- *Transactional outbox:* write the business change and outbox row in one transaction; a relay publishes later and marks it published. Delivery is at least once.
- *Idempotent consumer:* store `processed_event(event_id)` atomically with the consumer's own effect.
- *Concurrency:* unique constraints for one per pair rules, conditional updates for state transitions, optimistic versions for edits; test with real concurrent requests.
- *Retries:* one owner with enough context; other layers make one attempt. Compute worst case calls (multiply attempts per layer) and time budget (attempts × timeout + waits) against the deadline. Persist attempt counts. Use exponential backoff with jitter. Retry only `Retryable` outcomes; reconcile `UnknownOutcome` before repeating unless the supplier supports idempotency keys.
- *Protection:* timeouts on every remote call, circuit breakers for persistently failing dependencies, load shedding and rate limits, bounded queues with an owner for dead letters.
- *Recovery:* workers resume committed jobs after restart; stuck work is visible by age, not just count.

**Security checklist** (use OWASP ASVS as the reference scope; never claim conformance from a few tests)

- Identify assets, actors and trust boundaries; trace every entry point (web, API, scheduled job, CLI, queue consumer, device).
- Enforce authorisation in the shared application path, not in a single controller; deny by default; never let a policy outage become Allow.
- Decide before disclosing: evaluate policy with minimal facts, then fetch only the fields needed (projections).
- Validate input at the boundary (type, length, format) and re-check business rules in the domain. Use parameterised queries; encode output; protect against XSS, CSRF and SSRF where relevant.
- Passwords hashed with a modern adaptive algorithm; sessions and tokens with expiry and rotation; least privilege for service accounts and database users.
- Secrets in environment or a secret store, never in the repository, logs or client code. Rotate on exposure.
- Keep dependencies pinned and scanned; remove unused ones.
- Audit records for accountability (who, what, when, outcome) are append only; operational logs avoid message bodies, credentials and unnecessary personal data.
- Data minimisation and retention rules per field; synthetic or anonymised data in development and in student repositories.

## Reliability application — CEDA adaptation (added)

| Source recipe | CEDA application | Status vs approved blueprint |
|---|---|---|
| Idempotent command | `submit_proposal` uses `client_request_id` (unique) and returns the original reference on retry | In blueprint v0.2 |
| Idempotent command (full form) | A generic `command_receipts(actor_id, operation, request_key, fingerprint, result, created_at)` table used by **every** workflow RPC. Same key + same fingerprint → saved result; same key + different fingerprint → `REQUEST_CONFLICT` | **Proposed: needs a blueprint change request.** v0.2 covers submit only |
| Transactional outbox | `email_outbox` row written in the same transaction as the status change; an Edge Function relay sends later; delivery is at least once | In blueprint v0.2 |
| Outcome vocabulary | `email_outbox.status`: `pending · accepted · rejected · retryable · unknown_outcome` (with `attempts`, `last_attempt_at`, `next_attempt_at`) instead of `pending · sent · failed` | **Proposed: needs a blueprint change request.** "sent"/"failed" overstate what is observed (principle 2) |
| Idempotent consumer | The relay records the provider message ID and only processes `pending`/`retryable` rows it has claimed with a conditional update | Added detail within v0.2 scope |
| Concurrency | Conditional updates `UPDATE proposals SET status = $new WHERE id = $id AND status = $expected` (zero rows → `INVALID_STATE`); unique constraints listed in blueprint §4; real parallel-request tests | Within v0.2 scope |
| Optimistic version | `proposals.row_version` checked by every RPC that changes the case | **Proposed: needs a blueprint change request** |
| Retries | Single owner: the outbox relay. Maximum attempts and timeout are **proposed** values (e.g. 5 attempts, 10 s timeout, exponential backoff with jitter) until the team agrees them. The browser makes one attempt per user action and reuses the key | Values proposed |
| Protection | Timeouts on every remote call (required). Auth rate limiting through Supabase Auth (required). Circuit breakers, load shedding and bounded dead-letter queues: **deferred for the MVP**, recorded in the debt register with the trigger "real traffic or a second external provider" | Scaled down, recorded |
| Recovery | The relay resumes `pending`/`retryable` rows after restart; the admin view shows pending count and oldest pending age if time allows | Partly proposed |

## Security application — CEDA adaptation (added)

- **Assets:** proposal text and attachments, scores, internal notes, unpublished decisions (confidential IP); personal data. **Trust boundaries:** browser ↔ PostgREST/RPC, browser ↔ Storage, Edge Function ↔ email provider, Realtime subscriptions.
- **Entry points to trace:** every RPC, every table/view exposed by PostgREST, Storage signed-URL generation, Realtime channels, Edge Functions, seed scripts.
- **Authorisation in the shared path:** RLS on every table (default deny) plus checks inside every RPC. A failed permission lookup raises an error; it never falls through to allow.
- **Decide before disclosing:** use views/projections that expose only the fields a role needs (for example, the committee member's status-only view). The reviewer declaration gate is checked before any proposal field or file URL is returned.
- **Files:** private bucket, case-scoped paths, content-type check by file content, size limit, 60-second signed URLs, download only (security design PDF).
- **Audit:** `audit_events` is insert-only for every role and written inside the RPC; it never contains passwords or proposal text.
- **Secrets:** the service-role key exists only in Edge Function secrets; `.env.example` lists names only; secret scanning runs in CI.
- **Privacy:** fictional seed data only; no proposal data to external AI services (blueprint D-25); data-handling note phrased as "designed with reference to the Data Protection Act, 2024", never "compliant" (D-18).
- **Realtime:** delete events bypass RLS filtering, so confidential tables use soft delete (security design PDF).
- **ASVS:** used as the reference scope for the review checklist; results are reported per control tested, never as conformance.
- **Threat model:** the security design PDF's threat table and blueprint negative tests N1–N11 are the minimum security test set.

## Observability

- Correlate request_id, actor, entity IDs, job_id and attempt_id across logs, metrics and traces.
- Structured logs with level and outcome; no secrets or message bodies.
- Metrics that answer quality questions: latency percentiles, error rates by stable error, pending job count, age of oldest pending job, attempts per job, unknown outcomes awaiting reconciliation.
- Alerts only with a named responder and a runbook step. A running process is not proof of progress.

## Observability application — CEDA adaptation (added)

- Each workflow command carries a client-generated `request_id`, passed to the RPC and stored in `audit_events.metadata`. Edge Function logs include it.
- Edge Function logs are structured (level, outcome, request_id, outbox_id, attempt); no message bodies, tokens or proposal content.
- Minimum signals for the MVP: uptime monitor on the hosted URL (backlog OPS-01/OPS-03), outbox pending count and oldest pending age, error counts by stable error code in Edge Function logs.
- Every alert names a responder (backlog DEF-01/OPS-03 contact) and a runbook step in `docs/runbook.md`.

## Performance and scale

- Avoid N+1 queries: use projections, joins or batched fetching sized to the use case; measure query counts.
- Paginate lists; index columns used for lookups, uniqueness and ordering.
- Cache only with an owner, freshness rule and invalidation path; label cached data with its age.
- Capacity arithmetic: required rate = items to process ÷ allowed time; treat it as a lower bound.

## Performance application — CEDA adaptation (added)

- Lists paginate at 50 rows; indexes on foreign keys, `proposals.status`, `proposals.reference`, `audit_events(proposal_id, at)`, `case_events(proposal_id, at)`.
- Response targets are the **proposed** values in blueprint D-16 until agreed; QA-01 reports p95 with the sample size and environment, never averages alone.
- Reports aggregate in SQL (views or RPCs), not in the browser.

## IoT, devices and offline systems

- Devices are external actors behind a trust boundary: authenticate each device individually, authorise per device and per topic, rotate credentials, and treat device data as untrusted input.
- Telemetry is usually at least once: give each reading a device_id plus sequence or message ID and deduplicate on ingest.
- Separate device time from server receipt time; detect clock drift; never use device time for security decisions.
- Offline first clients and devices keep a durable local queue with stable request keys; show "stored on device, not sent" honestly; reconcile on reconnect.
- Commands to devices need acknowledgement states (sent, delivered, applied, unknown) and timeouts; never mark applied without device evidence.
- Firmware and configuration updates: signed images, staged rollout, rollback partition or safe mode, and compatibility between firmware and server message versions.
- Budget for constrained power, bandwidth and storage: batch uploads, compress, and define what is dropped when buffers fill.
- Edge AI or analytics outputs are evidence with confidence and model version, not authoritative facts; keep the raw data needed to audit decisions.

## Applicability — CEDA adaptation (added)

The CEDA MVP has no devices, telemetry or firmware; those rules are retained for completeness and do not generate work. The **offline-first client** rules do apply to the proposal form (T04): a durable local draft backup, a stable `client_request_id`, the message "Saved on this device, not sent", and reconciliation with the server draft on reconnect.

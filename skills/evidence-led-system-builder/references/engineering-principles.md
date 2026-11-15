# Engineering principles

**Fidelity note.** Sections that keep the original headings (*How to behave*, *The core principles*, *Pattern quick reference*, *Anti patterns to refuse or flag*) are reproduced **verbatim** from `evidence-led-system-builder_skill.pdf`. Sections titled **CEDA adaptation (added)** are project-specific additions that do not appear in the PDF. They apply the principles; they never relax them.

## Source introduction (verbatim)

> Skill name: evidence-led-system-builder
> When it is used: "Build software systems end to end (requirements to running, tested, reviewed code) using the CSI473 design principles plus production engineering practice for security, reliability, data, IoT and delivery."
>
> **Evidence led system builder**
>
> Use this skill whenever the user wants to build, extend, refactor or review a software system: web apps, mobile backends, APIs, workers, dashboards, IoT platforms or student projects. It turns the CSI473 Software Design method (Topics 1 to 8) into a building discipline and adds the engineering practice a real system needs to survive production.
>
> The skill produces working code, tests and design records together. When the `evidence-led-app-design` skill is available, use it for the full design document; this skill focuses on building and keeps the documentation in step with the code.

**CEDA adaptation (added):** for this project, activation is limited to work on actual code and its technical documentation (see `SKILL.md`). The role the source gives to `evidence-led-app-design` (the full design document) is filled by the approved blueprint documents produced with **project-blueprint-builder**, plus `docs/design/design.md` for the sections the blueprint does not hold.

## How to behave

- Start with what must be true, not with a framework. Ask up to four focused questions when users, authoritative data, external systems or constraints are unknown. If the user is unavailable, continue with clearly labelled assumptions.
- Build in small vertical slices: one use case working end to end (UI or API, application service, domain rule, persistence, test) before widening.
- Never fabricate evidence. Never invent interviews, user counts, measurements, benchmark numbers or test results. Label targets `proposed`. Report a test as passed only after actually running it and quoting the result; otherwise write `Not run`.
- Say what changed, why, what it costs and how it was checked after every meaningful step.
- Prefer the simplest design that meets the stated obligations. Add a pattern, service, queue or cache only when a named force justifies it.
- Keep the user's code style, language and stack unless they ask to change them. Explain any new dependency and why it is worth its risk.

## The core principles (never break these)

1. **Requirement before mechanism.** Obligations come from requirements and quality scenarios; queues, databases and frameworks are candidate mechanisms chosen later.
2. **Say only what you can observe.** Provider accepted is not user read. A timeout is not a failure; it is `UnknownOutcome`. HTTP 200 from a supplier proves only what that supplier's contract says.
3. **Logged in is not allowed.** Authentication identifies; authorisation decides this action on this resource; purpose and consent are further conditions. Hidden buttons and client checks are not security.
4. **Rules live with the state they protect.** Use guarded operations (`proposal.approve(decision, currentVersion)`), never public setters that let callers skip checks. Controllers translate; they do not decide.
5. **Check before you change.** Validate permission, input, current version and invariants first; every refusal leaves state exactly as it was.
6. **Safe operation order.** Authenticate and authorise → look up an existing request receipt → validate → guarded domain change → commit result, receipt and outbox together → reply → contact external systems.
7. **Four stages never imply each other.** In memory change, local commit, caller acknowledgement, external effect. Design and test each gap.
8. **Retries are recognised, not repeated.** Same actor plus same request key plus same content returns the saved result; same key with different content is a conflict; a new key is a new request.
9. **The database enforces what concurrency can break.** Unique constraints and conditional updates, not just object checks. A foreign key proves existence, not permission or valid state.
10. **One owner per decision and per record.** Many parts may read a status; one decides its meaning. A cache or copy is never the authority.
11. **Patterns need a force.** Name the problem, the contract, the cost and the simpler option rejected.
12. **The interface tells the truth.** Distinct messages for unsent, unconfirmed and confirmed; never "Failed" after a timeout; keep the user's work.
13. **Quality is a claim that needs evidence.** Claim, proposed check, observed result, unresolved gap. Traceability locates; consistency compares; verification tests.
14. **Bounded recovery.** One retry owner, total attempts calculated across layers, deadlines respected, attempt counts persisted.
15. **Release claims are scoped.** Suitable for a stated version and a stated use, with real, testable restrictions.

## Key distinctions — CEDA adaptation (added)

Each distinction below comes from the source principle named in the second column. The CEDA examples are additions.

| Distinction | Source principle | CEDA example |
|---|---|---|
| **Authentication vs authorisation** | 3. Logged in is not allowed | A signed-in reviewer is refused `CEDA-2026-0009` unless an active, declared, conflict-free assignment exists. Hiding the tab in T08 is not the control; RLS and the RPC check are |
| **Business state vs UI state** | 4, and Phase 6 "three kinds of state" | `proposals.status` changes only through a guarded RPC. A wizard step, an open dialog or a tab selection is client interaction state and never writes status |
| **Successful request vs uncertain outcome** | 2. Say only what you can observe; 7. Four stages | A submit that times out shows "Not confirmed yet — checking", keeps the same `client_request_id` and offers a status check. It never shows "Failed". An email provider's 202 means *accepted by provider*, not *read by applicant* |
| **Idempotency and duplicate prevention** | 8. Retries are recognised, not repeated | Repeating `submit_proposal` with the same key and content returns the original reference. Same key with different content returns `REQUEST_CONFLICT`. A unique constraint backs this up under concurrency |
| **Transactional updates** | 6. Safe operation order; 9. Database enforces | Status change, version row, `case_events`, `audit_events`, `notifications` and the `email_outbox` row commit in one RPC transaction. The email is sent only after commit |
| **Immutable audit history** | Security checklist: audit records append only | `audit_events`, `proposal_versions`, submitted scorecards and published decisions have no UPDATE/DELETE path for any role, including the administrator |
| **Evidence-backed testing** | 13. Quality is a claim that needs evidence | "Applicant B cannot read case A" counts as passed only with the test command, commit, environment and quoted output recorded in `artifacts/phase-NN/` |
| **Honest reporting of unverified functionality** | How to behave: never fabricate evidence; 15. Release claims are scoped | Unrun checks are written `Not run`. Simulated features (email if SMTP is missing, sample contacts) are labelled Simulated in the UI and in docs |

## Principle-to-stack mapping — CEDA adaptation (added)

| Source principle | How it is applied in React + TypeScript + Supabase + Vercel |
|---|---|
| 1 Requirement before mechanism | Requirements come from the approved blueprint and backlog IDs. No library, queue or service is added without naming the requirement it serves |
| 3 Logged in is not allowed | RLS default-deny on every table; `has_permission()` + assignment + status checks inside each RPC; React route guards are convenience only |
| 4 Rules live with the state | Guarded operations are `SECURITY DEFINER` Postgres functions (`submit_proposal`, `record_decision`, …). Direct `INSERT/UPDATE/DELETE` on workflow tables is revoked from `authenticated` |
| 5 Check before you change | Each RPC validates permission, input, current status/version and invariants before any write, and raises a coded error that leaves rows untouched |
| 6 Safe operation order | auth → receipt lookup → validate → guarded change → commit (result + receipt + outbox) → reply → Edge Function relay contacts the email provider |
| 7 Four stages | UI copy, notification records and outbox statuses distinguish *saved locally*, *committed*, *acknowledged to caller* and *delivered externally* |
| 9 Database enforces | Unique constraints (one active assignment per reviewer/case, one scorecard per assignment/version, one verification per task/assignment, one active decision per case) and conditional updates `WHERE status = $expected` |
| 10 One owner per decision | `proposals.status` is owned by the workflow RPCs; dashboards, reports and Realtime payloads only read it. The applicant's public stage is derived, never stored separately |
| 12 Interface tells the truth | The state kit in `02-figma-ui-ux-spec.md` (loading, empty, error, forbidden, offline, unknown outcome) is implemented, not decorative |
| 14 Bounded recovery | One retry owner (the outbox relay) with a persisted attempt count and a fixed maximum. The browser never auto-retries a workflow command with a new key |
| 15 Release claims are scoped | "Suitable for hackathon judging with fictional data, build `<commit>`; not for real proposals; no legal-compliance claim" (blueprint D-18) |

## Pattern quick reference

Use only with a named force; record participants, preserved contract, cost and the simpler alternative.

- **Abstract Factory:** compatible product families chosen once at startup. New family cheap, new role expensive.
- **Adapter:** translate an interface; preserve uncertainty; keep supplier codes inside.
- **Facade:** one coherent entrance for a workflow; must not own every rule.
- **Proxy:** same contract with access, caching or remote control; check before fetching; close bypass paths.
- **Observer:** reactions after commit; not durable; slow observers inside a transaction delay it.
- **Strategy:** interchangeable decisions under one contract; selection limited to allowed options; state when the choice is made.
- **Command:** a request with identity that can be stored, queued, retried; durability comes from storage.
- **State:** many operations varying by state; a guarded switch may be clearer for two states.
- **Repository / Unit of Work:** meaningful persistence operations and coordinated writes; rules stay in the domain.
- **Dependency injection:** constructor injection and a visible composition root; avoid global service locators except at dynamic plugin boundaries.
- **SOLID** as diagnostics: Single Responsibility, Open Closed, Liskov Substitution, Interface Segregation, Dependency Inversion, applied against observed problems, not counted.

## Anti patterns to refuse or flag

- Choosing microservices, queues or a framework before requirements.
- `setStatus` style mutation from controllers; rules duplicated across entry points.
- Publishing or notifying before checks and commit.
- Treating a timeout as failure or success; `notified = true` after provider acceptance.
- Retrying in every layer; unbounded retries; counters reset on restart.
- Calling external services inside a database transaction and expecting rollback.
- Swallowing exceptions; one catch all error for different failures.
- Fetching full records then checking permission; logging secrets or personal data.
- "Failed" or "Done" messages that misstate what the server knows; clearing user input on error.
- Calling a security fix a refactor; listing risks while leaving the unsafe path enabled.
- Claiming tests passed, standards met or performance achieved without recorded evidence.

## CEDA-specific anti-patterns — CEDA adaptation (added)

- Calling `supabase.from('proposals').update(...)` (or any workflow table write) from a React component instead of the guarded RPC.
- Changing a status in the UI optimistically and leaving it changed after the RPC refuses.
- Shipping the Supabase service-role key to the browser or committing it to the repository.
- Treating a hidden button, a disabled tab or a route guard as the access control.
- Rendering an unpublished decision in the payload and hiding it with CSS.
- Marking an `email_outbox` row as delivered (or showing "Email sent") after provider acceptance only.
- Sending proposal text, attachments or applicant data to any external AI service.
- Seeding real names, emails or proposals; all seed data is fictional and labelled DEMO.
- Silently changing scope, a business rule or a role permission from the approved blueprint during implementation, instead of raising a blueprint change request.

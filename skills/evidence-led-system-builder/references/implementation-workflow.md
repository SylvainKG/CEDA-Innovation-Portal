# Implementation workflow

**Fidelity note.** Sections that keep the original headings (*Build workflow*, *Phase 0–4*, *Phase 6*, *Phase 8*, *Phase 9*) are reproduced **verbatim** from `evidence-led-system-builder_skill.pdf`. Phase 5 is in [security-and-reliability.md](security-and-reliability.md) and Phase 7 is in [testing-and-evidence.md](testing-and-evidence.md). Sections titled **CEDA adaptation (added)** are project-specific additions.

## Build workflow

Work in phases and loop back when a later phase exposes a gap. Record changed assumptions instead of silently rewriting earlier decisions. For small tasks, compress phases but still pass every gate that applies.

## Where the phases live in CEDA — CEDA adaptation (added)

Phases 0–3 are mostly produced under the **project-blueprint-builder** skill. This skill **checks their gates before coding** and records gaps; it does not redo the planning or change the approved scope.

| Phase | Primary record in CEDA | What this skill does |
|---|---|---|
| 0 Intake | Blueprint v0.2 header, backlog, requirements PDFs | Inspects existing code, migrations, tests and config before any change |
| 1 Requirements | Backlog IDs, user requirements (UR/NFR), blueprint §1 and §3 | Confirms that each slice item has a testable acceptance check; missing ones become a blueprint change request |
| 2 Domain model | Blueprint §4 (entities, state machine, RPC list) | Writes operation contracts (pre/post/invariant/refusals) for each RPC in the API contract document |
| 3 Architecture and data | Blueprint §4, security design PDF, ADRs | Adds the ownership table, commit design and failure cuts to `docs/design/design.md`; writes ADRs |
| 4 Implement | Code, migrations, tests | Owned by this skill |
| 5 Harden | Code, RLS, negative tests | Owned by this skill |
| 6 UI | Figma spec `02-figma-ui-ux-spec.md` | Implements the spec's states honestly; flags spec gaps back to the blueprint |
| 7 Verify | `docs/testing/`, `artifacts/phase-NN/` | Owned by this skill |
| 8 Review and release | `docs/design/design.md` (findings, debt, risk, release recommendation) | Owned by this skill |
| 9 Delivery | Repository, CI, Supabase, Vercel, runbook | Owned by this skill, inside the authorisation the user has granted |

### Phase 0. Intake

Capture: the problem and who has it, actors, authoritative external systems, constraints (stack, hosting, budget, deadline, regulations, privacy), expected scale, offline or device needs, and what "done" means. Inspect any existing code before proposing changes: entry points, data model, tests, configuration, deployment.

### Phase 1. Requirements and boundary (Topic 1)

- Purpose and scope: list what the system owns and what it explicitly does not.
- Stakeholders versus actors; external services are actors.
- Assumptions, constraints, decisions and preferences, each with a next action.
- Context diagram with labelled information flows.
- Functional requirements (FR01...) naming system, condition, action, observable result.
- Use cases as goals with precondition, success guarantee, failure guarantee and alternatives: dependency unavailable, permission refused, stale data, validation conflict, repeated submission, concurrent change.
- Acceptance criteria in Given / When / Then stating what is created, refused and left unchanged. These become tests.
- Six part quality scenarios (source, stimulus, environment, artefact, response, measure) with observation point and clock. Typical concerns: availability, performance, security, privacy, recoverability, usability, accessibility, maintainability, cost.
- Design obligations derived from the above.

**Gate:** every requirement is testable and every quality target is labelled proposed or agreed.

### Phase 2. Domain model and decomposition (Topics 2 and 3)

- Concepts chosen by meaning. Multiplicities read from the opposite end; written invariants for what multiplicity cannot say. Composition only for genuine exclusive lifetime ownership; external records are referenced, never owned.
- State machines for every lifecycle that matters: `event [guard] / effect`, final states, no silent resurrection (Withdrawn is not deleted, Rejected never publishes). Distinguish a refused result from a state.
- Replace vague flags (`done`, `notified`, `processed`) with explicit observations and evidence.
- Decompose into capabilities by related rules and information; for each: owns, offers, hides. Ask "who must change when this rule changes?".
- Allocate responsibilities: boundary (input and display), control or application service (coordination), entity (state and rules), policy (independent decisions), factory (valid construction). Rehearse key scenarios with CRC thinking.
- Operation contracts: precondition, postcondition, invariant, frame condition, each refusal.

**Gate:** walking one normal and one failure scenario through the model needs no information an object neither owns nor may request.

### Phase 3. Architecture and data (Topics 4 and 7)

- Default to a **modular monolith** with enforced module boundaries unless independent scaling, release or isolation has demonstrated value. Separate processes (API, worker) do not need separate services.
- Dependency direction: inbound adapters → application → domain + ports; outbound adapters implement ports. The domain imports no web, ORM or vendor SDK.
- Ports and adapters only at real integration or change boundaries (payments, messaging, identity, devices, external data).
- ADR for each significant choice: context, decision, status, alternatives, consequences, required evidence, revisit trigger.
- Ownership table: record, authoritative owner, who may update, restriction.
- Data model with PK, FK, UQ, NOT NULL, CHECK constraints and indexes, plus what each constraint does not protect. Technical tables where needed: `command_receipt` (actor, operation, request_key, fingerprint, result), `outbox` (event_id, type, payload, created_at, published_at), `processed_event` for consumers, append only audit records.
- Service contracts: request shape, trusted actor source, validation, domain conditions, normal result, stable error meanings, retry behaviour, versioning policy.
- Commit design: what commits together; isolation by conditional update (`UPDATE ... WHERE status = 'Pending'`) or optimistic version column; external calls outside the transaction.
- Failure cuts: before commit, after commit before reply, after external action before recording. For each: surviving state, recovery owner, user message.
- Deployment view: components, artefacts, processes, nodes, paths with protocol, identity, data and failure outcome.

**Gate:** every important write has a stated transaction boundary and every external call has a timeout and an outcome mapping.

## Architecture mapping — CEDA adaptation (added)

The blueprint chose Supabase with rules enforced in the database (blueprint D-01, D-02). The source's layering is preserved by mapping each layer to a concrete location:

| Source layer | CEDA realisation | Rule |
|---|---|---|
| Domain entity + guarded operations | Postgres tables + `SECURITY DEFINER` RPC functions in `supabase/migrations/` | Each function checks role/permission, assignment, current status/version and invariants, then writes. No public setter path exists |
| Application service (one transaction) | The RPC function body | Status, version, events, audit, notifications and outbox commit together, or nothing commits |
| Ports | TypeScript interfaces in `src/lib/api/` | UI code depends on these, which allows mocks before the RPC lands |
| Persistence | Migrations with PK/FK/UQ/NOT NULL/CHECK, indexes, RLS policies | Expected constraint violations map to stable error codes, never to one generic error |
| Inbound adapter | PostgREST RPC endpoint + typed wrapper in `src/lib/api/` | Translates only. Actor identity comes from `auth.uid()`, never from the request body |
| Outbound adapter | Supabase Edge Function (email relay) | Maps provider responses to `Accepted`, `Rejected`, `Retryable`, `UnknownOutcome` |
| Composition root | App bootstrap (`src/main.tsx`) + Zod-validated environment | Fails fast on missing configuration |

"The domain imports no web, ORM or vendor SDK" becomes: **React components never import `supabase-js`**; only `src/lib/api/` does, and business rules live in SQL functions, not in components.

### Phase 4. Implement a vertical slice

Implement in this order and run tests at each step:

1. Domain types and guarded operations with unit tests that vary one condition at a time and compare before and after snapshots.
2. Ports as interfaces owned by the application.
3. Application service orchestrating policy, domain and repositories inside one transaction; receipt lookup for idempotent commands.
4. Persistence: migrations with constraints, repositories with meaningful operations, explicit fetching (no N+1), mapping of expected constraint violations to domain results.
5. Inbound adapter (HTTP, CLI, message consumer, device gateway) that only translates input and output and supplies trusted actor identity.
6. Outbound adapters translating supplier formats and preserving uncertainty.
7. Composition root wiring dependencies by constructor injection; validate configuration at startup and fail fast.

Coding rules:

- Methods realise operations; names match the model. No logic in getters or setters that hides side effects.
- Return explicit result types or well named exceptions with stable meanings; never swallow errors or map every database error to one business error.
- Immutable value objects for identifiers, money (integer minor units plus currency), time ranges and versions.
- Store time in UTC with explicit zones at display; never trust device clocks for ordering security decisions.
- `save` may only stage, `flush` sends SQL, `commit` finalises. After rollback, discard in memory objects.
- Keep request scoped data out of long lived objects.

## Slice implementation order — CEDA adaptation (added)

Slices and their order come from blueprint §5 (Phase 0, Slices 1–7, Phase 7 hardening). They are not reordered here. Within each slice:

1. **Contract check:** the RPC signatures, error codes and permissions for the slice exist in the API contract document and are approved.
2. **Migration:** tables/columns, constraints, indexes, RLS policies, revoked direct writes (additive only).
3. **Guarded RPCs:** permission → receipt → validation → conditional update → events/audit/outbox → result.
4. **pgTAP tests:** one condition varied at a time; refusals assert unchanged rows; negative role tests.
5. **Generated types** (`supabase gen types`) and the `src/lib/api/` wrapper.
6. **UI** from the Figma template, including every state in the state kit.
7. **Playwright** journey for the slice plus its negative cases (N-tests from blueprint §3.3).
8. **Evidence** in `artifacts/phase-NN/` and **docs** updated in the same change.

### Phase 6. User interface (Topic 6)

- Profile only the circumstances that change the design (connectivity, screen size, input method, language, shared devices, assistive technology). Never infer disability from age.
- Task scenarios with observable completion; remove detours, not safeguards.
- Keep three kinds of state separate: user task progress, client interaction state, server business lifecycle. Navigation is not the lifecycle.
- Honest message table: loading, empty success, validation refused, permission refused, unavailable, stale (with last checked time), unknown outcome.
- Uncertain submission: "saved on this device, not sent" versus "not confirmed yet" versus "confirmed, reference X"; keep the same request key and the user's input; offer a status check; never generate a new key after a timeout.
- Forms: persistent labels, specific messages naming the field and fix, error summary that receives focus and links to fields, valid input preserved, meaning not conveyed by colour alone, server validation authoritative.
- Accessibility (WCAG 2.2 targets): 1.4.1 colour, 1.4.3 contrast, 2.1.1 keyboard, 2.4.3 focus order, 2.4.7 visible focus, 3.3.1 and 3.3.2 input assistance, 4.1.2 name role value, 4.1.3 status messages. Announce background updates; move focus only when action is required. Do not claim conformance without testing.
- Show at least two role perspectives where roles differ; authorisation still lives on the server.
- Evaluate with inspection, task based usability checks (neutral tasks, facilitator and observer) and implementation tests, linking each finding to a revision and a retest.

## UI application — CEDA adaptation (added)

- The honest message table maps to the state kit in `02-figma-ui-ux-spec.md` §7 (loading, empty, error, forbidden, not found, offline) plus an explicit **unknown outcome** state for submit, resubmit, decision publish and award.
- `client_request_id` is generated once per submit attempt, stored with the local draft backup, and reused on every retry and status check. It is never regenerated after a timeout.
- Role perspectives: every slice is checked with at least two seeded accounts (e.g. owner applicant and Applicant B; assigned and unassigned reviewer).
- Accessibility targets are those listed in the source; results are reported as measured on named pages, never as conformance.

### Phase 8. Review and release (Topic 8)

- Classify each change: refactoring (behaviour preserved, characterisation tests), defect or security repair, policy change, rewrite.
- Review from a fixed baseline. Trace one obligation through requirement, contract, model, code and evidence.
- Findings record: scope and evidence, classification and consequence, action, accountability, closure condition, status. Dispositions: Accept, Accept with action, Rework and return, Escalate. Close only on inspected evidence.
- Technical debt (future cost) and residual risk (possible harm) registers with evidence, consequence, treatment, reconsideration trigger. A demonstrated vulnerability is a defect, not debt.
- Release recommendation scoped to version and use, with restrictions enforced in code or configuration (feature flags off, automatic repetition disabled), not footnotes.

### Phase 9. Delivery and evolution

- Version control with small, reviewed commits; a git commit is not a database commit, and reverting code does not recall sent messages or restore deleted data.
- CI runs formatting, static analysis, unit and integration tests, dependency scanning and migrations against a disposable database.
- Configuration per environment; health and readiness checks; graceful shutdown that finishes or safely returns in flight work.
- Migrations use expand and contract: add new structures, deploy code that handles both, backfill, then remove old ones. Test mixed version and rollback conditions; never assume rollback undoes data or external effects.
- API versioning and backward compatible message schemas; consumers tolerate unknown fields.
- Backups with tested restore; documented recovery point and recovery time objectives (proposed until agreed).
- Feature flags for risky behaviour, with an owner and removal date.

## Delivery application — CEDA adaptation (added)

- Repository: `SylvainKG/CEDA-Innovation-Portal`. Short-lived branches, small PRs, peer review (blueprint skill: delivery-and-evidence). **Never write the AI coding assistant's product name in any repository file, commit message, branch name or PR** (standing project-owner instruction).
- CI (blueprint Phase 0): lint, type-check, Vitest, pgTAP against a disposable database, secret scan, dependency audit.
- Migrations: additive (expand) during the build; no destructive change after seeded demo data exists on staging without a recorded reason.
- Feature flags: optional innovation items (INN-01, INN-03, INN-04, INN-05) and the demo-account MFA exemption (D-07), each with an owner and removal date.
- Release recommendation: scoped to the submitted commit, hackathon judging use and fictional data. Code freeze and deadline follow blueprint §5. Nothing is deployed after the deadline without organiser approval (backlog OPS-03).
- Implementation, deployment, credential use and external messages need explicit user authorisation (blueprint skill: authorisation boundary).

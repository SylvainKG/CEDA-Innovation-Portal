# Documentation standards

**Fidelity note.** The sections *Documentation produced alongside the code* and *Definition of done for each slice* are reproduced **verbatim** from `evidence-led-system-builder_skill.pdf`. Sections titled **CEDA adaptation (added)** are project-specific additions. They map the source's document set onto the documents CEDA already has, so nothing is duplicated.

## Documentation produced alongside the code

In a repository, maintain:

- `docs/design/design.md` (full structure from `evidence-led-app-design` when available; otherwise: overview and scope, requirements and use cases, quality scenarios, domain model and lifecycles, architecture and ownership, data model, service contracts, failure cuts and recovery, security and privacy, UI states, test plan and results, traceability matrix, debt and risk, release recommendation, open questions).
- `docs/adr/ADR-NNN-title.md` for each significant decision.
- `docs/runbook.md`: start, stop, configuration, health checks, alerts and their responses, backup and restore, recovering stuck jobs.
- `README.md`: purpose, setup, how to run tests, environment variables (names only), project structure.
- `CHANGELOG.md` with change classification (refactor, repair, policy change, feature).

Diagrams in Mermaid with a legend stating what arrows mean. Keep docs consistent with code: when code changes a contract, state or table, update the affected documents in the same change.

## CEDA document map — CEDA adaptation (added)

Paths are relative to the repository root. One document per subject; other documents link to it rather than copying it.

| Document | Path | Created under | Maintained by this skill when |
|---|---|---|---|
| MVP blueprint + decision register | `docs/blueprint/01-mvp-blueprint.md` | project-blueprint-builder | Never edited directly for scope. Implementation raises a **blueprint change request** (§ below) |
| UI/UX specification | `docs/blueprint/02-figma-ui-ux-spec.md` | project-blueprint-builder | Same as above; implementation notes go in the PR |
| API contracts + role permissions | `docs/blueprint/03-api-contracts-and-permissions.md` (planned) | project-blueprint-builder | Code changes an RPC signature, error code, permission or RLS rule → update in the same PR, with a change-log line |
| Design record (only the parts the blueprint does not hold) | `docs/design/design.md` | this skill | Ownership table, commit design, failure cuts, quality scenarios, traceability matrix, findings, debt and risk registers, release recommendation |
| Architecture Decision Records | `docs/adr/ADR-NNN-title.md` | this skill | Any significant technical choice, including those recommended by blueprint decisions D-01/D-02 |
| Test plan + claim register | `docs/testing/test-plan.md`, `docs/testing/claim-register.md` | this skill | A slice adds or changes checks |
| Evidence | `artifacts/phase-NN/` | this skill | Every recorded run |
| Runbook | `docs/runbook.md` | this skill | Start/stop, config, health, alerts, backup/restore, outbox recovery change |
| README | `README.md` | this skill | Setup, scripts, environment variable names or structure change |
| Changelog | `CHANGELOG.md` | this skill | Every merged change, with classification |
| Proposal and manual inputs | `docs/submission/evidence-log.md` | this skill (feeds DOC-01/DOC-02) | A claim becomes evidenced; each entry links to the claim register |

### Source `design.md` sections → where CEDA keeps them

| Source section | CEDA location |
|---|---|
| Overview and scope | Blueprint §1 |
| Requirements and use cases | Backlog, user requirements, blueprint §1 and §3 |
| Quality scenarios | `docs/design/design.md` |
| Domain model and lifecycles | Blueprint §4 (state machine §4.3) |
| Architecture and ownership | `docs/design/design.md` + ADRs |
| Data model | Blueprint §4, then the migrations as the authoritative schema |
| Service contracts | `03-api-contracts-and-permissions.md` |
| Failure cuts and recovery | `docs/design/design.md` |
| Security and privacy | Security design PDF (team document) + `docs/design/design.md` for implementation deltas |
| UI states | `02-figma-ui-ux-spec.md` |
| Test plan and results | `docs/testing/` + `artifacts/` |
| Traceability matrix | `docs/design/design.md` (backlog ID → requirement → RPC → test → evidence) |
| Debt and risk | `docs/design/design.md` |
| Release recommendation | `docs/design/design.md` |
| Open questions | Blueprint §6 |

## Update triggers — CEDA adaptation (added)

| Code change | Update in the same change |
|---|---|
| RPC signature, error code, permission, RLS policy | API contracts doc; tests; CHANGELOG |
| Table, column, constraint, index | Migration; blueprint change request if the logical model changes; CHANGELOG |
| Workflow transition or business rule | API contracts doc; state machine via blueprint change request; tests; CHANGELOG |
| New dependency or service | ADR; README; CHANGELOG |
| Environment variable | `.env.example` (names only); README; runbook |
| New or changed check | Test plan; claim register; evidence after running |
| UI deviation from Figma spec | Note in PR; spec update request to the blueprint owner |

## Blueprint change request — CEDA adaptation (added)

When implementation shows that the approved blueprint is wrong, incomplete or unsafe:

1. Stop changing behaviour in that area.
2. Write the request: affected blueprint section/decision, observed problem with evidence, proposed change, impact on schedule and slices.
3. Ask the user (blueprint owner) for approval. On approval the blueprint skill updates the decision register; then this skill implements it.

Security defects found during implementation are fixed as defects (source: "a demonstrated vulnerability is a defect, not debt"), and the change request records the fix afterwards.

## Templates — CEDA adaptation (added)

**ADR** (fields from source Phase 3): `# ADR-NNN Title` · Context · Decision · Status (Proposed/Accepted/Superseded) · Alternatives · Consequences · Required evidence · Revisit trigger.

**CHANGELOG entry**: `## [version or date]` then lines prefixed by classification from the source: `feature`, `refactor`, `repair` (defect or security), `policy change`, each with backlog ID and evidence link.

**Findings record** (source Phase 8): Scope and evidence · Classification and consequence · Action · Accountability · Closure condition · Status. Disposition: Accept / Accept with action / Rework and return / Escalate.

**Debt / residual-risk entry** (source Phase 8): Item · Evidence · Consequence · Treatment · Reconsideration trigger.

## Writing rules — CEDA adaptation (added)

- **Never write the AI coding assistant's product name in any repository file, commit message, branch name or PR** (standing project-owner instruction). Search staged content and the commit message for it before committing.
- English only. Absolute dates (e.g. 23 Nov 2026). Times in CAT for people, UTC in data.
- Fictional data only; demo accounts labelled.
- No compliance, certification or production-readiness claims (blueprint D-18). Use "designed with reference to".
- Every claim of implementation or testing links to evidence or carries a status word from [testing-and-evidence.md](testing-and-evidence.md).

## Definition of done for each slice

- [ ] Requirement and acceptance criteria exist and trace to tests.
- [ ] Rules enforced by guarded domain operations; refusals leave state unchanged.
- [ ] Authorisation enforced on every entry route; sensitive data fetched only after the decision.
- [ ] Transaction boundary explicit; constraints protect concurrent rules; outbox or job record for external work.
- [ ] Idempotency for retried commands; stable error meanings.
- [ ] External calls have timeouts, outcome mapping and a single retry owner.
- [ ] UI states honest, input preserved, accessibility checks planned or done.
- [ ] Tests written and actually run, results recorded; anything not run marked `Not run`.
- [ ] Logs, metrics and correlation IDs in place; no secrets in code or logs.
- [ ] Docs, ADRs and changelog updated; open risks and the release scope stated.

Finish each piece of work with: what was built, evidence gathered (with real results), what remains unverified, and the next most valuable step.

## CEDA slice additions to the definition of done — CEDA adaptation (added)

- [ ] The blueprint acceptance checks for the slice's backlog IDs pass on staging, with run records.
- [ ] The slice's negative tests (blueprint §3.3) pass for every relevant entry route.
- [ ] The slice works for two role perspectives using seeded demo accounts.
- [ ] `artifacts/phase-NN/README.md` records commit, environment, results and the accept/reject decision.
- [ ] No scope, rule or permission differs from the approved blueprint without an approved change request.
- [ ] Staged changes and the commit message contain no occurrence of the AI coding assistant's product name.

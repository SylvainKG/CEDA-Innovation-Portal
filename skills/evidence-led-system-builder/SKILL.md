---
name: evidence-led-system-builder
description: "CEDA Innovation Portal implementation and verification discipline (React, TypeScript, Supabase, Vercel). Use when writing, debugging, refactoring, testing or security-reviewing real code, SQL migrations, RLS policies, RPC or Edge Functions, or when updating technical docs (API contracts, ADRs, tests, evidence, README, changelog) because code changed. Do not use for scope, requirements, user journeys, Figma specs or planning questions; use project-blueprint-builder for those."
---

# Evidence-Led System Builder (CEDA)

The engineering discipline for building and proving the CEDA Innovation Portal hackathon MVP. It turns the approved blueprint into working, tested, documented code and reports only what evidence supports.

**Source and fidelity.** Derived from `evidence-led-system-builder_skill.pdf` (9 pages). Every original principle, phase, recipe, checklist, pattern and anti-pattern is kept **verbatim** in the reference files. Text marked **CEDA adaptation (added)** applies them to this project and is not part of the PDF. An unmodified, generic copy of the source skill may also be installed at account level as `anthropic-skills:evidence-led-system-builder`; for CEDA work, use this project skill.

## When to use

| Use this skill | Use **project-blueprint-builder** instead |
|---|---|
| Implementing a slice, migration, RLS policy, RPC, Edge Function or component | Scope, MVP classification, requirements, user journeys |
| Debugging, refactoring, performance or concurrency fixes | Figma/UI-UX specifications, screen inventory |
| Writing and running tests; recording evidence | Functional architecture, logical data model, API planning |
| Security or code reviews of actual code | Implementation priorities, phasing, decision register |
| Updating API contracts, ADRs, tests, README, changelog because code changed | Planning or "what should we build" questions |

For a short question (for example "what does principle 8 mean?"), answer directly. Do not run the full workflow.

## Working with project-blueprint-builder

- The **approved blueprint** (`docs/blueprint/01-mvp-blueprint.md` v0.2, `02-figma-ui-ux-spec.md`, and the API contract document once approved) is the source of requirements and scope. This skill never changes scope, business rules or permissions on its own.
- When code shows that the blueprint is wrong, incomplete or unsafe, stop and raise a **blueprint change request** ([documentation-standards.md](references/documentation-standards.md#blueprint-change-request--ceda-adaptation-added)). A demonstrated security defect is fixed as a defect first and recorded afterwards.
- Documents are not duplicated. Each subject has one home; see the document map in [documentation-standards.md](references/documentation-standards.md).
- Both skills share the same authorisation boundary: planning or documentation does not authorise implementation, repository creation, deployment, credential use or external messages. Wait for explicit authority.

## Principles that are never broken

The 15 core principles in [engineering-principles.md](references/engineering-principles.md) apply in full. In particular, keep these distinctions:
- authentication vs authorisation;
- business-state vs UI-state changes;
- a successful request vs an uncertain outcome;
- idempotent retries vs new requests;
- one transaction for each state change, its audit entry and its outbox row;
- immutable versions and audit history;
- claims backed by recorded evidence.

## CEDA invariants

- Scope comes from blueprint v0.2. Slice order: Submit → Screen → Evaluate → Revise → Decide and award → Report, then optional innovation extras. The schedule is never extended for optional items (D-27).
- Workflow state changes only through guarded `SECURITY DEFINER` RPCs. RLS is default-deny on every table. Direct writes to workflow tables are revoked.
- Submitted versions, submitted scorecards, published decisions and audit entries are append-only.
- Submission is idempotent by `client_request_id`. A timeout is an unknown outcome, never "Failed".
- Fictional demo data only. **No proposal data goes to any external AI service.** No compliance or production-readiness claims.
- Money is stored in integer minor units with currency. Timestamps are stored in UTC and shown in CAT.
- **Never write the AI coding assistant's product name in any repository file, commit message, branch name or PR** (standing project-owner instruction).

## Workflow for each slice

Load [implementation-workflow.md](references/implementation-workflow.md) for the full phases. Compress them for small tasks, but pass every gate that applies.

1. **Intake:** read the slice's backlog IDs, blueprint sections, API contract and the existing code/migrations/tests.
   **Gate:** every item has a testable acceptance check; anything missing becomes a change request.
2. **Contract and design check:** operation contracts, transaction boundary, failure cuts and permissions are written.
   **Gate:** every important write has a transaction boundary, and every external call has a timeout and an outcome mapping.
3. **Implement in order:** migration (constraints, RLS) → guarded RPC → pgTAP → generated types and `src/lib/api/` wrapper → UI with every state → Playwright.
4. **Harden:** load [security-and-reliability.md](references/security-and-reliability.md). This covers idempotency, conditional updates, outbox, a single retry owner, decide-before-disclose, secrets and audit.
5. **Verify:** load [testing-and-evidence.md](references/testing-and-evidence.md). Vary one condition per test, assert preserved state, run the negative tests, and record evidence in `artifacts/phase-NN/`.
6. **Review and document:** classify the change, update the documents its triggers require, update the changelog, and state residual risk.

## Definition of done for a slice

The full source checklist plus the CEDA additions are in [documentation-standards.md](references/documentation-standards.md#definition-of-done-for-each-slice). In short:
- acceptance checks and negative tests pass on staging, with run records;
- refusals leave state unchanged;
- authorisation is enforced on every entry route;
- the transaction boundary is explicit and idempotency is in place;
- UI states are honest and input is preserved;
- docs and changelog are updated;
- no scope drift;
- no occurrence of the AI coding assistant's product name in the change.

## Uncertainty and unverified functionality

- Use only these status words: **Passed**, **Failed**, **Not run**, **Proposed**, **Implemented — not verified**, **Simulated**, **Deferred** (defined in [testing-and-evidence.md](references/testing-and-evidence.md)).
- Never report a test as passed without running it and quoting the result. Never invent measurements, user counts or benchmark numbers.
- When a fact is unknown, ask up to four focused questions. Or, if the user is unavailable, continue with clearly labelled assumptions.
- Release claims are scoped: "Suitable for hackathon judging with fictional data, build `<commit>`."

## Finish every piece of work with

What was built · Evidence gathered (real results, with commit and environment) · What remains unverified · Documents updated · Change requests raised · The next most valuable step.

## References

- [references/engineering-principles.md](references/engineering-principles.md): how to behave, the 15 core principles, key distinctions, stack mapping, patterns, anti-patterns
- [references/implementation-workflow.md](references/implementation-workflow.md): phases 0–4, 6, 8, 9 and the CEDA architecture mapping and slice order
- [references/security-and-reliability.md](references/security-and-reliability.md): Phase 5, observability, performance, offline rules, CEDA hardening
- [references/testing-and-evidence.md](references/testing-and-evidence.md): Phase 7, test stack, evidence records, claim register, status vocabulary
- [references/documentation-standards.md](references/documentation-standards.md): document set, CEDA document map, update triggers, change requests, templates, definition of done

---
name: project-blueprint-builder
description: "Turn a software-product idea into a decision-complete blueprint and delivery system: discovery, reference-product/repository study, PRD, technical design, application flows, design brief, backend schema, phased roadmap, developer work split and test artifacts. Use when planning a new SaaS, web/mobile platform or substantial rebuild before implementation; do not use for a small isolated feature or routine bug fix."
---

# Project Blueprint Builder

Guide a product from an early idea to implementation-ready specifications and a conflict-resistant development plan. Adapt the method to the project instead of carrying assumptions from a previous product.

## Operating modes

Determine the user's current stage and perform only the needed mode:

1. **Discovery** — understand the problem, users, business model, modules and constraints.
2. **Reference study** — analyse an existing repository/product and decide reuse, fork, integrate or independent build.
3. **Decision workshop** — close material product, business, technical, privacy and operational choices.
4. **Specification** — create/update the PRD, TDD, application-flow document, design brief and backend schema.
5. **Delivery design** — phase the build, divide developer ownership and define test artifacts.
6. **Execution setup** — scaffold the repository, environments, CI and Phase 0 only when the user authorises implementation.
7. **Developer skills** — create role-specific skills only when the user asks for reusable agent instructions.

Read [references/discovery-and-decisions.md](references/discovery-and-decisions.md) for modes 1–3, [references/specification-set.md](references/specification-set.md) for mode 4, and [references/delivery-and-evidence.md](references/delivery-and-evidence.md) for modes 5–7. Load only applicable references.

## Core workflow

### Ground the project

Collect or infer, then confirm the product purpose and market, payer and users, roles/scopes, applications, modules, revenue/limits, platforms/integrations, operational obligations, existing artifacts and team constraints. Do not ask the user to repeat supplied decisions. Separate confirmed decisions, recommended defaults, assumptions and unresolved choices.

### Model the complete system

Map tenant boundaries, people, workflows, money flows, permissions, communications, integrations, reporting, audit and lifecycle states. Distinguish platform billing from customer-domain transactions when money owners or settlement rules differ. For multi-tenant systems, define tenant identity, scope and operator access before modules.

### Research only where it changes decisions

When given an external repository/product, inspect current official sources. Identify license, stack, dependencies, data/tenant models, reusable concepts, missing requirements and upgrade burden. Recommend reference-only, selective integration, extension or fork with tradeoffs. Do not copy protected code or let a reference silently dictate architecture.

### Close material decisions

Recommend defaults with reasons when undecided. Leave provider-specific integrations behind adapters until selection. Record decisions with status and deadline. Flag contradictions instead of silently choosing.

### Produce one consistent document set

Use stable terminology, roles, states, priorities and architecture across documents. Propagate every changed decision. Prefer implementation-ready business rules and acceptance criteria over promotional prose.

### Design contract-first delivery

Divide primary ownership by technical boundary but build features vertically. Define contracts first, enable independent work through generated clients/mocks, integrate on staging and require peer review. Every phase ends with a named reproducible test artifact.

## Quality rules

- Never present an assumption as confirmed.
- Keep MVP, paid add-ons and future scope distinct.
- Specify negative permission cases, not only happy paths.
- Treat loading, empty, error, forbidden, offline and recovery states as requirements when relevant.
- Use append-only/reversal rules for posted finance, stock and audit data.
- Define idempotency for retried financial, webhook, job and import operations.
- Store money in integer minor units with currency; timestamps in UTC rendered in user timezone.
- Define retention, export/deletion, legal holds and backup implications.
- Keep clients behind APIs; do not give them privileged database access.
- Use fictional/redacted examples and test artifacts.

## Authorization boundary

Planning and documentation do not authorise repository creation, external messages, production deployment, credential use or implementation. Wait for explicit build/deploy authority before broader mutations.

## Completion response

State what was produced or updated, list confirmed decisions, call out remaining blockers, link deliverables and recommend the single next phase. Do not claim provider suitability, legal compliance or production readiness without verification.

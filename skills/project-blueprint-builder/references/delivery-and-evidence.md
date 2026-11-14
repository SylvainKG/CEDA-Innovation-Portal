# Delivery design, developer split and test evidence

## Shared repository and Phase 0

Define protected releasable `main`, short-lived issue branches, squash/peer review, required CI, pinned runtimes, safe `.env.example`, reproducible dependencies, fictional seeds and local/preview/staging/production responsibilities.

Phase 0 requires each developer to prove the same commit runs on their machine. Record OS/tool versions, commit and results for install, services, migrations/seeds, lint, type-check, tests, builds and startup.

## Developer split

Adapt this boundary:

| Developer A | Developer B |
| --- | --- |
| Database, API, permissions, jobs, integrations, infrastructure | Web/mobile clients, design system, client state, accessibility, E2E journeys |

Both approve contracts and review each other. A vertical feature progresses through additive schema/API, generated clients/mocks, UI, integration tests and feature activation. Rebalance for team strengths while retaining one primary owner per shared boundary.

## Phase construction

After environment setup, phase work in dependency order: tenancy/identity, entitlements/organisation, core entities, primary operations, communications/self-service, finance/advanced modules, providers/reporting/operations, then retention/security/release. Adapt count/names to the product.

For each developer/phase state objective/dependencies, deliverables, contract/handoff, positive and negative tests, named artifact, exit criteria and blockers.

## Test artifact standard

```text
artifacts/phase-NN/
├── README.md
├── automated-test-summary.txt
├── manual-test-cases.md
├── api-evidence/       # if applicable
├── screenshots/        # if applicable
├── accessibility/      # if applicable
└── defects.md
```

The README records exact commit, environment, date, testers, results, security/isolation status, defects and accept/reject decision. Large binaries stay in CI artifact storage. Never use personal data, secrets or live payment evidence.

## Conflict controls

- One active migration sequence at a time.
- Agree contracts before parallel implementation.
- Only one open PR modifies a shared root configuration file.
- Update generated clients with contracts.
- Use approved mocks until APIs land.
- Feature-flag incomplete modules.
- Apply expand-and-contract migrations.
- Keep PRs small and short-lived.

## Optional role-specific skills

Create these only when asked. Each skill needs a discriminating description/boundary, start checks, project invariants, workflow/tests/artifacts/PR rules, stop conditions and phase references. Validate and commit skill source to Git; package individually and together for handoff when requested.

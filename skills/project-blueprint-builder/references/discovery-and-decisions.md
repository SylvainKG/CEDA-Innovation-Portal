# Discovery, reference study and decision workshop

## Discovery map

Capture these categories without one large questionnaire. Ask only a few high-impact questions at a time and recommend defaults.

| Category | Decisions to capture |
| --- | --- |
| Problem | Current pain, affected users, measurable outcome |
| Market | Launch country/sector, expansion and localisation |
| Customer | Who opens the account, pays, administers and receives support |
| Users | Roles, self-service, invited users and non-login contacts |
| Organisation | Tenant, branches/sites, hierarchy and cross-site roles |
| Products | Admin web, operator console, mobile apps, public pages and portals |
| Modules | Base, optional, usage-based and future functions |
| Money | Pricing, trial, annual terms, refunds, settlement and provider status |
| Communications | Channel purpose, consent, secured documents and history |
| Operations | SLA, availability, backups, retention, cancellation and deletion |
| Delivery | Team, repository, environments, target and constraints |

## Decision register

Use columns: `Decision`, `Status`, `Selected/default`, `Alternatives`, `Reason`, `Deadline/owner`.

Statuses: `CONFIRMED`, `RECOMMENDED`, `ASSUMED`, `OPEN`, `DEFERRED`.

When an open decision need not block architecture, use an adapter, feature flag or configuration boundary and state the last responsible decision point.

## Logic walkthrough before documents

Explain account/tenant creation, organisation hierarchy, identity/scope, primary lifecycle, daily workflows, finance/platform billing, communications, reporting/audit, subscriptions, cancellation/retention and integration failures. Use concrete scope examples.

## Reference repository study

Inspect current official sources and code for license, stack, dependencies, modules/schema, authentication/permissions, tenancy, frontend/mobile architecture, maintenance, missing requirements and migration cost.

Compare:

| Strategy | Select when |
| --- | --- |
| Reference only | Concepts help but stack, license, tenancy or UX conflicts |
| Selective integration | A bounded service adds value through a stable API |
| Extension/plugin | The ecosystem fits and safely supports custom modules |
| Fork | Most requirements fit and fork maintenance is accepted |

Address technical fit, operating cost, differentiation, licensing and upgrades.

## Contradiction handling

Prefer the latest explicit decision, state the interpretation, retain alternatives as future/add-on scope where appropriate, and ask only when the unresolved choice materially changes the result.

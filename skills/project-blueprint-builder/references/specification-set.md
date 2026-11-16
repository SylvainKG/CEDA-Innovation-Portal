# Implementation-ready specification set

Create the documents requested by the user. For the full set, use a numbered index and keep all decisions consistent.

## Product Requirements Document

Include product summary/problem/goals, personas and scopes, prioritised module requirements, business rules/lifecycles, commercial entitlements, communication rules, non-functional requirements, MVP/add-on/future/excluded scope, KPIs, acceptance criteria and the decision register.

Requirements must state who can perform an action, on which records, in which state and with what history/audit.

## Technical Design Document

Include architecture objectives/stack, context and repository structure, modules, tenancy/authentication/authorisation, API conventions, transactions/idempotency/outbox/jobs, provider adapters/webhooks, secured files, reporting, security, testing, environments/migrations, observability, RPO/RTO, runbooks and open ADRs.

Prefer a modular monolith for a small team unless scale or isolation clearly justifies services.

## Application Flow Document

Include product surfaces/navigation, onboarding/activation/context, role/scope assignment, primary lifecycle, daily role flows, finance/subscription/provider flows, communications/secured documents, mobile/self-service, add-on cancellation and exceptional/recovery states. Use compact diagrams only when transitions benefit.

## Design Brief

Include objective/brand/anti-patterns, distinct product surfaces, visual direction/tokens, information architecture/shells, tenant context, role dashboards, forms/tables/schedules/finance/status language, responsive/accessibility rules, components, screen inventory, prototypes and acceptance criteria. Ground design in the domain; avoid generic dashboard styling.

## Backend schema

Document logical entities, key fields, constraints, lifecycle/ledger rules, tenant/branch keys, indexes, RLS, retention and migration order. Cover platform tenancy/billing, identities/scopes, domain relationships/workflows, communications/documents, finance if applicable, jobs/outbox/idempotency and audit. State that logical schema is not final production DDL.

## Consistency check

Search every document for old names, superseded platforms/providers, inconsistent scope/state terms, conflicting MVP/add-on classification, prices/limits/retention contradictions, missing tenant rules and unconfirmed claims.

# 3. Shared architecture and integration plan

**Rule:** a reviewer never reads the innovator's workspace. They read a **frozen copy** that the innovator chose to include, written into the submitted version in the same transaction as the submit. That keeps every rule the portal already proves: N1 (applicants isolated), N3 (unassigned reviewers see nothing), N10 (declare before reading), C-06 (submitted records can't change) and C-13 (V1 kept after V2).

All names below are **proposed**. They become the contract when both developers sign off in the contract session (Phase 1, milestone M1).

## 3.1 Data flow (the six stages)

1. **Prepare (private).** The innovator works in their business workspace. Owner-only RLS, the same pattern as `proposal_drafts` (`is_case_owner`). Nobody else can read it: no staff role, no reviewer.
2. **Select.** On the proposal form's last step (and on the revise page), the innovator ticks the workspace items to include and tags each with rubric criteria. The screen lists exactly what reviewers will see, kind by kind. Selection rows live with the draft and are editable only while the case is `draft` or `action_required`.
3. **Freeze.** `submit_proposal` / `submit_revision` call `private.freeze_evidence(proposal_id, version_id)` inside their existing transaction:
   - they copy each selected item's current content into `version_evidence`;
   - they copy its files into `proposal-files` under the version;
   - they compute the financial outputs in the database.

   A guard trigger then forbids any update or delete (as for `proposal_versions`). If the freeze fails, the submit fails and nothing is written; the existing idempotency (`client_request_id`) is unchanged.
4. **Reviewer reads.** `get_case_evidence(proposal_id, version_id?)` returns the frozen items grouped by criterion, only to:
   - an **assigned, declared reviewer** (`private.is_cleared_reviewer`);
   - staff with `case.read_all` (screening, adjudicator, admin);
   - the case owner.

   An assigned reviewer who hasn't declared gets `FORBIDDEN` (N10). Files open through the existing `attachment-url` function, which already applies these rules and audits the download.
5. **Evaluate.** The reviewer scores with the existing scorecard and can cite evidence items in reasons. Clarification and revision use the existing `request_feedback`; a task can point at an evidence item.
6. **Improve.** The innovator edits the workspace (live), re-selects, and `submit_revision` freezes a new set for version 2. Version 1's set and scores stay. R-05 compares the two sets.

**Never part of a snapshot, whatever is selected:**
- CRM contacts and interactions;
- raw survey responses and respondents' details;
- inventory movements;
- AI conversations;
- other workspaces.

Only derived summaries may be included: survey result counts, inventory totals. Each is computed at freeze, never a live query.

## 3.2 Database entities (owner: Stacey; migrations `017` onward)

| Entity | Purpose | Key columns | Access |
|---|---|---|---|
| `business_profiles` | The "enter once" profile | `owner_id` (pk), `business_name`, `concept`, `sector`, `location`, `stage`, `updated_at` | Owner only |
| `business_products` | Products/services reused by budget, pricing, CRM, plan | `id`, `owner_id`, `name`, `unit_price_minor`, `unit_cost_minor`, `unit` | Owner only |
| `workspace_documents` | One row per tool document: canvas, budget, market, SWOT, roadmap, plan, deck, branding, readiness | `id`, `owner_id`, `kind`, `title`, `data jsonb` (validated per kind), `revision_no`, `updated_at` | Owner only |
| `workspace_document_revisions` | Append-only history for versioned kinds (canvas, plan, deck) | `document_id`, `revision_no`, `data`, `saved_at` | Owner only; guard trigger |
| `crm_contacts`, `crm_interactions` | Mini CRM | Contact details, stage, next action date | Owner only; **never selectable** |
| `inventory_items`, `inventory_movements` | Inventory and sales | Item, quantity, unit cost, reorder level; movements | Owner only |
| `surveys`, `survey_questions`, `survey_responses` | Validation surveys | `public_token`, `closes_at`, consent text version; responses with no account | Owner reads; **signed-out answers only through one RPC** with the token, rate limit and consent |
| `workspace_files` + private bucket `workspace-files` | Files the innovator attaches to workspace items | Same columns as `attachments` | Owner only |
| `evidence_selections` | What the draft will include | `proposal_id`, `document_id`, `kind`, `criterion_ids uuid[]`, `position` | Owner, while editable |
| `version_evidence` | The frozen copy | `id`, `proposal_id`, `version_id`, `position`, `kind`, `title`, `data jsonb`, `criterion_ids`, `source_document_id`, `source_revision_no`, `source_updated_at`, `frozen_at` | No direct reads (no SELECT policy, as `proposal-files`); read through `get_case_evidence` only. Guard trigger: no update/delete |
| `content_pages.kind` + `reviewer_guide` | Learning hub | New kind; staff-only read | Staff (`scorecard.submit` or `case.read_all`) |

Money is stored in **thebe** (integer minor units), as `awards.amount_minor` already does, and shown with `formatBWP`.

## 3.3 RPCs (all `SECURITY DEFINER`, `search_path = ''`, audited where they change state)

| RPC | Caller | Owner |
|---|---|---|
| `save_business_profile`, `get_my_workspace` | Innovator | Stacey |
| `save_workspace_document(kind, id?, data, expected_revision)` | Innovator | Stacey (shape validators per kind: owner of each tool) |
| `crm_*`, `inventory_*`, `survey_*` (own small sets) | Innovator | Stacey |
| `submit_survey_response(token, answers, consent_version)` | **Signed out** | Stacey |
| `set_evidence_selection(proposal_id, items[])` | Innovator, case editable | Stacey |
| `get_evidence_preview(proposal_id)` | Innovator: "what reviewers will see" | Stacey |
| `get_case_evidence(proposal_id, version_id default current)` | Cleared reviewer, `case.read_all`, owner | Stacey |
| `request_feedback` (+ `strengths`, `next_steps`, task `evidence_id`) | Existing roles | Shawnjembu drafts, Stacey sequences |
| `my_review_workload()` | Reviewer | Shawnjembu drafts, Stacey sequences |
| `save_workspace_document` validators for canvas, plan, deck, market, branding | Innovator | Shawnjembu drafts, Stacey sequences |

## 3.4 Files, provenance, errors and versions

- **Files:** workspace files live in a new private bucket `workspace-files` with owner-only paths. At freeze they are **copied** into `proposal-files/{proposal}/{version}/evidence/` and registered in `attachments` with `version_id`. Reviewers then use the unchanged `attachment-url` (60 s signed URL, audited, N2). No new signing code; nothing in `workspace-files` is ever signed for anyone but the owner.
- **Provenance:** each frozen item carries:
  - `kind`, `source_document_id`, `source_revision_no`, `source_updated_at`, `frozen_at`;
  - for financial figures, a `basis` per figure: `entered`, `estimate` or `calculated`.

  The reviewer screens show these labels. An estimate is never shown as a verified fact.
- **Errors:** the existing codes only (`src/lib/api/errors.ts`, contract §1.1):
  - `FORBIDDEN`: not cleared, not the owner;
  - `NOT_FOUND`;
  - `VALIDATION`: bad shape, or more than 20 evidence items;
  - `INVALID_STATE`: selection on a submitted case;
  - `REQUEST_CONFLICT`: a stale `expected_revision`.
- **Versions:** each `proposal_versions` row has its own frozen set. Workspace documents keep revisions (`revision_no`), so a snapshot records which revision it froze. Feedback tasks keep pointing at the version and evidence item they were raised on.

## 3.5 The contract to agree first (milestone M1)

| Part | Content | Owner | Reviewer |
|---|---|---|---|
| Database and RPC signatures | §3.2, §3.3 as SQL comments and a contract section in `docs/blueprint/03-api-contracts-and-permissions.md` | Stacey (F-01) | Shawnjembu |
| TypeScript interfaces and ports | New file `src/lib/api/toolkit-types.ts` (not `types.ts`, so the two don't collide); ports `src/lib/api/workspace.ts`, `src/lib/api/evidence.ts`; mock adapters | Shawnjembu (F-06) | Stacey |
| Snapshot JSON shapes per kind | One schema per kind (canvas, budget, pricing, market, SWOT, roadmap, plan, deck, readiness, survey summary, inventory summary) | Each tool's owner | The other developer |
| Financial calculation | `src/lib/finance.ts` + `private.finance_*`, sharing one table of test cases (same inputs → same thebe) | Stacey (I-07) | Shawnjembu (R-03 consumes it) |

Proposed core interfaces (to be finalised in F-06):

```ts
export type EvidenceKind =
  | 'canvas' | 'budget' | 'pricing' | 'plan' | 'pitch_deck' | 'market' | 'swot'
  | 'roadmap' | 'readiness' | 'survey_summary' | 'inventory_summary'

export interface EvidenceSelectionItem { document_id: string; kind: EvidenceKind; criterion_ids: string[]; position: number }

export interface FrozenEvidenceItem {
  id: string; version_id: string; kind: EvidenceKind; title: string
  data: unknown            // shape fixed per kind (§3.5 row 3)
  criterion_ids: string[]
  files: AttachmentInfo[]  // existing type; opened through attachment-url
  provenance: { source_document_id: string; source_revision_no: number; source_updated_at: string; frozen_at: string }
}

export interface CaseEvidence {
  proposal_id: string; version_no: number
  items: FrozenEvidenceItem[]
  by_criterion: { criterion_id: string; item_ids: string[] }[]
  unmapped_item_ids: string[]
}

export interface MoneyFigure { minor: number; basis: 'entered' | 'estimate' | 'calculated' }
```

## 3.6 Tests that must prove access is denied (pgTAP, owner: Stacey, Q-02)

- **Applicant B** cannot read A's profile, documents, CRM, files or selections, directly or through any RPC (extends N1).
- **An unassigned reviewer** (`reviewer.3`) gets `FORBIDDEN` from `get_case_evidence` (N3).
- **An assigned reviewer who hasn't declared** gets `FORBIDDEN`; after declaring, they see only that case's frozen items (N10).
- **The committee and support consultant** get `FORBIDDEN` (N7, D-08).
- **No one can change the frozen copy:** `version_evidence` rows can't be updated or deleted by any role, and editing the workspace after submit leaves the frozen copy byte-identical (C-06).
- **Revision keeps the old copy:** after `submit_revision`, version 1's set and scores are unchanged (C-13).
- **CRM and raw survey responses can never be selected** (`VALIDATION`) and never appear in `get_case_evidence`.
- **Signed-out survey answers** write only through `submit_survey_response` with a valid, open token and consent; any other anonymous write is refused.
- **The existing suites stay green unchanged,** especially `002` and `005`, after `submit_proposal` / `submit_revision` gain the freeze step.

# 3. Demo data and screen linking

**Rule:** the demo shows the same story the production design will deliver. An innovator prepares business information, chooses what to include, submits, and an assigned reviewer sees a frozen copy beside the scorecard. But it does this entirely in the browser, on sample data, in mock mode. Nothing is saved on a server; a reload restores the sample data.

## 3.1 The demo journey (what a viewer can click through)

1. **Prepare (as `applicant.a`).** Open **Business toolkit** and edit the sample workspace: profile, canvas, budget, market research and the other tools. Each screen shows **"Demo: sample data, not saved"**.
2. **Include.** On the proposal form's last step (or the revise page), tick which items to include and tag each with a rubric criterion. A preview shows exactly what reviewers would see. The CRM, survey responses and inventory movements are shown as "never shared".
3. **Submit.** The existing mock submit runs. The demo store then **copies** the ticked items onto the submitted case as its evidence for that version, so later edits in the workspace don't change it. That's the same behaviour the production snapshot will have.
4. **Review (switch to `reviewer.1`).** After declaring no conflict, as today, the scorecard shows the **Evidence** panel grouped by criterion and the **Financial** panel. Before declaring, the panels are hidden, mirroring the real rule (N10).
5. **Feedback.** Request a revision with strengths, next steps and tasks pointing at evidence items (existing dialog, extended).
6. **Improve.** Back as `applicant.a`, update the budget and submit version 2. The reviewer's compare view shows what changed in the evidence.

The role switch uses the existing mock session (`ceda.mock.role`), so one browser can play every part.

## 3.2 The demo store (owner: Stacey, U-01)

- **Where:** `src/features/toolkit-demo/store.ts` (state), `src/features/toolkit-demo/fixtures.ts` (sample data), `src/features/toolkit-demo/types.ts` (shapes).
- **How:** the same pattern as `src/lib/api/mock/*`: module-level state seeded from fixtures, kept until reload. The reviewer panels read it through a small hook, `useDemoEvidence(caseId)`.
- **Sample content:** one workspace for **Applicant A (Lesedi Agro Demo)**, matching the existing fixtures:
  - profile and 3 products in BWP;
  - a full canvas, a 12-month budget with three scenarios, 4 competitors and a SWOT;
  - 5 milestones, 8 CRM contacts (fictional), 2 surveys with sample results, and a small stock list.
- **Pre-filled evidence:** the demo case `CEDA-2026-0008` (already in evaluation in the fixtures) carries an evidence set, so the reviewer panels can be shown without clicking through submission first.
- **Labels:** all sample people and businesses are fictional and marked DEMO, as with today's fixtures.

## 3.3 Shared shapes (agreed in a one-hour session before Phase 1)

```ts
export type EvidenceKind =
  | 'canvas' | 'budget' | 'pricing' | 'plan' | 'pitch_deck' | 'market' | 'swot'
  | 'roadmap' | 'readiness' | 'survey_summary' | 'inventory_summary'

export interface DemoEvidenceItem {
  id: string; kind: EvidenceKind; title: string
  data: unknown                 // one shape per kind, defined by that tool's owner
  criterionKeys: string[]       // rubric criterion keys from the existing fixtures
  provenance: { savedAt: string; frozenAt: string; revision: number }
}

export interface MoneyFigure { minor: number; basis: 'entered' | 'estimate' | 'calculated' }
```

| Shape | Owner | Used by |
|---|---|---|
| `DemoEvidenceItem`, store API, fixtures | Stacey (U-01) | Everyone |
| Budget, pricing, break-even shapes; `src/lib/finance.ts` (browser arithmetic) | Stacey (I-07, I-01) | Shawnjembu's financial viewer (R-03) |
| Canvas, plan and deck shapes | Shawnjembu (I-03–I-05) | Stacey's include step (U-04) |
| Component props (`EvidenceCard`, `BarChart`, `SourceBadge`) | Shawnjembu (U-02) | Everyone |

These shapes are written so the production plan (`../toolkits/03-architecture-and-integration.md`) can adopt them: `DemoEvidenceItem` maps onto its `FrozenEvidenceItem`.

## 3.4 What the demo does not do (and must say so)

- **No saving:** a reload resets everything; no account sees another browser's changes.
- **Not on the real portal:** no server checks. The demo's hiding of panels imitates the access rules; it doesn't enforce them.
- **No real survey link:** the QR and link are samples that open nothing.
- **No AI:** the mentor shows scripted sample answers, labelled as such, so D-25 is not affected.
- **No files:** exports are the browser's print view.
- **It isn't on the judging site:** it runs in a mock-mode build only (document 6 §1).

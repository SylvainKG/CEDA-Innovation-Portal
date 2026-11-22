# 8. Risk and testing strategy

## 1. Risk register

Severity and likelihood: High / Medium / Low.

| Risk | Sev. | Likely | Prevention | Owner | Verification / recovery |
|---|---|---|---|---|---|
| Reviewer reaches private innovator data | H | M | Frozen copy only; no SELECT policy on `version_evidence`; never-selectable kinds; owner-only RLS on every workspace table | Stacey | Q-02 suite (document 3 §3.6) on every backend PR; journey refusal tests (Q-01) |
| Broken RLS on a new table | H | M | 010's allow-lists extended; a pgTAP row for anon, each applicant, each staff role | Stacey | CI database gate; hosted suites before any apply |
| Submitted evidence changes after submit | H | L | Freeze in the submit transaction; guard trigger; files copied, not linked | Stacey | Test: workspace edit after submit leaves the copy byte-identical |
| Existing submit/revise flow breaks | H | M | `002` and `005` unchanged and green; submit without evidence still identical; flag off by default | Stacey | Full journey on a throwaway stack before merge |
| Wrong financial figures | H | M | One calculation in `finance.ts` + SQL sharing 30+ test cases; thebe integers; reviewers never recalculate | Stacey (I-07), Shawnjembu (R-03) | Shared test cases fail the build on any difference |
| Anonymous survey abuse / personal data | H | M | One RPC, token, closing date, rate limit, consent text version, retention | Stacey | Tests for expired, closed and flooded tokens; data-handling note before release |
| AI misinformation or data leaving | H | M | Phase 5 only after a change request; user picks fields; output labelled; server-side keys; limits | Stacey + Shawnjembu | Blocked until approved; usage log reviewed |
| Migration ordering errors | M | M | Stacey owns the sequence; numbers reserved (document 6 §5); never renumber after merge | Stacey | CI applies all migrations from empty on each PR |
| Merge conflicts late | M | M | Short task branches, daily sync, shared files changed alone, the flag instead of long branches | Both | Conflicts other than CHANGELOG are discussed with the owner first |
| Duplicated or inconsistent UI | M | M | F-07 shared components first; document 7; ABM's visual review | Shawnjembu | Review checklist per PR |
| API mismatch between mock and real adapter | M | M | One contract (F-01/F-06); the mock passes the contract's example payloads | Shawnjembu, Stacey | Switching an adapter is its own PR, with tests |
| Slow pages (large JSON, many files) | M | L | Item limit (20), paging on CRM and inventory, indexes on `owner_id` and `version_id` | Stacey | Timed sample (QA-01 method) on the development project |
| Poor phone use | M | M | 360 px checks per page; tables scroll in their box | Shawnjembu | Smoke rows at 360/1280 |
| Incomplete tests | M | M | Each task's acceptance lists its tests; no PR merges without them | Both | Coverage of every RPC by at least one refusal test |
| Deployment failure | M | L | Dry run before apply; development project first; never the judging project during judging | Stacey | Run record; rollback by a new migration, never by editing an applied one |
| One developer unavailable | H | M | Plans are written to be handed over (document 4/5); ABM can take Shawnjembu's plan | Sylvain | Re-plan at the next milestone |

## 2. The five greatest risks

1. **Private innovator data reaching reviewers.** The design (frozen copy, no direct reads) and the Q-02 suite are the defence. Merge nothing in the evidence path without them.
2. **Breaking the existing submission and evaluation flow.** It's what CEDA's judges and users rely on: `submit_proposal` and `submit_revision` change in F-04.
3. **Developer availability.** Shawnjembu has been out since 21 Nov, and the plan is 354 h of his time.
4. **Wrong financial numbers shown to reviewers.** That would damage trust in the whole toolkit.
5. **Anonymous survey writes.** It's the first time signed-out people can write data, and it's third parties' personal data.

## 3. Test strategy

| Layer | What | Tool | Where |
|---|---|---|---|
| Database | Every new table: owner can, everyone else can't; every RPC: allowed path + each refusal; immutability; finance test cases | pgTAP | `supabase/tests/database/015`–, the CI database gate, hosted before release |
| Unit | Calculations, validators, components, page states (loading, empty, error, forbidden) | Vitest + Testing Library | `src/**/*.test.tsx` |
| Integration | Each Supabase adapter against a local stack | Vitest (existing `supabase-*.test.ts` pattern) | `src/lib/api/supabase/` |
| End-to-end | Innovator → evidence → reviewer → feedback → V2; refusals for unassigned and undeclared reviewers | Playwright | `tests/e2e/hosted-journey.spec.ts`; `journey_local` first, staging between a snapshot and a reset |
| Accessibility | Keyboard, focus, labels, reduced motion, 360/1280 px | Playwright smoke + `jsx-a11y` lint | `tests/e2e/shell-smoke.spec.ts` |
| Regression | The existing 513 pgTAP, 354 unit and journey tests stay green unchanged | CI | Every PR |

## 4. Release readiness (before the toolkit flag is switched on)

- [ ] All pgTAP suites pass in CI and on the development project; Q-02 covers every new table and RPC.
- [ ] The journey passes end to end, refusals included.
- [ ] The finance test cases agree between TypeScript and SQL.
- [ ] Accessibility and 360/1280 px checks pass on every new page.
- [ ] The data-handling note covers CRM contacts, survey respondents and any AI processor.
- [ ] The contract, runbook and user manual describe what is built, and nothing that isn't.
- [ ] ABM has reviewed the screens against document 7.
- [ ] No proposed feature is described as built (claim register rules).

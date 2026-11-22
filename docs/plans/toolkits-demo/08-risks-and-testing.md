# 8. Risk and testing strategy (UI-only demo)

## 1. Risk register

Severity and likelihood: High / Medium / Low.

| Risk | Sev. | Likely | Prevention | Owner | Verification / recovery |
|---|---|---|---|---|---|
| A demo screen is mistaken for a working feature (by judges, CEDA or our own docs) | H | M | `DemoNotice` on every screen; the walkthrough says what is sample-only; no claim in the claim register, README or manual that the tools are built | Both | Review each PR for the notice; doc check before any presentation |
| The demo leaks into the judged build | H | L | `VITE_TOOLKIT_DEMO` off by default; demo routes registered only in mock mode with the flag on | Stacey (flag), Sylvain (Amplify) | A test that the flag-off build has no toolkit routes or nav item |
| Existing screens break (scorecard, case page, proposal form, compare, feedback dialog) | H | M | Panels and steps added only when the flag is on; existing tests unchanged | Shawnjembu (reviewer pages), Stacey (form) | Full unit suite + existing smoke and journey on every PR |
| Wrong financial figures in the demo | M | M | One calculation library (`finance.ts`) with tests; the reviewer viewer shows its outputs and never recalculates | Stacey, Shawnjembu | Shared test cases; figures labelled entered, estimate or calculated |
| Sample data looks like real people's data | M | L | Fictional names marked DEMO, as in today's fixtures; no real emails or phone numbers | Stacey | Fixture review in U-01 |
| The "AI mentor" is read as real AI, or calls a service | M | L | Scripted answers, labelled; a test that no network request is made | Stacey | Unit test on the panel |
| Inconsistent UI between the two developers | M | M | U-02 shared components first; document 7; ABM's visual review | Shawnjembu | Review checklist per PR |
| Merge conflicts in the router and shells | M | M | Route list owned by Stacey; shells changed only in a PR that touches nothing else; daily sync | Both | Conflicts other than CHANGELOG discussed with the owner |
| Poor phone use | M | M | 360 px check per screen; tables scroll inside their box | Shawnjembu (Q-02) | Smoke rows at 360/1280 |
| One developer unavailable | H | M | The plans can be handed over; ABM can take Shawnjembu's | Sylvain | Re-plan at the next milestone |

## 2. The five greatest risks

1. **The demo is presented or documented as working software.** It has no saving, no server and no enforced access rules.
2. **It reaches the judged build,** which is frozen and runs in Supabase mode.
3. **Existing reviewer and applicant screens break** when the panels are added.
4. **Developer availability:** Shawnjembu has been out since 21 Nov.
5. **Wrong numbers** in the budget or financial viewer undermine the demo's credibility.

## 3. Test strategy

| Layer | What | Tool | Where |
|---|---|---|---|
| Unit | Each screen's loading, empty, error and demo states; `finance.ts` cases; the demo store (seed, copy on submit, reset) | Vitest + Testing Library | `src/**/*.test.tsx` |
| Flag | With the flag off, no toolkit route, nav item or panel exists | Vitest + smoke | `src/routes/router.test.tsx`, smoke suite |
| Journey | Innovator → include → submit → reviewer declares → Evidence and Financial panels → revision → V2 compare; panels hidden before declaring | Playwright (mock build) | `tests/e2e/toolkit-demo.spec.ts` |
| Accessibility | Keyboard, focus, labels, reduced motion, 360/1280 px | Playwright smoke + `jsx-a11y` lint | `tests/e2e/shell-smoke.spec.ts` |
| Regression | The existing 354 unit tests and the smoke and journey suites unchanged | CI | Every PR |

## 4. Ready to show

- [ ] Every demo screen shows `DemoNotice`.
- [ ] The flag-off build is unchanged (tests prove it).
- [ ] The demo journey passes on a mock build.
- [ ] `finance.ts` tests pass; the budget and the financial viewer agree.
- [ ] Accessibility and 360/1280 px checks pass.
- [ ] ABM has reviewed the screens against document 7.
- [ ] The walkthrough (Q-03) is rehearsed, and it says plainly what is sample-only.
- [ ] No document claims the tools are built.

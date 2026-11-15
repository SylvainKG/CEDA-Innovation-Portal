# Repository rules

**Owner:** Sylvain · **Status:** Draft for team review · 15 Nov 2026 · **Implements:** blueprint §7.3, §9.2, D-38, D-40, D-43
These rules apply to everyone, human or assisted. They protect each other's work, so nobody overwrites anybody.

---

## 1. Branches

| Branch | Purpose | Rule |
|---|---|---|
| `main` | Always releasable; what staging deploys | Protected. Changes arrive only through reviewed pull requests |
| `ui/<template>-<topic>` | Frontend work, e.g. `ui/t04-proposal-form` | Obvious, or whoever claimed the screen |
| `db/<topic>` | Migrations, RLS, RPCs, seed, e.g. `db/submit-proposal` | Stacey, or agreed with Stacey |
| `test/<topic>` | Playwright, pgTAP, evidence, e.g. `test/negative-n1-n2-n9` | Sylvain, or agreed |
| `docs/<topic>` | Blueprint, process, manuals, e.g. `docs/blueprint-v0.4` | Any member |
| `design/<topic>` | Figma handoff exports, e.g. `design/slice-1` | Sandra (Obvious as backup) |

- **One branch per task.** Short-lived: merge within a day or two, then delete the branch.
- Before you start: `git fetch origin` and branch from the latest `main`.
- Branch names, commit messages and PR text never contain credentials, personal data or the AI coding assistant's product name (standing project-owner instruction).

## 2. Pull requests

1. Small and focused: one task, ideally under about 400 changed lines (excluding generated types and snapshots).
2. Use the PR template (§6). Link the backlog ID(s), the blueprint section and, for UI, the snapshot file it was built from.
3. **Required reviewers by area** (blueprint §7.3):

   | Path | Required reviewer |
   |---|---|
   | `src/components/` | Obvious |
   | `supabase/migrations/`, `supabase/functions/`, `supabase/tests/` | Stacey |
   | `docs/design/figma-handoff/` | Sandra (Obvious as backup) |
   | `docs/blueprint/` | Sylvain **and** one other member |
   | `.github/`, CI configuration, `package.json`, root config files | Sylvain |
   | Anything else | Any one other member |

4. Nobody approves their own PR. The author merges after approval and green checks.
5. **Squash merge**, so `main` has one commit per task. The squash message keeps the PR title.
6. A PR that changes behaviour updates its documents in the same PR (evidence skill, "Update triggers"):
   - RPC signature, error code, permission or RLS → API contract doc + tests + CHANGELOG
   - new environment variable → `.env.example` (names only) + README + runbook
   - new dependency → short ADR + README
7. Only one open PR at a time may change a shared root config file (`package.json`, `tsconfig*.json`, `vite.config.*`, `tailwind.config.*`, CI files). If one is open, rebase on it or wait.
8. Never push to, force-push or rebase someone else's branch or PR. Ask the author, or Sylvain if they are unreachable.

## 3. Claims and takeover

- **Claim before you edit** a screen, Figma frame or shared component: put your name in `docs/design/figma-handoff/screen-status.md` (*Designer* or *Developer*).
- One claimant at a time. If a claimant is blocked or absent, Sylvain reassigns using the takeover procedure in blueprint §9.2. The new owner records it in `screen-status.md` and `handoff-notes.md`.
- Migrations: **one sequence, owned by Stacey.** Propose a schema change to Stacey; don't add a migration in parallel.

## 4. Commits

- Message: imperative summary under 72 characters, then an optional body explaining why.
  Example: `Add submit_proposal idempotency test (APP-03)`
- Reference backlog IDs where they apply.
- **Before every commit:** `git diff --cached` and check for:
  - secrets, tokens, passwords, `.env` files (`.env.example` holds names only);
  - real personal data (all data is fictional and labelled DEMO);
  - the AI coding assistant's product name. Each person keeps that search pattern in their **local** git hook or editor config, never in the repository.
- CI runs a secret scan on every PR as a second line of defence. It does not replace the check above.

## 5. Branch protection on `main` (settings Sylvain applies)

Usernames are now known (blueprint §6 item 8); apply these settings:

- [ ] Require a pull request before merging, with **1 approval**
- [ ] Require review from **Code Owners** (file in §7)
- [ ] Dismiss stale approvals when new commits are pushed
- [ ] Require status checks to pass, using the checks listed as required in `ci-and-environments.md` §2
- [ ] Require branches to be up to date before merging
- [ ] Block force pushes and branch deletion
- [ ] Apply the rules to administrators too

**ASSUMED, to verify:** protected branches and required code-owner reviews on a **private** repository need a paid GitHub plan on the owning account. If the plan doesn't allow it, the same rules apply **by team agreement**, and Sylvain checks each merged PR against them daily. Record which applies in `artifacts/phase-00/README.md`.

## 6. Pull request template (proposed `.github/pull_request_template.md`)

```markdown
## What and why
<!-- One or two sentences. Backlog ID(s): e.g. APP-03 -->

## Blueprint / design reference
- Blueprint section:
- Snapshot (UI only): docs/design/figma-handoff/snapshots/<file>
- Design status of the screen: Provisional / Approved

## Checks
- [ ] Tests added or updated, and run locally (paste the command and the result line)
- [ ] Negative case covered (which N-test or refusal)
- [ ] Documents updated (API contract / README / .env.example / CHANGELOG), or "none needed"
- [ ] No credentials, real personal data or assistant product name in the diff

## Evidence
<!-- Commit, environment and quoted output, or "Not run" with the reason -->

## Discrepancies
<!-- Anything that differs from Figma or the blueprint; also logged in handoff-notes.md -->
```

## 7. Code owners (proposed `.github/CODEOWNERS`)

GitHub usernames: Sandra `sandra-oc` · Obvious `Shawnjembu` · Stacey `staceynthoi0-droid` · Sylvain `SylvainKG`.

```text
# Default: any one other member reviews (enforced by the 1-approval rule)
/src/components/                   @Shawnjembu
/supabase/                         @staceynthoi0-droid
/docs/design/figma-handoff/        @sandra-oc @Shawnjembu
/docs/blueprint/                   @SylvainKG
/.github/                          @SylvainKG
/package.json                      @SylvainKG
```

The "Sylvain **and** one other member" rule for `docs/blueprint/` can't be expressed in CODEOWNERS alone. It is met by the code-owner review plus the general approval rule, and checked by the reviewer.

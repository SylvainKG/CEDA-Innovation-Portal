# Release and submission checklist

**Owner:** Sylvain (release coordinator, blueprint §5 Phase 7) · **Status:** Draft for team review · 20 Nov 2026
**Answers:** backlog REL-01, SUB-01, OPS-03, DEF-01, DEM-01 · `docs/process/ci-and-environments.md` §7 · `docs/runbook.md` §3
Every line starts as **Not run**. Tick it only with evidence: a commit, a CI run, a run record in `artifacts/phase-07/`, or a screenshot. Times are CAT (UTC+2).

## Key times

| When | What |
|---|---|
| **Sun 22 Nov, 18:00** | Code freeze. After this, only fixes for defects found in the demo run, each in its own PR |
| Sun 22 Nov, evening | Release commit tagged `v1.0-judging`; judging build deployed; hosted checks |
| **Mon 23 Nov, 12:00** | Aim to finish the upload on Skillsranker |
| Mon 23 Nov, 17:00 | Hard cut-off. Fallback if Skillsranker is unreachable: `hackathon@bih.co.bw`. Keep the submission confirmation |
| 24 Nov – 3 Dec | Judging: the hosted URL and judge accounts stay up; no deploys without organiser approval |

## Decisions still open (owner)

| Decision | Needed by | Owner |
|---|---|---|
| Team folder name for the bundle | 22 Nov | Team lead |
| Judging backend: the current hosted Supabase project (Free plan, keep-alive) or a fresh Pro project (D-15, runbook §1) | 21 Nov | Sylvain (owner), Stacey |
| Installation files: install script (backlog default) or container build; confirm the format with the organisers | 21 Nov | Sylvain, Obvious |
| Video length and format, upload size limit, whether ID copies, certificates or CVs go in the bundle (briefing answers, BCR-002 item 7) | 21 Nov | Team lead |
| DEF-01 contact (replies 08:00–17:00 on weekdays) and the uptime-monitor alert recipient | 22 Nov | Team lead |

## 1. Before code freeze

- [ ] Every PR meant for judging is merged; open drafts are either merged or left out on purpose (list them in the release note)
- [ ] `main` is green on all required checks: `secrets`, `lint`, `typecheck`, `unit`, `build`, `audit`, `Database gate`
- [ ] Hosted database matches `main`: `supabase migration list` shows no migration missing from or extra to `supabase/migrations/` (runbook §3 step 0)
- [ ] `node scripts/third-party-licences.mjs --check` passes on `main`
- [ ] README, user manual (DOC-02) and judge guide name the same accounts, URL and features as the build
- [ ] Claim register (`docs/testing/claim-register.md`): every public claim is **Passed** with evidence, or is worded with its status (Simulated, Deferred, Not run)

## 2. Freeze and tag

- [ ] Release commit chosen on `main`; tag `git tag -a v1.0-judging <sha> -m "Judging release"` and push the tag
- [ ] `release` branch points at the tag; Amplify deploys the `release` branch (hosting guide)
- [ ] Release note in `artifacts/phase-07/release.md`: tag, SHA, date, included PRs, known limitations

## 3. Judging environment (runbook §3 steps 0–9)

- [ ] Amplify `release` branch: `VITE_API_MODE=supabase`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (public key only; never the service-role key)
- [ ] `APP_ORIGINS`, `PORTAL_URL`, the Auth Site URL and the Redirect URLs name the **release URL only**; `http://localhost:5173` and its `/**` entry removed; settings read back and recorded (runbook §3 step 8)
- [ ] Demo passwords set from `DEMO_PASSWORD` (12 characters or more) with `scripts/set-demo-passwords.mjs`; never written in the repo, the bundle or the video
- [ ] Keep-alive workflow configured and one manual run green (if staying on the Free plan)
- [ ] Uptime monitor on the release URL and `health()`, alerting the named contact
- [ ] Fresh backup taken (restore drill command, runbook §6) after the final demo-data change

## 4. Checks on the hosted build (REL-01)

- [ ] `E2E` workflow with `base_url` = release URL: smoke and security-header specs pass (run link recorded)
- [ ] Release URL opened on a **separate device** (phone on mobile data): home, sign-in and one applicant page load
- [ ] Every judge account signs in and lands on its own home; a wrong password is refused
- [ ] One full main journey (blueprint §3.2) and one permission-denied journey (§3.3) on the hosted build, recorded with the SHA
- [ ] `health()` returns `ok: true` with the latest migration version
- [ ] No pgTAP runner against the judging project after 22 Nov, 18:00 (runbook §3 step 9)

## 5. Source package and installation files

- [ ] `scripts/package-source.sh v1.0-judging <team-folder> <dir outside the repo>`: passes the secret and personal-document scan, the licence check and the 150 MB limit; record the size and SHA-256
- [ ] Installation files in the confirmed format; tested from a clean machine (fresh clone → install → run against mock mode and against the hosted backend)
- [ ] The package's commit equals the deployed commit (REL-01: "the source matches the demo build")

## 6. Bundle and upload (SUB-01)

- [ ] One folder named after the team, holding: live URL and judge accounts (in the judge guide, not the source), video (DEM-01), source package, technical proposal (DOC-01, at most 10 pages), user manual and README (DOC-02), installation files
- [ ] Personal documents (ID copies, certificates, CVs) only where the brief asks, and **never** inside the source package
- [ ] Every item checked against the brief by a second person; video playback and link permissions checked by a teammate (DEM-01)
- [ ] Upload on Skillsranker by **12:00 on 23 Nov**; submission confirmation saved in `artifacts/phase-07/` before 17:00

## 7. Judging period (24 Nov – 3 Dec)

- [ ] Hosted URL and judge accounts stay available until results on 3 Dec (OPS-03); the Free-plan project does not pause (keep-alive, uptime monitor)
- [ ] No deploys after the deadline unless the organisers approve; any approved change is logged in `artifacts/phase-07/release.md`
- [ ] DEF-01 contact answers judging questions the same working day, consistent with the proposal
- [ ] Demo data wiped only **after results on 3 Dec** (D-15, as amended by BCR-002 item 4)

# Release note: v1.0.1-judging

**Owner:** Sylvain (release coordinator) · **Status:** Final, 23 Nov 2026. `v1.0.1-judging` supersedes `v1.0-judging` (`f34e97e`, tagged after the 22 Nov freeze): the site auto-deploys `main`, which had moved on, so the submitted source is re-tagged at the deployed commit (REL-01: the source matches the demo build). The organisers moved the upload deadline to 17:00 CAT on 23 Nov.
**Product:** Peolwane · CEDA Innovation Portal. A demonstration prototype with fictional data, built for CEDA's Innovation Fund.

| | |
|---|---|
| Tag | `v1.0.1-judging` (`v1.0-judging` kept for history) |
| Commit | the merge commit of the PR that adds this note (`git rev-parse v1.0.1-judging^{commit}`) |
| Date | 23 Nov 2026 (CAT) |
| Release URL | https://main.d270qrk6a7zs47.amplifyapp.com (Amplify, deploys `main`; Supabase mode, hosted project `hncwpxyuolfxafbemapb`, EU Central) |
| Included PRs | every PR merged into `main` up to the tagged commit (`git log --oneline v1.0.1-judging`). Since `v1.0-judging`: #165 toolkit preview behind a flag (switched on for judging, see below), #167 Peolwane AI guide and page transitions, #168 Supabase URL hardening and audit fixes, #170 API contract for 017, #171 notifications panel, #172 accessibility settings, cookie preferences, terms of use, Data Protection Act rights and Follow us, #173 this release (licence list, release docs), #174 Peolwane AI orb in voice mode, and, after the first tag on 23 Nov, #176 (which includes #175): Peolwane AI in the staff sidebar, regrouped footers, smoother page transitions, the home and How it works heroes, a frosted navbar and a compact Peolwane AI panel with a Text | Voice control. Presentation only: no data, API, route or permission changes |

## What is in this release

The full applicant and staff lifecycle, with every rule enforced in the database:

**submit → screen → two independent evaluations → revision request with a Feedback Roadmap → version 2 → adjudication → published decision → award**

It also includes:
- live chat with CEDA (handled by the administrator since #162);
- notifications, with a panel from the bell;
- accessibility settings (text size, high contrast, reduced motion, underlined links) and cookie preferences;
- reports with CSV export;
- the audit log;
- administration of challenges, forms, rubrics, content, users and roles.

The full main journey (steps 0–17) passed through the real screens against the hosted backend on 21 Nov (run 44909107002), and again on a throwaway stack from `main` on 22 Nov (run 44959243058). See the claim register (`docs/testing/claim-register.md`) for every claim and its evidence.

## Demo configuration that must change for real use

- **Demo staff accounts skip two-step sign-in.** The `demo_mfa_exempt` setting is **on**, so judges can sign in to the seeded staff accounts without an authenticator app. Every other staff account still needs two-step sign-in. **Switch it off for any real use** (D-07, BCR-001 Part C; runbook). There is no settings screen for it: only the backend team can change it.
- **Demo data:** every person, organisation, idea and contact is fictional and labelled DEMO or Sample. The demo data is wiped after judging (D-15).
- **Demo passwords** are set from the environment and given to judges separately. They are never in the repository, the bundle or the video (D-17).
- **Toolkit preview is switched on** (Sylvain, owner of the judging site, 23 Nov): `VITE_TOOLKIT_PREVIEW=true` on the Amplify `main` branch, set in the console, then `main` redeployed. My ideas shows the "Business Development Toolkit" section to applicants and staff home shows the "Reviewer Intelligence Toolkit" section to reviewers. Every tool is marked "Planned feature": **none of them is built**, and the sections make no requests. Remove the variable and redeploy to hide them again.

## Known limitations

| Item | Status |
|---|---|
| Email alerts | **Simulated:** no SMTP is connected. Alerts are queued and shown in the outbox. A new registration can't verify its email, so judges use the seeded demo accounts (C-22) |
| Peolwane AI (site-help assistant) | **Live.** Voice mode shows the Leseding orb (#174). Checked on the release URL on 23 Nov: the button shows, typed questions are answered ("How do I submit an idea?"), and it did not ask for a name or other personal details, including after a bare greeting (BCR-004) |
| Response-time targets | Agreed (D-16) but **not measured** (C-18) |
| Browser and device matrix | **Not run** as a full matrix (C-19); Chromium at 360 and 1280 px is tested |
| Malware scanning of uploads | **Deferred**: the file type is checked from the declared content type |
| Retention and data-subject requests | Proposed in the data-handling note; manual, not automated |
| Region comparison with Mumbai | **Not run**. EU Central, chosen; latency acceptable: p95 315 ms from Gaborone (D-14) |
| Restore into a full Supabase project, and file-storage backup | **Not run** (the database data restore drill passed, C-20) |
| Terms of use and Data Protection Act section | **Draft**, awaiting CEDA legal review; worded "designed with reference to", no compliance claim (D-18) |
| Uptime monitor | **Not set up**; the keep-alive workflow runs and the named contact checks the site daily |
| Settings screens for the review quorum and the demo two-step exemption | **Not built**: stored settings changed by the backend team |
| Peolwane AI processor terms | Leseding's location and its retention of transcripts are **not yet confirmed** (data-handling note §5, §7) |

## Release checks

Recorded as they're done, with links (release checklist §1–§6):
- **Done, 23 Nov:** `main` green on the required checks for #171 and #172 (all CI jobs passed)
- **Done, 23 Nov:** licence list regenerated in this PR (#168 moved `@typescript-eslint` to 8.73.0, build tooling only); `--check` passes
- **Done, 22 Nov:** staging write run (N9 and the full journey, [run 44996202242](https://github.com/SylvainKG/CEDA-Innovation-Portal/actions/runs/44996202242), 7 passed) between Stacey's snapshot (06:56:39 UTC) and her verified exact reset (07:06 UTC; #61)
- **[before freeze]** hosted pgTAP on `main`, all suites (Stacey; run record `artifacts/phase-00/hosted-supabase.md`). No pgTAP runner touches the project after 18:00 CAT (runbook §3 step 9)
- **Done, 23 Nov 07:39 UTC (Stacey, #61, read-only):** `health()` ok at migration 017; next reference still `CEDA-2026-0009`; 14 accounts; 11 cases (8 seeded, 3 drafts without references)
- **[at release]** E2E against the release URL (smoke and security headers; read-only journey)
- **[at package]** source package: size and SHA-256, from `scripts/package-source.sh v1.0.1-judging`

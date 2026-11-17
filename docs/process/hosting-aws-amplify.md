# Frontend hosting on AWS Amplify (replaces Vercel)

**Owner:** Sylvain (release; created the Amplify app and connected the repository) · **Supabase side:** Stacey · **Status:** Draft for team review · 16 Nov 2026
**Implements:** blueprint §5 Phase 0 ("Supabase project, staging, `.env.example`, health check"), OPS-01, D-14, D-17, D-40 · **Proposes:** D-44 (below)
**Scope:** Amplify hosts the **frontend only** (the static Vite build). **Supabase stays the backend:** database, Auth, Storage, Realtime and Edge Functions are unchanged.

---

## 1. Decision to record (D-44, amends D-01)

| # | Decision | Status | Selected | Alternatives | Reason | Owner |
|---|---|---|---|---|---|---|
| D-44 | Frontend hosting | PROPOSED (needs team sign-off) | **AWS Amplify Hosting**, connected to `SylvainKG/CEDA-Innovation-Portal` | Vercel (D-01 as written) | The project owner already created and connected the Amplify app. Amplify serves through Amazon CloudFront, which has edge locations in South Africa, close to users in Botswana | Sylvain |

Once signed off, blueprint v0.4 replaces "Vercel" in D-01, §1.2 FND-01, §5 Phase 0 and §7.2, and the evidence-led skill's three Vercel mentions are updated. Until then, this guide is the plan.

## 2. Who does what

| Task | Owner | Notes |
|---|---|---|
| Amplify app, AWS account, branches, build settings, environment variables, domain | **Sylvain** | Release owner (blueprint §7.2) and creator of the app |
| Supabase projects (staging, then judging), region test (D-14), Auth URL settings, the two public Supabase values | **Stacey** | §4 below |
| Build file `amplify.yml` and security headers `customHttp.yml` in the repository | Sylvain, reviewed by Obvious | Through a pull request (they are root configuration) |
| Live check of each deployment | Sylvain | Browser check script used for PR #6, pointed at the live URL |

## 3. Sylvain: setting up Amplify safely

Do these in order. Steps 1–2 only **read**; nothing changes until step 3.

1. **Record what exists (read only).** In the Amplify console, note in `artifacts/phase-00/README.md`:
   - the AWS account alias (not the account number) and region;
   - the connected branches, and whether a build of `main` has already run (it will have failed: `main` has no `package.json` until PR #6 merges, which is harmless);
   - the current build settings and environment variables (**names only**);
   - whether pull request previews are on.
2. **Check access.** Find out who can sign in to the AWS account. The single-account risk that applied to the Figma file (R-01) applies here too. Add one more member (Obvious or Stacey) with their own IAM Identity Center user or IAM user, never a shared password. Turn on MFA for every human user and the root user. Create an **AWS Budgets alert** (for example USD 10 per month) so an unexpected cost is noticed.
3. **Limit the GitHub connection.** In GitHub → Settings → Applications → AWS Amplify, check that it can see **only** this repository.
4. **Branches:**
   - `main` → **staging**. It deploys on every merge.
   - **Judging:** a separate branch, for example `release`, connected as a second Amplify branch. It is updated only at release (code freeze 22 Nov 18:00), so the judges' URL never changes underneath them. Add it to the `main` ruleset's protections (or a second ruleset) before release.
   - **Pull request previews: off.** They create extra public URLs and are not needed.
5. **Environment variables** (App settings → Environment variables, per branch). `VITE_*` values are baked into the build at build time:

   | Name | `main` (staging) | `release` (judging) |
   |---|---|---|
   | `VITE_API_MODE` | `mock` until the backend adapters exist, then `supabase` | `supabase` |
   | `VITE_SUPABASE_URL` | Staging project URL (from Stacey) | Judging project URL (from Stacey) |
   | `VITE_SUPABASE_ANON_KEY` | Staging anon key (from Stacey) | Judging anon key (from Stacey) |

   **Never** put `SUPABASE_SERVICE_ROLE_KEY`, `DEMO_PASSWORD`, SMTP settings or any AWS key into Amplify. They don't belong to the frontend and would end up in the public JavaScript.
6. **Single-page app redirect** (Hosting → Rewrites and redirects). Without it, refreshing `/ideas/123` shows a 404. Add one rule:

   - **Source address** (copy exactly):
     ```text
     </^[^.]+$|\.(?!(css|gif|ico|jpg|js|png|txt|svg|woff|woff2|ttf|map|json|webp)$)([^.]+$)/>
     ```
   - **Target address:** `/index.html`
   - **Type:** `200 (Rewrite)`
7. **Build settings** come from `amplify.yml` in the repository once it is merged (§6). If the console also has build settings, the repository file wins.
8. **Rollback:** Amplify keeps earlier deployments of each branch. To roll back, redeploy the previous successful build from the branch's deployment list, then fix forward through a pull request.

## 4. Stacey: what the Amplify move means for Supabase

Nothing about the database, RLS, RPCs or Edge Functions changes. Four things depend on the hosting URL:

1. **Supabase projects.** Create the **staging** project first. The judging project (Pro, D-14 region) comes before release. The region follows the latency measurement in `docs/process/ci-and-environments.md` §5.
2. **Auth URL settings** (Supabase → Authentication → URL Configuration). Email verification and password-reset links (IAM-02, IAM-03) go to these addresses, so they must point at Amplify, not Vercel:
   - **Site URL:** the Amplify staging URL (`https://main.<app-id>.amplifyapp.com`, which Sylvain sends you), later the judging URL.
   - **Redirect URLs:** the same Amplify URL(s) plus `http://localhost:5173` for local development. Add no wildcard domains.
3. **Values to hand over:** only the **project URL** and the **anon (public) key**, sent to Sylvain directly, not in the repository, a PR or a group chat that is logged. They are public by design (RLS protects the data), but they still don't belong in git. The **service-role key stays in Supabase** (Edge Function secrets) and is never shared.
4. **Edge Function secrets that name the site** (Supabase → Edge Functions → Secrets, per project). The functions on the `db/*` branches read these (API contract §5 and README):
   - `APP_ORIGINS`: the browser origins allowed to call `attachment-url` and `invite-staff`, comma-separated. Staging: `https://main.d270qrk6a7zs47.amplifyapp.com,http://localhost:5173`. Judging: the `release` branch URL only. **If the Amplify URL is missing, file downloads and staff invitations fail** with a cross-origin error.
   - `PORTAL_URL`: the site address used in invitation emails and alert emails. Staging: `https://main.d270qrk6a7zs47.amplifyapp.com`. Judging: the `release` URL.
   - Neither is secret, but both are set in Supabase, not in Amplify or git.

## 5. Safety rules for the switch

- **One change at a time:** first the decision (D-44), then `amplify.yml`, then environment variables, then Supabase Auth URLs, checking after each one.
- **No secrets in Amplify build logs:** never `echo` an environment variable in a build command.
- **The build fails fast** if `VITE_API_MODE` is missing (§6), so a mis-configured branch never publishes the mock role switcher by accident.
- **Nothing is deployed after the deadline** without organiser approval (backlog OPS-03).

## 6. Repository files (pull request after PR #6 merges)

Prepared on branch `ops/amplify-build`. It opens as a pull request once the frontend scaffold (PR #6) is on `main`, so Amplify's first real build has something to build.

- **`amplify.yml`:** uses the Node version from `.nvmrc`, `npm ci` with an npm cache, a check that `VITE_API_MODE` is set, `npm run build`, and publishes `dist/`.
- **`customHttp.yml`:** security headers on every response: HSTS, no MIME sniffing, no framing, a strict referrer policy, no camera, microphone or location access, and a **Content-Security-Policy** that allows only the site itself plus Supabase (`https://*.supabase.co`, `wss://*.supabase.co`). The policy was proposed by Obvious and checked against the production build with no violations.

## 7. Done when

- [ ] D-44 signed off and recorded in blueprint v0.4
- [ ] Amplify inventory and access recorded in `artifacts/phase-00/README.md`; a second AWS user exists; MFA and the budget alert are on
- [ ] `amplify.yml` and `customHttp.yml` merged; the `main` build succeeds in Amplify
- [ ] Live check of the staging URL passes: deep links refresh without a 404, no horizontal scroll at 360 px, DEMO badge shown, mock switcher visible only while `VITE_API_MODE=mock` is set on purpose
- [ ] Stacey's Supabase Auth URLs, `APP_ORIGINS` and `PORTAL_URL` point at the Amplify URL
- [ ] `ci-and-environments.md`, README and runbook say Amplify, not Vercel

# Demo video: script and shot list

**Owner:** Sylvain (demo video, blueprint Phase 7) · **Status:** Draft, 20 Nov 2026 · **Answers:** backlog DEM-01 ("Video shows submission, multiple reviewers, revision, approval and award, plus dashboard, chat, audit trail and access controls. Length and format follow organiser guidance. A teammate checks playback and link permissions.")
Every shot uses screens that are on `main` (20 Nov) and follows the main journey in blueprint §3.2. Nothing is staged, edited to look faster, or shown working when it isn't.

## Before recording

| Check | Why |
|---|---|
| **Length and format** confirmed with the organisers (briefing, BCR-002 item 7) | The script runs about **8 minutes**; the short cut in the last section runs about **4** |
| Record the **release build** on the judging URL, in Supabase mode | The video must match what judges can use (REL-01) |
| **Record before code freeze** (by Sun 22 Nov, 18:00 CAT) on the release candidate. Tell the backend lead on #61 first: they take a **snapshot**, and reset afterwards (`staging-reset.mjs`, #68) | The recording creates a real case, `CEDA-2026-0009`. The reset tool refuses after the freeze, and nobody deletes rows on the judging project, so a later recording would stay in the data |
| If it can only be recorded **after** the freeze: **don't reset**. Keep the recorded case as an awarded example, and change the judge guide's "your first submission becomes `CEDA-2026-0009`" to "references continue from the last one shown in the video" | The judge guide must match the data judges find |
| Chat open (09:00–16:00 CAT on a working day), or the demo chat override set to "open" | Shot 7 |
| Browser at **1280 × 800**, zoom 100%, no bookmarks bar, notifications off; one **private window per account** | Clean frames; each account signed in separately |
| The demo password typed off-camera, **never shown** (D-17) | No credentials in the video |
| Narration recorded separately, or read from this script | Steady pace; re-record a shot rather than cut mid-action |

## Shot list (about 8 minutes)

| # | Time | Account | What to show (on screen) | Narration (say) |
|---|---|---|---|---|
| 1 | 0:00–0:30 | none | Public home → **Challenges** → the Water-Smart brief: deadline, criteria, template | "This is the CEDA Innovation Portal, a demonstration with fictional data. Anyone can browse open challenges, see how ideas are judged, and download the template." |
| 2 | 0:30–1:45 | `applicant.a` | Sign in → **My ideas** → **Start a new idea**. Fill two sections quickly; point at **Saved** and the progress panel. Attach the business plan PDF. **Review & declare** → accept → **Submit idea** | "Answers save automatically and are also kept on the device, so a dropped connection doesn't lose work. Files are private. The declaration is accepted on the last step." |
| 3 | 1:45–2:05 | `applicant.a` | The **receipt**: reference `CEDA-2026-0009`, version, time in CAT. Back to **My ideas**: the card shows **Submitted** | "Every submission gets a reference immediately. Submitting twice can never create a second case: the server checks a request key." |
| 4 | 2:05–2:40 | `screening`, then `admin` | **Screening queue** → the case → **Record screening: Eligible** with a reason. Then, as admin, **Assign reviewers**: Reviewer 1 and Reviewer 2 | "Staff land on a home page showing what is waiting for them. The screening officer's reason stays with staff. The administrator assigns at least two reviewers." |
| 5 | 2:40–3:40 | `reviewer.1`, then `reviewer.2` | **My reviews** → the case: first the **declaration** (no conflict, confidentiality), *then* the proposal opens. Score each criterion 1–5 with a reason → **Submit**. Show the line "Other reviewers' scores appear after you submit yours". As Reviewer 2: declare and score, then **request a revision** with a deadline and three tasks | "Reviewers declare any conflict before they can see the proposal. They score independently against a published rubric and can't see each other's scores until they submit. Reviewer 2 asks for a revision." |
| 6 | 3:40–4:40 | `applicant.a`, then `reviewer.1` and `reviewer.2` | As the applicant: **Action required** → **Revise your idea** → answer each task (**Addressed** + explanation) → change note → submit **version 2**. As each reviewer: open V2, **Compare with version 1** (each change named), **verify each task**, score V2 | "This is our innovation, the Feedback Roadmap. Feedback becomes concrete tasks; the applicant answers each one in version 2; reviewers verify each answer. Version 1's scores are kept, and two V2 scorecards move the case to adjudication." |
| 7 | 4:40–5:30 | `adjudicator`, then `admin` | **Ready for decision** → score panel (individual and weighted scores, spread) → **Record decision: Approved** with a reason → **Publish**. As admin: **Record award** | "A decision is a draft, invisible to the applicant, until it is published. An award can only follow an approval." |
| 8 | 5:30–5:50 | `applicant.a` | The case view: timeline, **Approved**, the reason, next steps, the award | "The applicant sees the outcome, the reason and what happens next." |
| 9 | 5:50–6:20 | `applicant.a`, then `consultant` | **Chat** → ask a question. As the consultant: **Support inbox** → accept → reply → close | "Live chat runs during CEDA's service hours, decided by the server." |
| 10 | 6:20–6:50 | `admin` | **Reports**: participation, outcomes, time in stage; **Export CSV**. **Audit log**: filter by the case, showing each action, who and when | "Dashboards come from the case history. Every workflow action is in the audit trail, and no portal user, including administrators, can change or delete it." |
| 11 | 6:50–7:40 | `applicant.b`, `applicant.a`, `reviewer.3` | **Access control:** as Applicant B, paste Applicant A's idea address → **"We can't find this page"**. As Applicant A, open `/staff/queue/screening` → **"You don't have access to this page"**. As Reviewer 3 (not assigned): the case isn't listed. As admin, **Users and roles**: the controls on your own row are disabled | "Access is enforced by the database, not just hidden in the screens. Another applicant gets 'not found'. Pages for other roles say 'no access'. An unassigned reviewer sees nothing. Even an administrator can't change their own roles." |
| 12 | 7:40–8:00 | none | Phone width (360 px): My ideas and the form. End card: "Demonstration with fictional data. Evidence: claim register" | "It works on a phone. Every claim in this video has its test evidence in the claim register." |

**Staff home:** every staff account opens on **Home**; go to the queue from its "next" list or the menu, without stopping on it.

**Optional, if the organisers allow more than 8 minutes:** as admin, the **Challenges** and rubric editor (weights must total 100%) and **Chat settings**; as `committee.ext`, **All cases** showing reference and stage only (D-08).

**Do not show:** registering a new account or inviting staff (both need email, which is Simulated), or the two-step sign-in screen (demo accounts are exempt, so it only shows the exemption). Don't say email alerts are sent.

## Short cut (about 4 minutes), if the organisers set a shorter limit

Shots **2–3** (submit and receipt), **5** (declaration, then scoring; Reviewer 2's revision request), **6** (the Feedback Roadmap, shortened; second reviewer off-screen), **7–8** (decide, publish, award; applicant view) and **11** (access control: Applicant B "not found" only).

## After recording

- [ ] A teammate watches the whole video and checks playback, sound and **link permissions** (DEM-01).
- [ ] No password, real personal data or browser autofill appears in any frame.
- [ ] Recorded before freeze: the backend lead resets staging to the snapshot (`staging-reset.mjs reset`) and records it in the run record. Recorded after freeze: no reset, and the judge guide is updated (see "Before recording").
- [ ] The file name and length go into `docs/submission/release-checklist.md` §6.

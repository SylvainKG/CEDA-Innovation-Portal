# CEDA Innovation Portal backlog

**Planning baseline:** CEDA hackathon brief supplied on 10 November 2026, checked against the event overview, event rules and FAQ on 10 November 2026.  
**Build window:** 13–23 November 2026. Final submission due 23 November at 17:00 CAT.  
**After submission:** Judging and shortlisting 25 to 30 November. Top 5 present in person on 3 December 2026 at CEDA Head Office, Gaborone.  
**Architecture:** Responsive web portal, modular backend, relational database, private file storage and background notifications.  
**Initial status:** All items are To do. Owners are suggested roles. Assign a named person at kickoff.

**Priority:** P0 establishes a working end-to-end path or enables final submission. P1 completes required rubric coverage. P2 is a differentiator to build after the required features are stable. **P0 and P1 are both in scope.** QA means verification and release. The IDs in the dependency column are prerequisites for integrated acceptance. Teams can build against agreed contracts before these prerequisites are complete.

**Event rules that shape the work:** No build work before 13 November. Planning, written documents and design sketches made earlier are allowed. Every date and time is CAT.

## Phase A · Setup and submission · 13–15 November

| ID | Priority | Suggested owner | Item | Depends on | Acceptance check |
|---|---|---|---|---|---|
| FND-01 | P0 | Backend / DevOps | Agree data and API contracts, scaffold modules and create a reproducible staging deployment | — | A clean checkout runs with documented environment variables, migrations and fictional seed data. A staging health check succeeds. The repository is created on or after 13 November so commit history shows the work was done during the event. |
| UX-01 | P0 | Frontend / UX | Establish role navigation and accessible responsive components | — | Applicant and staff routes have distinct navigation, readable labels, keyboard focus and usable layouts on mobile and desktop. Icons come from one consistent set and always carry a text label. Links look and behave the same on every page. Apply CEDA guidance on layout, colours and fonts when received. |
| IAM-01 | P0 | Backend / Security | Authenticate and scope staff and committee access | FND-01 | An admin can invite staff and committee users and grant or revoke roles. Staff get only assigned permissions. An external committee member sees only authorised cases. A consultant cannot read proposals or scores by calling the API. |
| IAM-02 | P0 | Frontend + Backend | Applicant registration, verified email and sign-in | FND-01, UX-01 | A new applicant creates a password, verifies email and signs in. An unverified account cannot submit. Registration shows a privacy notice stating purpose and retention and records consent. |
| IAM-03 | P1 | Frontend + Backend | Change and recover password | IAM-02 | A signed-in user can change the password. Recovery uses an expiring, single-use token and succeeds without exposing whether a submitted address has an account. |
| ADM-01 | P0 | Frontend + Backend | Create and publish challenge and application form | IAM-01, UX-01 | An authorised admin publishes a challenge with audience, deadline, fields, required documents and downloadable templates or guidance files. Applicants see the published version and can download those files. |
| ADM-02 | P1 | Frontend + Backend | Edit, unpublish and delete portal content | ADM-01 | An admin can edit or remove content, uploaded files and unused drafts. Previously submitted cases retain the form version and required documents used at submission. |
| APP-01 | P0 | Frontend + Backend | Discover challenge and save an idea draft | ADM-01, IAM-02 | An eligible audience can open the brief, save incomplete work and resume their own draft. |
| APP-02 | P0 | Backend / Security | Upload and retrieve confidential attachments | IAM-01, APP-01 | Files meet type and size rules and are stored privately. A different applicant and an unassigned reviewer cannot download them. |
| APP-03 | P0 | Frontend + Backend | Submit idea and receive tracking reference | APP-01, APP-02, SEC-01 | Mandatory fields are clearly marked and enforced on the server. Valid submission creates one immutable version and one case. Missing fields or a closed challenge preserve the draft. Retrying a completed submit returns the original reference. |
| SEC-01 | P0 | Backend / Security | Establish audit event recording | FND-01 | A recorded business action identifies actor, target, action and time. Ordinary users cannot alter audit entries. Logs exclude passwords and proposal contents. |

**Phase exit:** A verified applicant can submit a private idea on staging and receive a reference. A different account cannot read it.

## Phase B · Review, revision and award · 16–19 November

| ID | Priority | Suggested owner | Item | Depends on | Acceptance check |
|---|---|---|---|---|---|
| REV-01 | P0 | Frontend + Backend | Screen cases and assign multiple evaluators | APP-03, IAM-01 | A screening officer records eligibility and reason. An authorised administrator can assign two reviewers. Both receive access only to the assigned case. |
| REV-02 | P0 | Frontend + Backend | Configure and publish scoring criteria | ADM-01 | An admin publishes a versioned rubric with criteria, weights and score ranges. Existing submitted scores remain linked to the rubric used at scoring. |
| REV-03 | P0 | Frontend + Backend | Score a version and view team evaluation | REV-01, REV-02 | Two assigned reviewers independently submit scores and reasons for the same version. The panel can view the individual evaluations together with a weighted aggregate score to support adjudication. Unassigned reviewers are denied. |
| REV-04 | P0 | Frontend + Backend | Request clarification or revision | REV-01 | Authorised staff publish specific feedback and a response deadline. The applicant sees the request and the case shows Action required. |
| APP-04 | P0 | Frontend + Backend | Respond or resubmit with history | REV-04, APP-02 | An eligible response links to the revision request. A resubmission creates a new version under the same reference and routes back to the requesting stage. Old reviews remain tied to old versions. |
| DEC-01 | P0 | Frontend + Backend | Adjudicate and publish decision | REV-03, APP-04 | The adjudicator records an outcome, reason and assessed version. The applicant cannot see an unpublished decision and sees the approved outcome after publication. |
| DEC-02 | P0 | Frontend + Backend | Record award after approval | DEC-01 | An authorised user records an award against an approved case. Approval and award appear as distinct events. An ineligible case cannot be awarded. |
| NTF-01 | P0 | Frontend + Backend | Show status timeline and live dashboard updates | APP-03, REV-04, DEC-02 | The timeline uses the stages submission, review, feedback, approval and award. Applicant and authorised committee dashboards, internal and external, reflect saved transitions without manual refresh. An in-app notification list shows unread updates. Internal notes stay hidden from applicants. |
| NTF-02 | P1 | Backend + Frontend | Send free opt-in submission alerts | NTF-01 | A subscribed user receives an alert at no charge for a relevant change. Opt-out stops future optional sends. A failed send can retry without reversing the saved status. |

**Phase exit:** A judge can follow one case through screening, two reviewers, feedback, resubmission, decision, approval and award. The applicant timeline reflects each public stage.

## Phase C · Support, oversight and verification · 16–22 November

Start the chat and help work in parallel with Phase B. Reserve 20–22 November for integration checks and packaging.

| ID | Priority | Suggested owner | Item | Depends on | Acceptance check |
|---|---|---|---|---|---|
| HLP-01 | P1 | Frontend / UX | Provide FAQs and regulatory contacts | ADM-02 | Applicants can find guidance from the submission area. FAQs cover common questions about portal content. A contact entry exists for each relevant regulatory authority, confirmed with CEDA or clearly marked as sample data until confirmed. Admins can edit and publish both. |
| CHT-01 | P1 | Frontend + Backend | Connect applicant and consultant through shared live chat | IAM-01, IAM-02 | The chat launcher is reachable from the submission form and from general pages. During service hours, two applicant sessions can chat with consultants. An agent can handle multiple chats. Each chat is private to its participants and authorised support staff. |
| CHT-02 | P1 | Backend + Frontend | Enforce chat hours and availability messages | CHT-01 | In Gaborone time, chat opens 09:00–16:00 on configured working days. Busy, outside-hours and non-working-day states show suitable messages. The portal remains accessible. |
| CHT-03 | P1 | Backend + Frontend | Show chat statistics | CHT-01 | A support lead can see chat volume, handled and missed conversations, and waiting time over a selected period. Counts match the seeded test sessions. |
| RPT-01 | P1 | Backend + Frontend | Report programme participation, outcomes and timelines | NTF-01 | Authorised staff can filter a dashboard by challenge and period. Participation counts, outcomes and time in stage reconcile with seeded cases. |
| SEC-02 | P0 | Security / QA | Verify case boundaries, privacy and audit | APP-02, DEC-02, CHT-01 | Negative tests prove cross-case and cross-role access is denied. Audit entries cover significant workflow and admin changes. The hosted site uses HTTPS only, passwords are hashed and repeated failed sign-ins are rate limited. A dependency vulnerability scan is run and its result recorded. Document data purpose, access and proposed retention against the Data Protection Act, 2024. |
| SEC-03 | P1 | Frontend + Backend | View and filter the audit trail | SEC-01, IAM-01 | An authorised admin or auditor can filter audit entries by actor, case, action and date. Other roles are denied. The demo shows entries for a full case journey. |
| OPS-01 | P1 | DevOps | Document and exercise hosting and incident recovery | FND-01 | Record chosen cloud provider, region, storage cost assumptions, monitoring, 24/7 hosting plan, and backup and restore steps. Run and record a recovery check. |
| OPS-02 | P1 | DevOps / UX | Publish fault support details | OPS-01, HLP-01 | A support page and the manual state severity levels, response and fix turnaround times, a contact route and support hours for faults while hosting. |
| ARC-01 | P1 | Backend | Demonstrate extensibility and integration readiness | IAM-01, REV-02 | An admin adds a new role through configuration and it receives only its granted permissions. A new scoring criterion is added without code changes. The API is documented in OpenAPI form. A short scaling note explains how each tier scales and where external tools would connect. |
| QA-01 | P1 | QA / UX | Test browsers, devices, usability and response time | NTF-01, CHT-02, RPT-01 | Test Chrome, Edge and Firefox plus mobile viewport and keyboard flows. Record environment, sample size and measured response times for key tasks against targets set at kickoff. Label unrun checks. |
| INN-01 | P2 | Frontend / UX | Compare idea versions side by side | APP-04 | An assigned reviewer can see which fields and evidence changed while earlier versions remain readable and private. |

**Phase exit:** Required functionality is demonstrable. Evidence identifies the tested build, what passed, and what remains open.

## Phase D · Proposal, demo and final package · by 23 November

| ID | Priority | Suggested owner | Item | Depends on | Acceptance check |
|---|---|---|---|---|---|
| DOC-01 | P0 | Proposal lead | Maintain technical proposal and rubric evidence | — | Proposal is in English and at most 10 pages. It covers motivation, research, design, architecture, stack and lessons learned. It explains secure submission, team evaluation and adjudication, stage tracking, role-based access, real-time updates, feedback, reporting dashboards, scalability, data integrity and ease of use for every user type. A research log is kept from 13 November as evidence. The final version links claims to observed demo or test evidence and marks open items. |
| DOC-02 | P0 | UX + DevOps | Write role-based user manual and README | FND-01 | Manual covers applicant, reviewer, adjudicator, admin and consultant tasks, plus a judge guide for each seeded role and the fault support details. README names the tools needed. A second team member follows the README from a clean checkout, including configuration, migrations and fictional seed setup. |
| REL-01 | P0 | DevOps / QA | Verify hosted solution and create source package | SEC-02, SEC-03, QA-01, IAM-03, NTF-02, HLP-01, CHT-03, OPS-01, OPS-02, ARC-01 | Live URL loads on a separate device. Judge access and seeded roles are tested. The source matches the demo build, contains no credentials and lists third party licences. Installation files take the format confirmed with organisers, with a container build or install script as the default. Confirm the 150 MB limit with organisers. |
| DEM-01 | P0 | Demo lead | Record walkthrough | REL-01 | Video shows submission, multiple reviewers, revision, approval and award, plus dashboard, chat, audit trail and access controls. Length and format follow organiser guidance. A teammate checks playback and link permissions. |
| SUB-01 | P0 | Team lead | Verify and submit final bundle | DOC-01, DOC-02, REL-01, DEM-01 | The bundle sits in a folder named after the team. Check live URL, video, source, proposal, manual, README and installation files against the brief. Confirm whether ID copies, certificates and CVs belong in this bundle and keep them out of the source. Verify upload size. Aim to upload on Skillsranker by 12:00 CAT on 23 November. If Skillsranker is unreachable, send through hackathon@bih.co.bw. Retain the submission confirmation before 17:00 CAT. |

## Phase E · Judging and finals · 24 November to 3 December

| ID | Priority | Suggested owner | Item | Depends on | Acceptance check |
|---|---|---|---|---|---|
| OPS-03 | P0 | DevOps | Keep the submitted build live through judging | SUB-01 | Hosted URL and judge accounts stay available until results on 3 December. Monitoring alerts reach a named person. Nothing is deployed after the deadline unless organisers approve it, and any approved change is logged. |
| DEF-01 | P0 | Team lead | Respond to judging clarifications | SUB-01 | A named contact watches email and phone from 08:00 to 17:00 on weekdays during judging and replies the same working day. Answers stay consistent with the proposal. |
| PRE-01 | P0 if shortlisted | Demo lead + whole team | Prepare the Top 5 presentation | DEM-01 | Pitch uses the organiser template and fits 10 minutes including Q&A. Every team member speaks or answers questions. A recorded fallback exists if the live demo fails. The pitch explains why the solution is unique and impactful, which also serves the public vote. |

## Rubric coverage

| Criterion | Points | Items |
|---|---|---|
| CEDA layout, colours and fonts | 2 | UX-01 |
| Browser access | 2 | QA-01 |
| Self registration with email or phone validation | 2 | IAM-02 |
| Authentication method | 2 | IAM-02 |
| Create, change and recover password | 2 | IAM-02, IAM-03 |
| Cloud provider, region and storage cost | 2 | OPS-01 |
| 24/7 availability | 3 | OPS-01, OPS-03 |
| Admin manages content, form and accompanying documents | 3 | ADM-01, ADM-02 |
| Multi level evaluation, custom criteria and adjudication | 3 | REV-01, REV-02, REV-03, DEC-01 |
| Feedback and iteration | 3 | REV-04, APP-04 |
| Online chat with hours, notices and reporting | 2 | CHT-01, CHT-02, CHT-03 |
| Fault support details and turnaround | 2 | OPS-02 |
| FAQs and regulatory contacts | 2 | HLP-01 |
| Reporting dashboards | 3 | RPT-01 |
| Free alert subscription | 2 | NTF-02 |
| Intuitive and easy to use | 5 | UX-01, QA-01 |
| Navigation, labels, icons and links | 5 | UX-01 |
| Aesthetic interface | 5 | UX-01 |
| Role based access | 5 | IAM-01, SEC-02 |
| System response time | 5 | QA-01 |
| Audit trail | 5 | SEC-01, SEC-03 |
| Cyber security and data privacy | 5 | APP-02, SEC-02 |
| Cross browser and device compatibility | 2.5 | QA-01 |
| Scalability and flexibility | 2.5 | ARC-01 |
| Innovation and creativity | 10 | INN-01 |
| Demo | 5 | DEM-01, PRE-01 |
| Technical proposal | 5 | DOC-01 |
| Presentation and time management | 5 | PRE-01 |
| Public vote at finals | 10% of final score | PRE-01 |

**Brief functions 3.2 (a) to (g):** submission interface APP-01, APP-03 · evaluation workflow REV-01 to DEC-01 · real-time tracking NTF-01 · access control IAM-01, SEC-02 · feedback REV-04, APP-04 · reporting RPT-01 · scalability ARC-01.

**Submission format:** URL REL-01 · manual DOC-02 · video DEM-01 · installation files REL-01 · source REL-01 · README DOC-02 · 150 MB limit SUB-01 · proposal DOC-01 · personal documents SUB-01.

## Decisions and checkpoints

| When | Decision or check |
|---|---|
| Registration · by 12 November | Team lead handles eligibility, application fields and individual supporting documents separately from the product backlog. Declare any affiliation with established tech firms. |
| From 13 November | Build work starts. At least one member is online for the whole hackathon. The full team is reachable 08:00 to 17:00 on weekdays. |
| Briefing · 13 November | Confirm judging access, install package for a browser app, upload size scope, video length, brand direction, whether personal documents go in the final bundle, and any restrictions on hosting, open source libraries or external tools. |
| Clarification · 16 November | Confirm approval and award authority, review quorum, visibility for external committee members, the working-day calendar for chat, whether chat must serve visitors who have not registered, and the regulatory authority contact list. |
| Clarification · 20 November | Recheck evidence expectations and remaining submission questions. |
| Before final upload | Run one complete journey and one permission-denied journey using the hosted build. Record the exact version tested. |
| 25 to 30 November | Judging and shortlisting. Keep the site live and answer clarifications. |
| 3 December | Top 5 presentations, public vote and results. |

**Shared definition of done:** Acceptance check passes on the integrated build, access and failure cases are covered where applicable, a teammate reviews the change, and supporting evidence is available for the proposal or demo. Keep sample data fictional. Update the item status as To do, In progress, In review, Done or Blocked.

## Change log · 10 November 2026

New items: SEC-03 audit trail viewer, OPS-02 fault support details, ARC-01 extensibility, and Phase E with OPS-03, DEF-01 and PRE-01.

Tightened items: FND-01, UX-01, IAM-01, IAM-02, ADM-01, ADM-02, APP-03, REV-02, REV-03, NTF-01, NTF-02, HLP-01, CHT-01, SEC-02, OPS-01, QA-01, DOC-01, DOC-02, REL-01, DEM-01 and SUB-01.

Added sections: event rules, rubric coverage and the judging dates in checkpoints.

# BCR-004 — Peolwane AI: a site-help assistant from an outside AI service (proposes D-46, narrows D-25)

**Status:** Proposed · **Author:** Sylvain (Integration, Testing & Documentation Lead) · **Date:** 21 Nov 2026
**Affects:** D-25 (no external AI), D-41, R-11, claim C-17, `customHttp.yml`, the privacy page
**Approval rule:** as BCR-001. Needs Sylvain (integration) and Stacey (security and backend). ABM (acting design owner since #123) and Obvious for information.
**Schedule impact:** none on the lifecycle. Code is ready on its branch. It needs Leseding's key and origin allowlist before it can go live. If those don't arrive by the 22 Nov code freeze, the build ships without the assistant: with no key, nothing is shown.

## Why

The team lead asked for a voice-first assistant on every page, with text as an option, called **Peolwane AI**. Its job is to help people find their way around the portal. The hackathon provides the Leseding AI Engine for this: speech to text, answers from Google Gemini using a knowledge base Leseding loads, and a spoken reply.

**D-25** (confirmed 14 Nov) says "No external AI". It rejected an "AI assistant" because "no proposal data goes to outside AI services". Public claim **C-17** rests on D-25, and so does the evidence for it: the site's browser policy only lets the site connect to itself and Supabase. Peolwane AI sends what a person types or says to an outside AI service, so D-25 and C-17 must change before it ships.

## Proposed change (D-46)

1. **D-25 is narrowed, not dropped.** The portal never sends proposal or case data to an outside AI service: no form content, attachment, score, note or decision. INN-03 stays rule-based.
2. **Peolwane AI is the one exception, for site help only.** It receives only what the person types or says to it, in that panel. Nothing from the page or the account is passed to it, and it can't read the portal's API.
3. **It is opt-in and visible.** It is never open by default. The panel says that answers can be wrong and that people shouldn't share personal or case details. The privacy page explains where the text and voice go. Everything works without it.
4. **The browser policy is widened only as far as needed:**
   - `connect-src` adds `https://lesedingaiengine.co.bw`;
   - `media-src 'self' blob:` lets the spoken replies play;
   - `Permissions-Policy` becomes `microphone=(self)`.

   `script-src` stays `'self'`. We use Leseding's HTTP API from our own code, not their widget script, so no outside code runs on the portal.
5. **The key is configuration.** `VITE_LESEDING_KEY` and `VITE_LESEDING_BASE` are Amplify environment variables, never committed. With either missing, the assistant isn't rendered. The key is a front-end embed key, public by design and locked by Leseding to our origins (like the Supabase publishable key).
6. **C-17 is reworded** to "No proposal or case data is sent to external AI services; Peolwane AI receives only what a person types or says to it", with this change and the code as evidence.
7. **R-11** adds a mitigation: the in-panel notice, and the privacy page section.

## Alternatives considered

- **Leseding's drop-in widget** (one script tag): faster, but it runs their script on every page, needs `script-src` widened, and takes its name and greeting from their config, not ours. It also renders outside our design system and accessibility checks. Rejected.
- **Hide the assistant on the proposal form and case pages:** lowers the chance of pasted proposal text, but the request is "on all pages". The notice covers this instead. It can be added later as a one-line change per page if the reviewers prefer it.
- **Not building it:** keeps D-25 as is, but doesn't meet the request.

## Open items

- **From Leseding:**
  - the production key;
  - allowlisting `https://main.d270qrk6a7zs47.amplifyapp.com` and `http://localhost:5173`;
  - loading a knowledge base about the portal (the FAQ, the judge guide and the user manual are the natural sources).
- **Data protection:** Leseding's terms for retention and use of transcripts, and where it processes data. Until known, the privacy text and the data-handling note say only what we control, and list it as a gap.
- **Quota (R-11, from Stacey's review):** the embed key is in the public bundle, and Leseding's origin lock relies on the browser's `Origin` header, which can be set outside a browser. The risk is someone using up our quota, not our data. If the assistant stops answering, the rest of the portal is unaffected.

## Sign-off

| Who | Role | Decision | Date |
|---|---|---|---|
| Sylvain | Integration, Testing & Documentation Lead | Proposed | 21 Nov 2026 |
| Stacey | Backend & Security | | |

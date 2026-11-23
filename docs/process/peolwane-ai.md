# Peolwane AI

**Owner:** Sylvain · **Decision:** BCR-004 (proposes D-46) · **Updated:** 23 Nov 2026

Peolwane AI is a voice-first assistant, with text as an option, shown at the bottom right of every page. It helps people find their way around the portal. The Leseding AI Engine does the work: it turns speech into text, answers using Google Gemini and a knowledge base Leseding loads, and produces the spoken reply. We build our own UI on Leseding's HTTP API instead of using their drop-in widget (the reasons are in BCR-004).

## How it works

| Step | Call | Notes |
|---|---|---|
| Speak | `POST /api/transcribe` (multipart `file`, `language=english`) | Recorded with `MediaRecorder` as webm/opus or ogg. Stops on the second tap, or after 30 s |
| Answer | `POST /api/chat` (`question`, `language`, last 10 turns of `history`, `session_id`, `turn_index`, `source`) | The reply streams in as `text/plain` and is shown as it arrives |
| Reply aloud | `POST /api/speak` (`text`, `language`) | Voice mode only. Plays as `audio/mpeg` from a `blob:` URL. If the browser blocks autoplay, the text is still on screen |

Every call sends `X-API-Key`. The code is in `src/features/assistant/`:
- `leseding.ts`: the client and configuration;
- `store.ts`: the conversation shared across pages and restored from tab-scoped `sessionStorage` after a reload;
- `PeolwaneAssistant.tsx`: the button and panel, mounted in the public, applicant and staff shells.

**Fallbacks:**
- **Voice unavailable:** if the browser can't record in a supported format, or the microphone is refused, the panel switches to text and says why.
- **Engine errors:** a refused key (401/403), the engine being busy (429) or the network failing show a plain message; the typed question stays.

## Configuration

| Amplify environment variable | Value | Notes |
|---|---|---|
| `VITE_LESEDING_BASE` | `https://lesedingaiengine.co.bw` | Must be https (http only for localhost). It must match `connect-src` in `customHttp.yml` |
| `VITE_LESEDING_KEY` | `lsk_live_…` from Leseding | A front-end embed key, public by design and locked to our origins. Never commit it |

With either variable missing, the assistant isn't rendered at all. Like every `VITE_` variable, a change only takes effect after a **rebuild** of the site.

**Ask Leseding for:**
1. allowlisting the exact origins `https://main.d270qrk6a7zs47.amplifyapp.com` and `http://localhost:5173`;
2. loading a knowledge base about the portal, from the FAQ, the judge guide and the user manual.

## Privacy and accessibility

- **What it receives:** only what the person types or says in the panel. It is never given page, form or account data, and it has no access to the portal's API. The panel tells people not to share personal or case details. The privacy page has a Peolwane AI section, shown when the assistant is configured.
- **What is kept:** completed text exchanges, the conversation ID/turn count, and the selected voice/text mode are kept in `sessionStorage` for the current tab. This lets the conversation continue across route changes and reloads. The tab's storage clears when that tab closes; it is not linked to an account, sent to the portal backend, or shared with another tab. Voice recordings are not stored after transcription. If browser storage is blocked or full, the assistant still works but may not restore the conversation after a reload.
- **Accessibility:**
  - the panel is not modal, so the page stays usable;
  - Esc closes it and returns focus to the button;
  - focus goes to the microphone or the text box when the panel opens;
  - Voice and Text are toggle buttons (`aria-pressed`);
  - the conversation is a `log` region, and status changes are announced.
- **Placement:** one Peolwane AI launcher appears on every shell. Scrolling folds it to a small sparkle button and closes the open panel without clearing the conversation.
- **Human support:** the separate "Chat with CEDA" route is a consultant conversation, not another AI. It remains available from "Message CEDA support" under Need help? on My ideas.

## Tests

`src/features/assistant/assistant.test.tsx` covers:
- configuration rules, and that nothing is shown without configuration;
- the request shapes of all three calls;
- streaming;
- error messages;
- the text and voice flows (with a fake `Audio`);
- the fallback to text;
- Esc and focus return.

The live engine is **Not run** until Leseding's key and allowlist are in place.

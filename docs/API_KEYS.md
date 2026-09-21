# API keys

This app supports **bring-your-own-key** external models alongside the built-in
local Tesseract OCR. This page explains where keys are stored, which providers
are browser-friendly, and the lifecycle of a key.

## Storage

- **IndexedDB** (database `ordinary-chobi-reader`, store `credentials`) holds one
  value per provider. Reading/writing is done through `src/storage/credentials.ts`.
- **localStorage** (`ocrb.provider.gemini`, `ocrb.provider.openai`) holds only
  non-secret configuration: base URL and model name.
- Keys are never in the repo, never in localStorage, never in exports, never in
  logs. A connection-test request sends the key only to the provider's API.

## Where to get keys

| Provider | Key source | Browser/CORS status |
|---|---|---|
| Google Gemini | Google AI Studio → Get API key | CORS-friendly; works from browsers. ⚠️ Google is migrating Gemini API web apps from API keys to Firebase/authentication keys — see notes below. |
| OpenAI | platform.openai.com | Historically intermittent for pure-browser use; OpenAI has had CORS incidents. Test with the *Test connection* button before relying on it. |
| Groq | console.groq.com | Uses the OpenAI-compatible format and generally works from browsers. |
| OpenRouter | openrouter.ai | OpenAI-compatible, browser-friendly. |
| Custom endpoint | your own service | Must send CORS headers and serve the OpenAI Chat Completions schema. |

You can try any OpenAI-compatible endpoint by choosing **Custom** and entering a
base URL ending in `/v1`.

## Gemini migration warning (verified Sept 2026)

Google plans to migrate Gemini API web apps from AI Studio API keys to
Firebase-managed authentication keys. Standard API keys may stop returning valid
responses for web clients after the migration. If Gemini starts failing with
401/403, the app shows the provider's exact error message — see Gemini's
migration docs, switch to a Firebase configuration, or use a different provider.

## Lifecycle

1. **Add** — enter a key on Models → *External models* (or Settings). Stored in
   IndexedDB immediately.
2. **Verify** — use *Test connection* (lists `/models`, no OCR, cheap) to confirm
   the key, endpoint, and CORS all work from *this* browser.
3. **Use** — Extraction/Workflow/Models-experiment jobs send the key as the
   provider wants it (`Authorization: Bearer …` for OpenAI-compatible,
   `x-goog-api-key` for Gemini). `confirmExternal` asks before the first send.
4. **Forget** — Models, Settings, or Privacy. Also clears the matching
   localStorage config.

## Security notes

- Keys stored in IndexedDB can be read by any script running on this origin.
  That is inherent to a static site; it is why "forget" is one click and why keys
  are BYOK rather than shared.
- Use an authorization-scoped key if your provider supports scopes (limit to the
  services the app uses).
- Treat stored keys like shared secrets on a shared machine: use a key at the
  lowest permission level that still works, and rotate if in doubt.
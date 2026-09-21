# Privacy

This document is the source of truth mirrored by the in-app Privacy page.

## Where your files go

- **Local OCR (Tesseract)** — documents are processed entirely in your browser.
  No upload, no analytics, no network request for document content.
- **External models (Gemini, OpenAI-compatible)** — document images are sent to
  the configured provider **only when you run a job with that model**. The first
  run asks for confirmation (disable by unchecking *Confirm before external API
  calls* in Settings). Each provider requires your own key.
- **No account, no server, no telemetry.** This is a static site with no backend.

## Where API keys go

- Keys are stored **only in IndexedDB in the browser where you entered them**.
  They are origin-scoped and not readable by other websites, but a static site
  has no server — so this is not the same security posture as a managed secrets
  server. The key is "bring your own" (BYOK) and entered by you.
- Keys are never: committed to the repo, written to disk by the app, transmitted
  except to the selected provider (in the provider's own API request), or
  included in TXT/JSON/ZIP exports.
- Two-click deletion everywhere: *Settings*, *Models*, *Privacy*, and the footer
  of the in-app pages.

## Where settings and documents go

- **Settings** (`theme`, defaults, preprocessing) are stored in `localStorage` so
  preferences survive reloads.
- **Queue documents and results** live only in page memory. Closing the tab
  clears them. Nothing is written to disk unless you choose to download it.
- The only document bytes written are ones *you* download (TXT/JSON/ZIP).

## Honest reporting

The app does not invent accuracy:

- line regions shown in the preview come from the OCR engine itself;
- confidence values come from Tesseract (API providers generally do not return
  per-character confidence, so nothing is faked);
- preprocessing reports the exact steps applied;
- CER/WER figures are always labeled as comparisons against *your* ground truth.

## Related

- `src/storage/credentials.ts` — security model notes in code
- `docs/API_KEYS.md` — key configuration and browser/CORS notes
- `docs/MODELS.md` — what each provider can and cannot do
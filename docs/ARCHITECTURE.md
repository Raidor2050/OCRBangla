# Architecture

## System at a glance

- **Stack:** Vite 6 + React 18 (TypeScript, strict `tsc -b`), React Router 7 with
  HashRouter (so deep links and refresh work on GitHub Pages), Vitest + jsdom for
  unit tests, ESLint (flat config, warnings fail).
- **Repo layout**

```
public/lang/            Bengali traineddata bundled for offline local OCR (+ NOTICE)
src/
  ocr/                  core OCR domain
    types.ts            shared contracts (PIPELINE_ORDER, PreprocessOptions, …)
    pipeline.ts         document orchestration (render → preprocess → OCR → normalize)
    preprocessing/      pure pixel ops + Web Worker adapter
    postprocessing/     Bangla normalization + orthotactic issue tagging
    providers/          tesseract (local), gemini, openai-compatible, http client, prompts, connection tests
    registry.ts         provider list + status
  documents/            file-kind detection, image decoding, PDF rendering (pdf.js)
  storage/              settings (localStorage) + credentials (IndexedDB)
  evaluation/           CER/WER, edit distance, diff ops, substitution counts
  state/                AppContext (settings, theme, toasts, keys, provider status)
  components/           queue, doc pane, text pane, pipeline bar, controls, modals, compare panel
  pages/                Extraction, Workflow, Models, Settings, Privacy
  utils/                ZIP export (fflate)
```

## Data flow (Extraction)

1. Files are added to a **queue** (`src/state/job.ts`). Kinds are detected from
   extension/`File.type` (`src/documents/detect.ts`); unsupported files are
   rejected with a clear message; drop + paste (images) are supported.
2. `runDocumentOcr` (`src/ocr/pipeline.ts`) drives each file sequentially with an
   `AbortController`:
   - **render** — PDFs are rendered page-by-page with pdf.js (worker hosted as a
     Vite chunk) at a bounded max dimension (~1600px, `OcrRenderer`); images are
     decoded and scaled to `targetDpi`.
   - **preprocess** — `preprocessCanvas` (`preprocessing/client.ts`) sends the page
     to a Web Worker (`preprocessing/preprocess.worker.ts`) running the pure,
     deterministic ops in `preprocessing/ops.ts` (grayscale, contrast, median
     denoise, Otsu/adaptive threshold, deskew). `autoEnhance` decides steps and
     **reports exactly which steps were applied** — the UI shows the real list,
     never a guessed one.
   - **ocr** — the (preprocessed) canvas goes to the selected provider's
     `processPage`.
   - **normalize** — `postprocessBangla` for local output normalization;
     `tagIssues` collects advisory orthotactic flags (never auto-rewrite).
3. Results flow back through callbacks (`onRenderedPage`, `onPreprocessedPage`,
   `onStage`, `onPage`) to update the queue item, preview canvas, and progress.
   Tesseract's real `lines`/`words` bboxes overlay the preview; the UI never
   synthesizes regions.

## Providers (`src/ocr/providers/`)

Each implements `OCRProvider` (`src/ocr/types.ts`) and is listed in
`src/ocr/registry.ts`.

| Provider | Type | Notes |
|---|---|---|
| `tesseract` | local | tesseract.js v5, WASM. Worker/core fetched from jsDelivr (pin in code), Bengali traineddata from the app's own `lang/`. Single cached worker, `terminateTesseractWorker()` + `clearTesseractCache()` for cleanup. Reports engine confidence. |
| `gemini` | api | `POST {origin}/v1beta/models/{model}:generateContent`, key via `X-Goog-Api-Key` header. BYOK AI Studio key. |
| `openai` | api | OpenAI-compatible `POST {baseUrl}/chat/completions` with vision messages, `Authorization: Bearer`. Presets for OpenAI/Groq/OpenRouter + custom endpoint. |

- API config (base URL, model) lives in `localStorage` (`ocrb.provider.*`); keys
  live in IndexedDB (`ocrb.provider.*` settings never contain keys).
- `testProviderConnection` (`ocrb.test.ts`) lists `/models` to validate
  key + endpoint + CORS **without OCR** (browser-friendly providers exist; see
  `docs/API_KEYS.md`).

## Trust boundaries (be honest)

- A GitHub Pages site has **no server**: "backend" here means the user's own
  browser. IndexedDB is origin-scoped; anything that runs on this origin could in
  principle read stored keys. Keys are BYOK, user-typed, never logged or shipped,
  with "Forget" controls everywhere.
- tesseract.js loads its worker/core from a CDN by default. Train data is
  self-hosted; worker/core CDN URLs are pinned to a specific version.
- External providers receive document images only when the user picks that model
  and confirms (`confirmExternal`). No results or keys are transmitted elsewhere.

## Deployment

- `vite.config.ts` computes `base`:
  `process.env.GITHUB_ACTIONS ? '/' + (process.env.REPOSITORY_NAME || 'OCRBangla') + '/' : '/'`.
- The deploy workflow (`.github/workflows/deploy.yml`) runs `npm ci`, sets
  `REPOSITORY_NAME=OCRBangla`, builds, then publishes `dist/` with
  `actions/deploy-pages`. Expected URL:
  `https://<user>.github.io/OCRBangla/`.
- HashRouter means no server-side history fallback is needed.
- GitHub Pages cannot send COOP/COEP headers, so **no threaded WASM/SAB** —
  `tesseract.js-core` is used in single-threaded (SIMD) mode. Workers (Tesseract,
  preprocessing, pdf.js) are classic workers, not cross-origin isolated.

## Performance & size

- Primary JS bundle ~292 KB (gzip ~95 KB); pdf.js + worker loaded separately.
- `ben.traineddata.gz` (~1.31 MB) is committed so local OCR is deterministic.
- Preprocessing uses `Uint8ClampedArray` ops with O(n) passes; Otsu/adaptive
  thresholds are single histogram/integral-image passes.

## Testing

See `docs/TESTING.md`. Core logic (metrics, Bangla post-processing, pixel ops,
file detection, ZIP, credential store) has unit tests; `npm test` must pass.
`npm run lint` and `npm run build` must pass before deploy.
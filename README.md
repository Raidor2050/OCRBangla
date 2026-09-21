# Ordinary Chobi Reader (OCRBangla)

A Bangla-first OCR application and research workspace. It runs entirely in the
browser, is deployable to GitHub Pages, and is honest about what it can and
cannot do.

## What it does

| Page | Purpose |
|---|---|
| **Extraction** | Upload images/PDFs, queue them, and run OCR — locally with Tesseract.js (Bengali traineddata), or via the API model you configure. See the detected line regions, view/edit extracted text (raw or normalized), download TXT/JSON per document, or export everything as a ZIP. |
| **Workflow** | Learn how the OCR pipeline works, why Bengali script is hard for machines, and run single-document experiments with CER/WER against your own ground truth, plus a grapheme-level diff and the most-confused substitutions. |
| **Models** | Manage local and external models: Tesseract (in-browser), Google Gemini, and any OpenAI-compatible endpoint (OpenAI, Groq, OpenRouter, custom). Add/forget keys, test connections, and compare two configurations side by side. |
| **Settings** | Theme, default model, processing defaults, and stored-key management. |
| **Privacy** | A plain-language statement of where files, keys, settings, and results go — mirrored in `docs/PRIVACY.md`. |

## Key design decisions (see `docs/ARCHITECTURE.md`)

- **Local OCR is the default.** Bengali Tesseract (`tessdata_best_int`, ~1.31 MB)
  ships with the app and runs in this browser via WebAssembly (TensorFlow-less).
  Documents are never uploaded for local runs.
- **Bring-your-own-key for API models.** Gemini and OpenAI-compatible providers
  use keys the user supplies; keys are stored only in IndexedDB in the user's
  browser, never committed, never sent anywhere except to the provider to OCR a
  document the user explicitly submitted.
- **No fabricated results.** Confidence, line boxes, and preprocessing steps are
  reported exactly as the engine/ops produce them. CER/WER are always labeled as
  comparisons against *user-supplied ground truth*.
- **Conservative Bangla post-processing.** Canonical-equivalent normalization
  (NFC + nukta convention) happens automatically. Suspicious character sequences
  are *tagged* as issues for review — never auto-corrected with a dictionary.
- **Bangla-specific preprocessing** (auto-enhance) runs in a Web Worker:
  grayscale, contrast, denoise, adaptive threshold, scaling, and deskew,
  conservatively tuned for the Bengali script's conjuncts and low-contrast marks.

## Development

```bash
npm install
npm run dev        # local dev server
npm run typecheck  # tsc -b
npm run lint       # eslint (warnings fail)
npm test           # vitest (unit tests for core logic)
npm run build      # typecheck + production build into dist/
```

## Deployment to GitHub Pages

The app uses a HashRouter and a base path derived from the repository name, so
one build serves both a personal subpath (`https://<user>.github.io/OCRBangla/`)
and a project root. See `.github/workflows/deploy.yml` and
`docs/ARCHITECTURE.md#deployment` for the exact build environment variables.

## Documentation

- `docs/ARCHITECTURE.md` — system, data flow, trust boundaries, deployment
- `docs/PRIVACY.md` — the full privacy model
- `docs/API_KEYS.md` — BYOK providers, browser/CORS notes, key lifecycle
- `docs/MODELS.md` — supported models, quality notes, evaluation limits
- `docs/TESTING.md` — how the app is tested and how to run the tests
- `docs/DESIGN_SYSTEM.md` — design tokens and UI conventions
- `docs/research/` — the research that guided the architecture (OCR stack,
  Bangla text analysis, image preprocessing, model workflows, privacy)

## License considerations

The Bengali traineddata is distributed under the Apache License 2.0
(see `public/lang/NOTICE.txt`). The app itself is MIT. Note that the external
API providers are separate services with their own terms.
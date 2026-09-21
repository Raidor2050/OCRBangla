# Models

## What is supported

| Model | Runs | Your documents? | Good for | Limitations |
|---|---|---|---|---|
| Tesseract `ben` (local) | In-browser WebAssembly | Never leave the device | Private/offline OCR; free; real confidence + line/word boxes | Modest accuracy on poor scans; needs preprocessing (auto, by default) |
| Tesseract `ben-hand` (local, experimental) | In-browser WebAssembly | Never leave the device | Handwritten notes — line-by-line re-recognition of the built-in engine | **Research-grade**: see [Handwriting research](research/HANDWRITING_RESEARCH.md); far below print accuracy; always verify |
| Google Gemini (flash/pro) | Google's servers | Sent to Google when you run | Clean printed/typed Bangla; strong layout understanding | No per-character confidence; API key migration risk; paid |
| OpenAI-compatible (GPT-4o-family, Groq, OpenRouter…) | Provider's servers | Sent to provider when you run | Vision models with good document reading | Browser CORS varies by endpoint; paid; no per-character confidence |

## Evaluation limits (read this before trusting numbers)

- **CER/WER are always relative to the ground truth you provide.** They measure
  "how different is this output from this one reference text", not some universal
  model accuracy. The UI says this next to every number.
- Comparison runs in **Models → Experiment** run two configurations on the same
  file so you can judge *for your document type*, which is the only honest bench.
- Bangla digits, conjuncts, and vowel signs make code-point-level metrics
  misleading; this app's metrics operate on **grapheme clusters**
  (`src/evaluation/cerwer.ts`).

## Tesseract model file

- `public/lang/ben.traineddata.gz` (~1.31 MB, Apache-2.0, `tessdata_best_int`).
  Committed in-repo so local OCR never depends on a CDN at recognize-time.
  Source/license: `public/lang/NOTICE.txt`.
- Worker and core are pinned CDN files (tesseract.js v5); `clear cached model
  data` on the Models page drops the cache and re-fetches.

## Configuring external providers

See `docs/API_KEYS.md` for keys, CORS notes, and the Gemini migration warning.

## Defaults

- Default provider = **Tesseract** (private by default).
- `ben` is the only bundled Bangla engine; English via `ben+eng` is out of scope
  for the app's contract (Bengali is supported only).

## Connection testing

`Models → Test connection` lists `/models` to validate key + endpoint + CORS in
one request — **no document is sent and no OCR is performed**.
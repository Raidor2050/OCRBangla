# Document Processing — Research Synthesis

*Team A synthesis: how OCRangla processes real documents, consolidated from the
research workstreams (`OCR_RESEARCH.md`, `IMAGE_PREPROCESSING.md`,
`MODEL_WORKFLOW.md`, `BANGLA_TEXT_ANALYSIS.md`, `PRIVACY_ARCHITECTURE.md`).*

## Scope supported

- **Inputs:** PNG, JPEG, WEBP images and PDF files. Everything else is rejected
  at upload with a clear message (`src/documents/detect.ts`). TIFF/document
  formats are out of scope for v1.
- **Multi-page:** PDFs are rendered page-by-page with pdf.js (worker hosted as a
  Vite chunk), each page capped at ~1600px on the longest side to keep memory
  bounded. Images render to a canvas at a size derived from `targetDpi`.

## Why the pipeline is shaped this way

1. **Preprocessing helps Tesseract more than it helps VLMs.** Research +
  community experience: Bengali Tesseract is sensitive to contrast, size, and
  noise — the classic failure modes are split conjuncts and vowel-sign
  misreads. VLMs (Gemini/GPT-4o-family) mostly want a clean, correctly-oriented
  page and do their own normalization. We therefore preprocess **only when the
  engine is Tesseract**, and report exactly which ops ran.
2. **Preprocessing must be honest and restorable.** The app records the applied
  step list per page (`preprocessApplied`) and shows the *processed* preview, so
  what the engine saw is visible. Nothing is invented.
3. **Render → Enhance → Recognize → Normalize** is the fixed order
  (`PIPELINE_ORDER`). "Layout" is reported as a stage by Tesseract internally and
  surfaced as real line boxes.

## Auto-enhance heuristics (conservative, Bangla-aware)

From `src/ocr/preprocessing/ops.ts` (deterministic, worker-side):

- always starts grayscale;
- upscale small scans to a target min dimension (capped; never upscale beyond 2×);
- contrast boost only when `lumaStd` is low;
- median-3 denoise only on noisy-estimate frames;
- adaptive threshold only on near-flat frames (never text with weak marks);
- deskew via a cheap projection estimate, off by default (tunable).

Rationale: Bengali conjuncts and vowel signs fail asymmetrically — over-darkening
kills the faint `়`-marks; over-thresholding merges glyphs. The defaults are
deliberately mild, and users can compare with/without in **Models → Experiment**.

## Queue & batching

- Documents are processed strictly sequentially (one at a time). Parallel page
  OCR is not attempted; a single Tesseract worker avoids cache thrash, keeps
  memory flat, and makes Cancel predictable.
- Each item owns an `AbortController`; stage/page callbacks drive progress UI.
- Additions are allowed only by the user; there is no server-side queue.

## Evaluation methodology

- Metrics are grapheme-cluster based (not code-point) so conjuncts and vowel
  signs count as single units (`src/evaluation/cerwer.ts`).
- CER/WER numbers are always tied to user-supplied ground truth; the UI labels
  them "vs your ground truth". Bounded CER (`cerN`) is provided where unbounded
  CER misrepresents short references.
- The confusion table (least → most often confused pairs) is the actionable
  output for iterating on preprocessing.

## Performance guidance (validated in IMAGE_PREPROCESSING + MODEL_WORKFLOW)

- Tesseract WASM + SIMD without multi-threading (GitHub Pages cannot send
  COOP/COEP): expect slower-but-correct behavior on large pages; the 1600px cap
  keeps single-page latency sane.
- BLAS-level CPU work is avoided in JS; all pixel ops are single-pass
  `Uint8ClampedArray` loops; thresholds use one histogram/integral pass.
- Loaded once: one Tesseract worker (cached across jobs), one preprocess worker,
  one pdf.js worker. Cache orthogonality: traineddata committed in-repo.

## Privacy implications for processing

- Local OCR: bytes never leave the browser.
- Remote OCR: the preprocessed page image (JPEG ~1568px) is the thing sent to the
  provider — document low-level bytes are not shipped, and no results are stored.
- Keys are never part of processing metadata (`buildDocumentJson` never includes
  credentials).

## Open gaps / follow-ups

- Batch ZIP currently exports engine text (not the edited working copy).
- PDF text-layer passthrough (using the source PDF's embedded text when present)
  is not implemented; Tesseract re-recognizes pages to guarantee consistent
  processing.
- A per-page "processed vs original" side-by-side debug view is a nice-to-have.
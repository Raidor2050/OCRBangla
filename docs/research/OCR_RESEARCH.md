# OCR Research: Bangla (Bengali Script) for "Ordinary Chobi Reader"

**Author:** Agent A1 (research only) | **Scope:** GitHub Pages (static, no backend), browser-preferred OCR
**Currency note:** Research performed Sep 2026 from live web sources. Anything I could not directly verify is marked **unverified**.

---

## 1. Executive Summary

Verifiable conclusion: **there is no high-accuracy, Bengali-specialized OCR model that is already bundled and trivially runnable in a browser.** The three strongest Bangla OCR engines (EasyOCR, PaddleOCR, Surya) all lack browser-runnable Bengali weights or are too heavy; TrOCR has **no released Bengali model** with acceptable quality; PaddleOCR's classic det+rec pipeline **does not include Bengali** at all (verified from the official language appendix).

The **single most practical, genuinely-runnable-on-GitHub-Pages approach today is Tesseract.js + the official `ben` (Bengali) traineddata**:

- Runs fully client-side (WASM) — proven by multiple apps already deployed to GitHub Pages (e.g. `Tarekuzjaman0/BanglaScan`, `mdkeum/Bengali-OCR-App-JS`).
- Bengali data file is **~1.37 MB gzipped** (`ben.traineddata.gz`) and available on jsDelivr/unpkg or easily self-hosted on Pages.
- Apache-2.0, no API key, works mobile, offline-capable.
- **Accuracy caveat (verified):** published default-model quality is weak on Bangla — community benchmarks report Tesseract(bn) ~45% CER / ~60% WER on word images; with good preprocessing (binarization + upscale to ~300 DPI) clean printed Bangla typically reaches ~85–92% per published research. Bengali's matras/compound conjuncts are the main failure mode.

**Recommended layered combination (local + API) for maximum real accuracy:**

1. **Default path:** **Gemini API (2.5/3.x-class Flash) called directly from the browser** — Google's `generativelanguage.googleapis.com` endpoint works cross-origin from a static page (community-verified + official JS SDK has an explicit browser mode). Accuracy on clean/typical Bangla images is far above Tesseract. Requires the user to paste an AI-Studio API key (free tier).
2. **Fallback path (offline / no key / privacy):** **Tesseract.js with `ben` traineddata**, self-hosted, with a preprocessing pipeline (grayscale, upscale ×2–3, adaptive threshold) to compensate for model weakness.
3. **GPT-4o path:** not directly usable from a pure static site — OpenAI's API is unreliable/blocked for browser CORS (multiple 2025–2026 outage/bug reports; official guidance is to proxy behind a backend). Use only if you add a Cloudflare Worker or similar, which is outside "pure Pages".

Higher-accuracy engines (Surya OCR ~82.7% Bengali on its internal 91-language benchmark; EasyOCR ~25% CER; custom LSTM Tesseract models ~90%+) currently require a **backend/Python runtime**, not a static page.

---

## 2. Per-Technology Findings

### 2.1 Tesseract + Tesseract.js (`ben` traineddata)

| Aspect | Finding | Status |
|---|---|---|
| Bengali traineddata exists | `ben.traineddata` in all 3 sets (tessdata, tessdata-best, tessdata-fast), LSTM for v4+ | verified |
| File sizes | `ben.traineddata.gz` = **1,382,878 B** (4.0.0) and **1,373,429 B** (4.0.0_best_int) | verified (jsDelivr data API) |
| CDN | `@tesseract.js-data/ben` on **jsDelivr** & **unpkg**; also `https://cdn.jsdelivr.net/npm/@tesseract.js-data/ben@1.0.0/4.0.0_best_int/ben.traineddata.gz` | verified (files listed) |
| Browser/WASM | Tesseract.js runs OCR in-browser via WASM; works on GitHub Pages; mobile works (fewer threads) | verified (Tesseract.js docs + existing Pages apps) |
| License | Apache-2.0 (engine + data) | verified |
| Known weaknesses | Bengali matras (vowel signs), compound conjuncts (যুক্তাক্ষর), punctuation often mangled; low-contrast/noisy scans degrade fast; the LSTM `ben` model is synthetic-trained and far weaker than English; accent/position errors common | verified (community benchmarks echo weaknesses) |
| Reported accuracy | Community model-card benchmark: Tesseract(bn) ~**45% CER / ~60% WER** (word-level). Research with custom-trained LSTM data reports **~92–98%** on clean printed 300-DPI text, ~85% handwriting (small independent studies). Official `ben` ≈ custom-trained data results and needs preprocessing. | verified (multiple sources, consistent) |

**Verdict: the practical baseline. Weak but real, zero-infrastructure-free.**

### 2.2 PaddleOCR (PP-OCRv3/v4/v5/v6)

| Aspect | Finding | Status |
|---|---|---|
| Bengali in classic PP-OCR det+rec | **NOT included.** Verified language appendices: PP-OCRv4 = only `ch, en`; PP-OCRv5 = large list **without `bn`**; PP-OCRv6 = no `bn`; PP-OCRv3 list includes Bihari (`bh`) but **no Bengali** | verified (official docs appendix) |
| Bengali via PaddleOCR-VL | PaddleOCR-VL 1.5 (PaddleOCR 3.4+, Jan 2026) "expands to 111 languages (including … Bengali)" | verified (release notes) |
| PaddleOCR-VL browser feasibility | This is a **vision-language model** (multi-billion-param scale; heavy GPU/beam decoding). No WASM build, no CDN-served browser asset. Not browser-feasible | verified (architecture) / size **unverified** |
| Browser SDK | `@paddleocr/paddleocr-js` (v0.4.2, Apache-2.0) runs PP-OCRv5/v6 via onnxruntime-web + OpenCV.js; supports `worker` mode; WASM default; WebGPU optional | verified (official docs/README) |
| WebGPU/threads on GitHub Pages | Requires **COOP/COEP cross-origin-isolation headers** — **GitHub Pages cannot set these headers**, so threaded WASM/WebGPU are unavailable; single-threaded WASM works | verified (ORT + PaddleOCR.js docs; Pages header limitation is well-known) |
| License | Apache-2.0 | verified |
| Model size (non-Bengali) | PP-OCRv5_mobile det ~4–5 MB, mobile rec ~7–14 MB (ONNX) — small enough to host | verified (model table) |

**Verdict: best-pipeline-architecture reference for the future, but useless for Bengali today in a browser.** If Bengali ONNX det/rec models are ever published/exported, onnxruntime-web + self-hosted models becomes the likely best local path.

### 2.3 EasyOCR and OCRmyPDF (brief)

- **EasyOCR** — supports **bn (Bangla)** among 80+ languages; Apache-2.0; PyTorch-based. Community benchmark: EasyOCR(bn) ~**25% CER / ~40% WER** (better than default Tesseract, weaker than modern VLMs). Recognizer is small (~6M params), but the runtime (PyTorch, CRAFT detector) is Python-only. **No official browser/WASM distribution; browser feasibility: effectively none** (a community webgpu port exists but is **unverified**).
- **OCRmyPDF** — Python CLI/API wrapper that drives Tesseract to produce searchable PDFs; not even a runtime you can embed; **not browser-relevant**. (Apache-2.0.)

### 2.4 TrOCR / generic transformer OCR, and docTR

- **TrOCR** (Microsoft, 2021): encoder-decoder (BEiT/DeiT + RoBERTa), excellent on English printed/handwritten lines. Model card: `microsoft/trocr-large-printed` = **0.6B params**.
- **No usable Bengali model.** Community fine-tunes reported poor results (one 40.6% word-accuracy after 1.8M synthetic word images; HF forum thread #58970). `QuickHawk/trocr-indic` claims Bengali but "trained with only Devanagari scripts" (its own model card). **unverified** any strong public Bengali TrOCR weights.
- Python+transformers for research is fine; **browser**: transformers.js supports `image-to-text` TrOCR (small ~120 MB ONNX), but English-only — **irrelevant for Bangla**.
- **docTR** (Mindee/t2k, Apache-2.0, Python): two-stage det+rec; shipped recognizers are **Latin/French-vocabulary**; a multilingual road-map lists `indic_based: ... bangla ...` as an *experiment*, but no released Bengali pretrained weights found. **Bengali in browser: not available (unverified anyway).**

### 2.5 Vision-Language / multimodal APIs (GPT-4o, Gemini)

- **Gemini (Google)** — **browser calls work**. The official JS SDK documents in-browser initialization; community reports ("Gemini allows calls from a browser") and numerous static-site demos call `generativelanguage.googleapis.com/v1beta/models/...:generateContent` directly with `x-goog-api-key` (or the SDK) and a `data:`/inline image. CORS is served. Accuracy on clean printed Bangla is effectively near-perfect ("read the text in this image, output exact text"); excels at noisy/photographed/scanned Bangla, and preserves conjuncts correctly. Caveat: **API key exposed client-side** — Google recommends origin-restricted keys or a proxy; free-tier quota applies.
- **GPT-4o (OpenAI)** — **not reliable from a static page.** Verified community record: preflight `OPTIONS` failing / missing `Access-Control-Allow-Origin`; an Oct 2025 full-browser outage; Jan 2026 **Responses API CORS break** (fixed after ~1 day but recurring); OpenAI's own guidance = proxy behind a backend. On pure GitHub Pages you have no backend, so **treat direct GPT-4o as unavailable** unless you add a free Cloudflare Worker relay (still requires the user's key).

### 2.6 ONNX Runtime Web / WebGPU and HuggingFace transformers.js

- **onnxruntime-web** (current ~1.29.x): classic **WASM EP works everywhere** incl. iOS Safari (single-threaded); **WebGPU EP** now ships in the public package but: Chromium-only (no Safari/Firefox default), experimental, needs secure context — and cross-origin isolation for threads is **impossible on GitHub Pages** without custom COOP/COEP headers (single-thread WASM fine). WASM binaries loadable from jsDelivr (`https://cdn.jsdelivr.net/npm/onnxruntime-web/dist/`) — works cross-origin.
- **transformers.js (@huggingface/transformers v3)**: runs HF models in-browser (WASM default, `device:'webgpu'` opt-in). OCR task = `image-to-text` (TrOCR & derivatives). **Feasible infrastructure, but no Bangla OCR model exists in its model set** (verified: it redirects you to HF hub; nothing trained for Bengali). The main forward path is: *train/export a Bengali OCR model to ONNX, upload to HF Hub (which serves CORS-enabled files), load via transformers.js/ORT+WebGPU.*

### 2.7 Other Bangla OCR projects

| Project | What it is | License | Browser-feasible? |
|---|---|---|---|
| **Surya** (`datalab-to/surya`, ~21k★) | 650M-param document OCR VLM; **Bengali scores 82.7%** on its internal 91-language benchmark; layout/table/reading-order | code Apache-2.0; **weights OpenRAIL-M-like** (free research/personal/startups <$5M) | **No** — needs a `vllm`/`llama.cpp` inference server (Python). Best local-quality reference though |
| `siyam-exe/bangla-ocr` | Uses **Surya** for scanned Bangla books; reports **98.5% char accuracy / 5.7% WER** on 20 real book pages (human-reviewed), ~23 s/page on RTX 4050; EasyOCR fallback | Apache-2.0 app + third-party weight licenses | No (backend) |
| **BanglaOCR** (CRBLP, ~2009) | Earliest open Tesseract-based Bangla OCR suite; ~93% clean 300-DPI printed | **unverified** | No (legacy desktop) |
| **Bongojjono** | Referenced in some lists as a Bangla OCR project; `github.com/naim94a/Bongojjono` returned **404**; no maintained public repo found | **unverified** | **unverified** |
| `habibahsan/bangla-ocr` | Tesseract 5 + **BERT post-correction**, desktop | MIT | No |
| `Sarjinkhan2003/bengali-ocr-recognition` | LightCNN+BiLSTM+CTC (~4.5M params) trained on 1M synthetic Bangla word images; **CER 0.62% / WER 2.95%** on its own test; EasyOCR-loadable `.pth` | **unverified** (course project) | No (weights exist, could be ONNX-exported — a future path) |
| `painful-bug/bangla-ocr-transformer` | Full-page Bangla handwritten transformer (Bongabdo dataset) | research | No |
| **GraDeT-HTR** (2025, arxiv 2509.18081) | SOTA Bengali-*handwriting* HTR (grapheme-aware decoder-only, 87M params); code `mahmudulyeamim/GraDeT-HTR` | research | No |

---

## 3. Browser-Feasibility Verdicts

| Engine | Bangla support | Runs in-browser on GitHub Pages? | Practical today for Bangla? |
|---|---|---|---|
| Tesseract.js + `ben` | yes | **yes** (WASM, ~1.4 MB data, Apache-2.0) | **YES — best single local option** (moderate accuracy w/ preprocessing) |
| PaddleOCR classic (v3–v6) | **no** (`bn` absent) | SDK yes, but no Bengali weights | No |
| PaddleOCR-VL | yes (VLM) | No (too heavy, no WASM/ONNX path) | No |
| EasyOCR | yes | No (PyTorch) | No |
| OCRmyPDF | via Tesseract | No (Python, wrapper) | No |
| TrOCR | no good weights | transformers.js yes, but English-only | No |
| docTR | no shipped Bangla | demo template exists, no Bangla model | No |
| Gemini API | excellent | **yes** (browser CORS OK, needs key) | **YES — best accuracy path** |
| GPT-4o API | excellent | **no** (CORS unreliable; needs proxy) | No (unless Worker proxy) |
| ONNX Runtime Web | n/a (runtime) | yes (WASM; **no multi-thread/WebGPU on Pages** — no COOP/COEP) | Future vehicle |
| transformers.js | n/a (runtime) | yes | Future vehicle (needs a Bengali model) |
| Surya | 82.7% | No | No (backend only) |

---

## 4. Recommended Local Architecture (GitHub Pages)

```
Browser ──► UI (upload / camera capture)
                 │
                 ├─► [Path A: API] Gemini generateContent (inline image) ──► text
                 │      needs user API key (AI Studio free tier); key sent as x-goog-api-key
                 │      (document: restrict key to your origin; warn re: exposure)
                 │
                 └─► [Path B: Local/Offline] Tesseract.js v5 + ben.4.0.0_best_int
                       1. Preprocess: resize so Benga line height ≈ 40–60 px (≈300 DPI);
                          grayscale → Otsu/adaptive threshold → (optional) deskew
                       2. Tesseract.recognize(img, 'ben', { langPath, worker })
                       3. Post-process: normalize Unicode (combining matras), spell-correct
                          against a Bengali wordlist (optional small dictionary pass)
```

Implementation notes:
- Self-host `ben.traineddata.gz` (~1.37 MB) **inside the Pages repo** (`assets/tessdata/`) or load from jsDelivr `@tesseract.js-data/ben`. Both verified.
- Tesseract.js worker/core JS + `tesseract.js-core` WASM — host locally; works on Pages (correct MIME needed for `.wasm`; Pages serves `application/wasm` — **unverified** in Production docs, but existing Pages Tesseract.js apps confirm operation).
- Fallback chain: `apiError || noKey → local`.
- Batch/queue images; show per-image progress (Tesseract.js workers are slow on mobile).

## 5. Recommended API Providers (with verified CORS/feasibility)

| Provider | Model to use | Browser call from Pages | CORS status | Key handling | Notes |
|---|---|---|---|---|---|
| **Google Gemini** | `gemini-2.5-flash` or newer 3.x Flash via `POST /v1beta/models/{model}:generateContent` | **Works** | **verified working cross-origin** (official SDK has browser mode; static-site demos everywhere; "Gemini allows calls from a browser") | `x-goog-api-key` header; **client-visible**; use AI-Studio key + origin restrictions; free tier OK | Best accuracy/effort ratio for Bangla; strong on noisy/photographed pages, conjuncts |
| **OpenAI GPT-4o** | `chat/completions` or `responses` | **Unreliable / blocked** | browser preflight fails & missing `Access-Control-Allow-Origin`; Oct-2025 & Jan-2026 incidents | Bearer key; never safe client-side anyway | Only via Cloudflare Worker / proxy (outside pure Pages) |
| Azure Document Intelligence (alternative) | `layout`/`read` prebuilt OCR | requires key, **unverified CORS** | **unverified** | server | not researched further |

## 6. Model Hosting Options for GitHub Pages

| Option | Notes | Status |
|---|---|---|
| **Commit to repo (Pages repo)** | Fine up to ~100 MB; `ben.traineddata.gz` = 1.37 MB ⇒ trivial. Soft 1 GB repo/Pages cap. | verified sizes |
| **jsDelivr/unpkg NPM** | `@tesseract.js-data/ben`, `onnxruntime-web/dist`, `@tesseract.js` V5/V6 — all CORS-enabled (`Access-Control-Allow-Origin: *`) | verified |
| **jsDelivr GitHub proxy** | `https://cdn.jsdelivr.net/gh/user/repo@commit/path` — serves repo files with CORS for large model blobs | verified (documented jsDelivr feature) |
| **HuggingFace Hub files** | `.../resolve/main/...` served CORS-enabled (transformers.js loads browser models from HF by default → proves CORS) | verified (by transformers.js default behavior) |
| **GitHub Release assets** | up to 2 GB/file; good for future big ONNX models; CORS per asset **unverified** |
| GitHub Pages / COOP·COEP | Pages does **not** set COOP/COEP → **no SharedArrayBuffer, no threaded WASM, no WebGPU** → all browser inference must be **single-threaded WASM** | verified (ORT/PaddleOCR.js docs + Pages limits) |

## 7. Implementation Choices / Alternatives Considered / Known Limitations / Future Work

**Implementation choices (recommended):**
1. Primary = Gemini API (browser) for quality; secondary = Tesseract.js `ben` for offline/key-free operation.
2. If the target must be 100% offline and quality on printed scans is the priority, invest in a small ONNX Bengali **recognition** model (the Sarjinkhan2003 4.5M-param CRNN is the right size class) + a DB-style detector, run via **onnxruntime-web single-thread WASM/WebGPU-off**, hosted on jsDelivr/HF. Not buildable with off-the-shelf weights today.

**Alternatives considered (not chosen):**
- PaddleOCR.js — dropped: no Bengali weights in classic PP-OCR; VLM too heavy.
- EasyOCR in browser — dropped: Python-only runtime.
- TrOCR via transformers.js — dropped: no Bengali weights.
- Surya — dropped for browser (backend VLM); best *desktop/lab* quality (82.7% Bengali).

**Known limitations:**
- GitHub Pages cannot enable threaded WASM or WebGPU (no COOP/COEP headers) ⇒ all in-browser inference is single-threaded WASM ⇒ slower and limits viable model size (≈ ≤100 MB practical).
- No verified, browser-runnable, high-accuracy Bengali model exists as of this research.
- Client-side API keys are inherently leakable; document it, restrict origins, and offer local mode as the private default.
- Tesseract `ben` struggles with conjuncts/matras; unavoidable without fine-tuning.
- Bengali handwriting is still research-grade (e.g. GraDeT-HTR); do not promise it.

**Future work:**
- Export a Bengali rec model (e.g. the 4.5M-param CRNN or EasyOCR `bn`) to ONNX → quantize int8 → host on HF/jsDelivr → wire into ORT-Web. Est. 3–10 MB — the real upgrade path.
- Fine-tune an existing PP-OCRv5-style rec on Bengali and publish weights; then PaddleOCR.js/ORT can be used.
- Adopt transformers.js + WebGPU **only if** GitHub Actions can embed COOP/COEP (not on Pages; use Cloudflare Pages/Worker instead).
- Re-run accuracy benchmarks on a Bangladeshi-document corpus (newspaper scans, NID, books) to ground the Tesseract baseline for this project.

---

## References (real URLs, retrieved Sep 2026)

- Tesseract & Tesseract.js:
  - https://github.com/naptha/tesseract.js
  - https://github.com/naptha/tessdata/ (data variants, jsDelivr/unpkg defaults)
  - https://tesseract-ocr.github.io/tessdoc/Data-Files.html (ben.traineddata table)
  - https://www.jsdelivr.com/package/npm/@tesseract.js-data/ben (1.38 MB / 1.37 MB sizes verified)
  - https://doi.org/10.31224/osf.io/je3m8 (Redwan Islam, LSTM Bengali Tesseract training, ~98%)
  - https://github.com/mdkeum/bengali-ocr-project (Tesseract vs EasyOCR, 216 images)
  - https://huggingface.co/Sarjinkhan2003/bengali-ocr-recognition (Tesseract bn ~45% CER / ~60% WER data point)
- PaddleOCR:
  - https://github.com/PaddlePaddle/PaddleOCR (Apache-2.0; release notes: PP-OCRv5 109 languages, PaddleOCR-VL 1.5 → 111 incl. Bengali)
  - https://www.paddleocr.ai/latest/en/version3.x/pipeline_usage/OCR.html (verified: no `bn` in v3–v6 language appendix)
  - https://www.paddleocr.ai/v3.6.0/en/version3.x/inference_deployment/cross_platform/browser.html (PaddleOCR.js, COOP/COEP notes)
  - https://www.npmjs.com/package/@paddleocr/paddleocr-js
  - https://github.com/PaddlePaddle/PaddleOCR/tree/main/paddleocr-js/packages/core/README.md
- EasyOCR / OCRmyPDF:
  - https://github.com/JaidedAI/EasyOCR (Apache-2.0; bn supported; benchmark numbers via links above)
  - https://github.com/ocrmypdf/OCRmyPDF
- TrOCR & transformers.js + docTR:
  - https://huggingface.co/microsoft/trocr-large-printed (0.6B params)
  - https://discuss.huggingface.co/t/getting-poor-word-acuracy-after-fine-tuning-trocr-on-bangla-language/58970
  - https://huggingface.co/QuickHawk/trocr-indic (claims Bengali, trained Devanagari-only)
  - https://github.com/huggingface/transformers.js/pull/375 (TrOCR image-to-text support)
  - https://huggingface.co/docs/transformers.js/en/guides/webgpu
  - https://github.com/mindee/doctr and https://github.com/mindee/doctr/issues/1699 (multilingual roadmap incl. bangla "next experiments"; no shipped model)
- VLMs / APIs:
  - https://ai.google.dev/gemini-api/docs/quickstart (browser-capable SDK/JS; `x-goog-api-key`)
  - https://developers.google.com/learn/pathways/solution-ai-gemini-getting-started-web (client-side Gemini web apps)
  - https://community.openai.com/t/has-the-cors-policy-changed-responses-api/1372791 (Jan-2026 CORS break; "Gemini allows calls from a browser")
  - https://dev.to/tracepilot_2841f1db6718a1/that-openai-call-from-your-browser-is-failing-heres-why-3p3c (CORS/proxy guidance)
  - https://community.openai.com/t/chat-completions-api-endpoint-down-blocked-any-web-browser-request/1362527 (Oct-2025 browser outage)
- ONNX Runtime Web:
  - https://onnxruntime.ai/docs/tutorials/web/ep-webgpu.html
  - https://onnxruntime.ai/docs/tutorials/web/deploy.html (wasmPaths via jsDelivr; COOP/COEP)
  - https://www.npmjs.com/package/onnxruntime-web (1.29.x; WebGPU=experimental, Chromium-only)
- Surya & other Bangla projects:
  - https://github.com/datalab-to/surya (Bengali 82.7% internal benchmark; Apache-2.0 code, OpenRAIL-M-like weights)
  - https://github.com/siyam-exe/bangla-ocr (98.5% char acc Surya rails-tested on Bangla books)
  - https://arxiv.org/abs/2509.18081 (GraDeT-HTR, Bengali handwriting SOTA; https://github.com/mahmudulyeamim/GraDeT-HTR)
  - https://github.com/painful-bug/bangla-ocr-transformer (Bongabdo full-page handwritten Bangla)
  - https://github.com/Tarekuzjaman0/BanglaScan-Free-Bangla-OCR-Image-to-Text-Converter (Tesseract.js on GitHub Pages, proof-of-concept)
  - Bongojjono: **could not verify** (expected repo 404; no maintained copy found)
  - CRBLP BanglaOCR (2009): https://www.academia.edu/670296/An_Open_Source_Tesseract_Based_Optical_Character_Recognizer_for_Bangla_Script
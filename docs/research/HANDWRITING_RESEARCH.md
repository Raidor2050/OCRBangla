# Bangla OCR research: handwriting + print (synthesis)

Date: 2026-09-21 · Method: five parallel research agents, cross-checked.

Question: which *local* OCR should Ordinary Chobi Reader use for Bangla **handwriting**
and Bangla **print**, given the app runs 100% in-browser on GitHub Pages (no COOP/COEP
→ WebAssembly threads unavailable; site ≤1 GB; single git file ≤100 MiB).

## Locked-in environment facts

- GitHub Pages cannot set COOP/COEP headers
  (https://github.com/orgs/community/discussions/13309) → no
  `SharedArrayBuffer`/wasm threads; onnxruntime-web and tesseract.js run
  single-threaded. SIMD works without threads. WebGPU does not require
  cross-origin isolation.
- GitHub Pages limits: repo/site ≤1 GB, soft 100 GB/month bandwidth, files
  >100 MiB blocked in git. (https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits)
- huggingface.co `resolve` endpoints return `Access-Control-Allow-Origin: *`
  (verified on an 88 MB ONNX file) ⇒ runtime model fetch from HF is CORS-viable.

## Findings

### 1. Bangla PRINT OCR in-browser

- Tesseract `tessdata_best` (float) beats the integerized best only marginally;
  integerized `4.0.0_best_int ben.traineddata` is *the canonical tesseract.js
  default* and the best stable choice for print. Apache-2.0/MIT. (tessdoc; naptha/tesseract.js)
- PaddleOCR.js: the PP-OCR v4/v5/v6 multilingual families do **not include
  Bengali** — dead end.
- EasyOCR Bengali CRNN (`bengali_g2`, Apache-2.0): ~2–4 pt better CER than
  Tesseract on Bangla doc benchmarks (BRACU: Tesseract CER 11.46/WER 20.01 vs
  EasyOCR CER 9.02/WER 21.94), dramatically better in-the-wild (BanglaWild
  exact-match 4.69% vs 0.16%). But: no official ONNX build for Bengali; needs
  per-word/line detection; browser conversion+integration is heavy.
- Verdict: **keep Tesseract best_int for print** (already shipped); revisit
  EasyOCR CRNN if we gain an in-browser CRAFT line/word detector + self-exported
  `bengali_g2` ONNX (both Apache-2.0).

### 2. Bangla HANDWRITING in-browser

- **No legally shippable, browser-ready Bangla handwriting model exists today.**
  Candidates on HuggingFace are either unlicensed (no `license:` field → not
  redistributable), missing tokenizers/processors, PyTorch-only, or multi-GB
  (Llama-3.2-Vision LoRAs).
- The known Bangla TrOCR fine-tunes are unlicensed 700 MB+ `pytorch_model.bin`
  dumps with no ONNX (e.g. `Saitomar/TrOCR-Vit-Roberta-bn`).
- transformers.js has **no TrOCRProcessor** (AutoProcessor falls back to
  ViTFeatureExtractor; tokenizer must be loaded separately) and int8 encoder
  quantization is broken for patch-embedding Conv layers — a browser-ready
  model must bundle config/tokenizer/preprocessor/ONNX and use uint8/q4 encoders.
- Realistic size of a base-size Bangla TrOCR at q8: **~300 MB+** → cannot be
  committed, must be runtime-fetched, single-thread wasm is slow, ~330
  full-model users/month consume the free bandwidth.
- Accuracy reality (published):
  - Best published (GraDeT-HTR, EMNLP 2025): word-level CER 6.19%, line-level
    CER 26.17% (BN-HTRd); line-level 46.91% on the harder Bongabdo.
  - BanGaNet (1.32M params): CER 12.37%/WER 34.16% on BanglaWriting.
  - TrOCR on handwritten prescriptions: CER ~16%, improved to 7% with
    Levenshtein post-correction.
  - Overlapping/joined glyphs: 92%→83% char accuracy (39%→63% WER).
  - Cross-dataset generalization is poor; public weights are often academic-only.
  - Takeaway sentence used in the UI: *Bangla handwriting recognition is
    research-grade: ~94% character accuracy on clean single words, ~70–74% on
    full handwritten lines, far lower on photos/unusual handwriting.*

### 3. Decision implemented (ben-hand)

The best *fully-local, legal, browser-runnable* handwriting path is a line-level
re-recognition mode on the bundled engine:

1. Whole-page recognition (as today) gives real line bounding boxes.
2. Each engine line is cropped (padded, clamped) and re-recognized with
   single-line PSM.
3. Page text is rebuilt from the refined lines; average of engine line
   confidences becomes the page confidence. Nothing is synthesized — boxes and
   confidences remain engine-real; refined lines drop their old word splits
   rather than relabel fabricated text.
4. Meta flags `mode: 'handwriting'` and `refinedLines` so consumers can tell the
   experimental path apart.

UI shows a sourced disclaimer next to the `ben-hand` selector and marks the mode
as experimental. This is presented as the best *achievable today*, with print
quality expected when the line segmentation is clean.

## Honest claims policy

- No fabricated confidence, boxes, or accuracy numbers anywhere (project rule).
- UI disclaimers cite the research-grade range (sources above) instead of an
  invented single number.
- The handwriting mode notes it is not a substitute for review.

## Future upgrade path (not shipped)

Ship a line/word detector (CRAFT, Apache-2.0) + self-exported `bengali_g2`
recognition ONNX (Apache-2.0) through onnxruntime-web for a real print/handwriting
quality jump, or fine-tune `trocr-base-handwritten` on BN-HTRd
(CC-BY-4.0) — but only when a permissively licensed, tokenizer-complete,
quantized-ONNX Bangla checkpoint exists for runtime fetch.
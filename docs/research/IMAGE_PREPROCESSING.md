# Image & Document Preprocessing for Bangla OCR

**Status:** Research (no application code) · **Context:** *Ordinary Chobi Reader*, a Bangla-first, browser-only OCR app · **Scope:** Which preprocessing raises OCR accuracy for Bengali script, what can run realistically client-side, and a conservative default pipeline.

---

## 1. Why Bangla is different

Bangladeshi/Bengali script (an abugida) is unusually sensitive to image preprocessing because of dense, *thin*, and position-sensitive structures:

- **Vowel signs (matras/diacritics) sit around the consonant.** `ি` (I) and `ী` (II) stand *to the left* of the base glyph; `ু`/`ূ` sit *below*, `ে`/`ৈ`/`ো`/`ৌ` are *two-part* signs written on both sides; `ৃ`/`ৄ` below; `ং`, `ঃ`, `ঁ` above the headline. See Unicode chart U+0980 for the dependency positions (Unicode, 2025).
- **`্` (virama/hasanta) and vowel-length marks** add sub-pixel details.
- **Conjunct letters (যুক্তবর্ণ/juktoborno)** can be very complex glyphs; hand-writers make them hard even for humans (arXiv:2010.00170).
- **Matra / headline (শিরোরেখা)** — the connecting horizontal line across a word — is a script-wide feature used by segmentation, and it is one thin horizontal pixel-run that aggressive morphology easily erodes.
- The Kaggle *Bengali Grapheme* dataset (arXiv:2010.00170) formalizes the grapheme = root + vowel diacritic + consonant diacritic decomposition; OCR errors concentrate in matra/vowel-diacritic misreads exactly when strokes are damaged by blur, under- or over-thresholding, or morphological cleanup.
- Deep OCR work on degraded Bangla documents explicitly calls preprocessing-induced damage a barrier (ACM:3511807; the WACV 2024 Bengali-OCR paper covers computer-composed, letterpress, typewriter and handwritten regimes and adds perspective correction — arXiv:2402.05158).

**Consequence:** downstream caution about any operation that erodes thin strokes (denoising, morphology, aggressive thresholding) and a hard requirement to preserve the 1–3 px vertical marks that binarization can fragment or a "speck removal" can delete.

---

## 2. Technique-by-technique analysis

### 2.1 Resolution / DPI scaling
- **What matters is text pixel height, not metadata.** Tesseract "works best at ≥300 DPI"; accuracy "drops off below 10pt×300dpi, rapidly below 8pt×300dpi" and there is also *an upper band* (~x-height toward 30 px) where LSTM becomes less accurate (tessdoc ImproveQuality; StackOverflow 64547823). Rule of thumb: **aim for a text-line height ≈ 30–50 px; hard upscale only up to ~60–80 px.**
- IBM best practices: 200–300 DPI typical optimum; **400–500 DPI "for small fonts or languages with intricate characters"** — i.e. Bangla's positioned matras justify the high end. Resolution is the single cheapest big win (10× resize revived garbage OCR in SO 36716840).
- **Order matters for Bangla:** upscale **grayscale before** binarization. Binarizing small then upscaling produces blocky aliases and breaks thin marks into ragged 1-px staircases; binarizing after smooth enlargement keeps stroke topology. For raster text, use area-friendly interpolation (bilinear/bicubic/Lanczos) rather than nearest-neighbor.

### 2.2 Grayscale conversion
- Luminance-weighted conversion (ITU-R BT.601/709 `0.299R+0.587G+0.114B`, or luma from `YCbCr`/`Lab L`) preserves ink/paper contrast far better than naive channel average (arXiv:1509.03456 uses an optimized grayscale step before sharpening and binarization).
- Needed first whenever the source is color; virtually all subsequent stages assume single-channel input.
- Do not threshold *before* grayscale; color-driven thresholds are unstable under scanner color cast.

### 2.3 Denoising — bilateral, non-local means, median
- **Non-local means (NLM):** best edge/texture retention of the three (skimage docs; sparis/bf_course slides), but substantially slower and there are "fast" variants.
- **Bilateral:** edge-preserving, but explicitly *"crosses and blurs thin edges"* and can blunt 1–2 px strokes (CMU 15-463 lecture 8; Hacettepe course slides) — dangerous for Bangla `ি`/`ী` left-post marks and matra line unless σ-range is chosen carefully.
- **Median:** excellent for salt-and-pepper/impulse noise (photocopy specks, scans), preserves edges better than Gaussian, but rounds thin-corner glyphs and can join or fragment fine strokes at high kernel sizes.
- **Empirical caution:** on historical documents (old newspapers/microfiche), "little or no denoising performs best" with Otsu-class methods leading (Pattern Recognition 2006, Gatos/Likforman/Nourbakhsh/Paul). Tesseract too notes denoising is only needed for noise that its internal binarization can't absorb (tessdoc ImproveQuality). For Bangla, treat denoise as *conditional* and conservative.

### 2.4 Deblurring — Wiener / unsharp mask
- **Unsharp masking (blur-subtraction) is cheap, standard in OCR stacks**, and used in the arXiv:1509.03456 pipeline. Kernel ~3–5 px on upscaled grayscale; amount modest so the ink doesn't gain halos that merge adjacent matras.
- Wiener deconvolution is stronger but needs a PSF estimate; on thin text it can ring; rarely needed for clean scans. Mostly relevant to out-of-focus mobile photos. Browser cost (FFT) argues for skipping by default and using unsharp only when blur is detected.

### 2.5 CLAHE contrast enhancement
- CLAHE (contrast-limited adaptive histogram equalization) is the workhorse for low-contrast/illuminated pages and is widely paired with binarization (arXiv:1509.03456; degraded-historical-docs binarization arXiv:1901.09425).
- Parameters (OpenCV `cv::CLAHE`): clipLimit + tilesGridSize. NVIDIA DALI guidance: **clip limit ~1.5–4.0 (higher = stronger), tiles 4–16; too high over-enhances noise** into pseudo-speckle at ±text level — which is exactly what fragments Bangla marks (NVIDIA DALI CLAHE docs; ImageMagick CLAHE docs suggest clip-limit 2–3).
- **Recommendation for Bangla default: clipLimit ≈ 2.0, 8×8 tiles**, applied to grayscale **after** upscaling (or even after a light denoise). Use it *conditionally* on measured low contrast, not unconditionally (see §7 learnopencv "select by evidence").

### 2.6 Adaptive thresholding & binarization — Otsu, Sauvola, Niblack, Bradley
- **Global Otsu:** bimodal, fast, default inside Tesseract; degrades under uneven lighting/background.
- **Local/adaptive (Sauvola, Niblack, Bernsen, Wolf, NICK, Bradley-Roth):** one threshold per pixel from local mean±std in a window; needed for uneven illumination and mobile photos. Sauvola (k≈0.2, R=128) suppresses low-contrast background better than Niblack; Niblack amplifies background noise; Sauvola is the usual default for documents. Window size should scale with stroke/text size (fixed windows fail on mixed font sizes; improved versions derive window from stroke width — Kaur & Kaur, Eng. Appl. of AI 2020 10.1016/j.engappai.2020.103672).
- **Cost:** local methods are O(N·w²) naïvely but O(N) with **integral/summed-area images** for mean+std (arXiv:1201.5227) — the key to client-side feasibility (also Bradley-Roth's integral-image method).
- **Tesseract 5 built-ins:** Leptonica *Adaptive Otsu* and *Sauvola* configurable via `thresholding_*` params; smoothing improved noise but "destroys small characters" (issue #3707).
- For Bangla: if background is uniform, **prefer Otsu (or let Tesseract binarize internally)**; switch to Sauvola/Bradley only for uneven-illumination sources. Post-binarization denoising/despeckling helps on historical scans (Springer 2021 survey) but **only by removing *isolated* components — never by morphological opening that eats the matra line**.

### 2.7 Illumination correction / background removal
- Shading/background estimation (large-kernel Gaussian/median blur or morphological close of ~1/4 page, then subtract or divide) flattens lighting for global thresholding. This is effectively what CLAHE and local thresholding replace.
- For Bangla low-contrast scans: a mild **background-flatten (divide by a very large blurred copy)** before Otsu is a robust, cheap, browser-friendly alternative to Sauvola when text is dense.

### 2.8 Deskewing — Hough, projection profiles, DECT/Fourier
- Categories (survey, ICIEE 2016; arXiv:2603.05942): projection-profile analysis, Hough transforms, nearest-neighbor clustering, Fourier domain. Review: NN fastest; projection profile + Hough most accurate on plain text; Fourier-based robust to document type but slower/hervier noise. *Bangla behaves like other print in this respect* — PP and Hough both work; Bangla's *matra* is a strong horizontal cue, which helps Hough/projection but can fool methods tuned for Latin spacing → validate on Bangla samples.
- **Projection-profile (Radon-style):** rotate candidate binary thumbnail by θ̂ that maximizes row-profile variance; simple, robust for text; "costly high angular resolution search" (IJDAR 2010 review) — mitigate by coarse-to-fine and thumbnail resizing.
- **Hough:** detects text-line angle; fast Hough variants give huge speedups (45 µs vs 21 ms for DRT on a DISEC image, arXiv:1912.02504). Probabilistic Hough on Canny edges is a standard recipe.
- **DECT-type tools** (derotation used in book-preservation processing) are bespoke; their algorithmic family is Fourier/entropy-based angle search and matches the *jdeskew* library (skew from Fourier magnitude radial projection, arXiv:2603.05942), which is pure-JS and browser-embeddable — the most attractive option for client-side. **Validate whichever method on skewed Bangla pages** before trusting sub-0.5° accuracy claims made on Latin.
- Conservative rule from production pipelines: **skip correction beyond ~±20°** (it's usually noise latching, not real skew) (doc-layout-ocr-pipeline repo).

### 2.9 Perspective correction — corner detection + homography
- Needed for camera/mobile photos of pages (keystone). Detect page quad (edge/contour of largest quadrilateral), map to rectangle via homography. Essential for mobile workflow; ignore for flatbed scans. The WACV 2024 Bangla OCR paper lists perspective correction as a component (arXiv:2402.05158).
- Homography warp in-browser = canvas `setTransform` with projective matrix or manual bilinear warp on typed arrays; legal but O(N) — see §3.

### 2.10 Rotation detection / orientation
- 0/90/180/270 via layout cues (projection profile asymmetry, ascender/descender ratios — IJDAR 2010 survey). Tesseract OSD (PSM 0) does orientation + detection; tesseract.js supports it. Bangla has no strong ascender/descender contrast like Latin, and the *matra* provides the horizontal cue; rely on OSD + interpolation consistency; 180° vs 0° confusion must be resolved by a dictionary or Bangla-relevant heuristics.

### 2.11 Margin/crop detection & border removal
- Detect content bounding box by scanning for rows/columns whose dark-pixel density (or gradient) crosses a threshold, or by largest connected component of the page silhouette after a coarse threshold. Removes black scan gutters, white borders, and library edge-photography. Prevents the OCR engine from trying to "read" borders and improves layout segmentation. Cheap and safe on Bangla pages (matra density is high; don't confuse dense text columns with borders).

### 2.12 Layout segmentation — Mask R-CNN / detection transformers vs classical projections
- **Classical:** horizontal/vertical projection profiles + connected components + morphological box-closing. Reliable for books/newspapers with column structure; no model download; fast; but fails on mixed/arbitrary layouts.
- **Neural:** Mask R-CNN, DBNet, detection transformers (PaddleOCR/PubLayNet-style) are far more robust across arbitrary layouts; the WACV/Bengali line of work and BN-DRISHTI show *YOLOv5-based line/word* segmentation for Bangla handwriting (arXiv:2402.05158; arXiv:2206.08977 + github.com/crusnic-corp/BN-DRISHTI).
- For a browser Bangla app: **start classical** (columns via vertical-gap analysis with inverted-handling bugs checked, per srinivas-gampasani repo), **upgrade to a small ONNX/WASM layout or line/word detector only if documents are complex** — the model-cost/perf constraint is real (see §3, OpenCV.js DNN ×50–60).

---

## 3. Browser feasibility & implementation notes

**Workable targets:** flatbed scans, book photos, newspaper scans, forms, screenshots — all feasible client-side. Handwritten (variable stroke width) and severely degraded old documents are the hardest; they push the spec of the denoise/deskew stages.

### 3.1 Data model & memory
- `ImageData` = `Uint8ClampedArray` RGBA. A 3000×2000 photo ≈ **24 MB**; grayscale copy = 6 MB; keep to a handful of buffers.
- Use `createImageBitmap` and `OffscreenCanvas` to keep pixel work off the main thread and transferable (`postMessage(bitmap, [bitmap])`) for zero-copy.

### 3.2 What's fast on CPU (typed arrays)
- Grayscale: O(N) vectorizable loop — trivial.
- Otsu: histogram O(N) — trivial.
- **Bradley-Roth / Sauvola / Niblack with summed-area tables:** O(N) per pass, very feasible for an A4 300-DPI page in a worker (arXiv:1201.5227 integral images).
- Projection-profile deskew on a **binary thumbnail** (e.g. max dimension ~700 px) with coarse-to-fine angle search: fast.
- CLAHE: histogram + LUT per tile with bilinear blend — moderately cheap; about 8×8 tiles OK.
- Median 3×3: OK; 5×5 heavier. Bilateral/NLM: **slow in pure JS**; consider WASM/WebGPU or skip.
- Speck/CC cleanup: run a connected-components pass on foreground pixels — feasible; **only delete isolated tiny components**.

### 3.3 Canvas-assisted ops
- Resize/rotate/interpolate: use `canvas.drawImage` (GPU-accelerated in most browsers) with `imageSmoothingQuality='high'` (bicubic) for the upscale-before-binarize step; implement rotation via second canvas with `translate+rotate`.
- `ctx.filter` gives blur/contrast/grayscale presets (Chrome) and is partially hardware-accelerated — a cheap trick, but inconsistent cross-browser; treat as optional sugar, not core.
- Homography warp: skip-sampled bilinear warp on a worker or WebGL/WebGPU texture pass.

### 3.4 WebAssembly / SIMD / threads
- **OpenCV.js (WASM)** runs near-native for basic kernels (opencv.org demo; UNLP benchmarking on desktop+mobile), with `--simd --threads` giving large gains (opencv #23516). Barrier: **threads require SharedArrayBuffer → Cross-Origin-Isolated** (COOP/COEP headers); without it, single-thread WASM still beats JS loops for kernels like NLM/bilateral. Caveat: OpenCV.js *DNN* (convolution) is ~50–60× slower than native — don't plan heavy layout NNs client-side yet.
- **tesseract.js** already runs the whole Tesseract/LSTM engine in a Web Worker over WASM(+SIMD), and does its own Leptonica preprocessing; **it can be configured with `thresholding_method`/PSM and fed a preprocessed gray or binary image** (tesseract.js docs: upscale before recognize is explicitly recommended; performance.md: worker pooling, fast traineddata options).
- Pure-JS alternatives: `jdeskew` (Fourier/radial deskew), integral-image thresholding (small custom worker), JBIG2/cleaners from the ecosystem.

### 3.5 Realistic budget (rough, desktop class)
- Otsu/Bradley/grayscale + CC speck removal on 3000×2000 in a worker: sub-second to ~1.5 s.
- CLAHE: <1 s. Deskew search on thumbnail: <1 s. Bilateral 5×5 or NLM full-page in pure JS: seconds-to-tens-of-seconds → **mark optional/off by default**, or WASM/WebGPU.
- Tesseract LSTM recognition dominates overall time (tesseract.js worker guidance) — preprocessing must not blow the whole budget.

---

## 4. Recommended ordered pipeline (conservative defaults)

Design rules dictated by Bangla:
1. **Upscale grayscale before binarization** (never binary-first scaling).
2. **Avoid aggressive morphology** (erosion/dilation/opening/closing) that destroys thin vowel marks and the matra; prefer CC-based speck removal if any.
3. **Denoise only when there is noise**, weakly; deny if uncertain.
4. **Let Tesseract binarize internally when the page is clean**; external binarization only when its internal pass clearly fails.

```
[1] Normalize EXIF orientation            (image-orientation; manual rotate for 90/180/270)
[2] Border/margin crop                     (content-bbox from threshold+projection; remove gutters & edges)
[3] Grayscale (BT.601/709 luma)            (single channel; denoise-friendly)
[4] IF camera photo:                       perspective correction (quad + homography), else skip
[5] Deskew (projection-profile or jdeskew/    
    Fourier on THUMBNAIL; |skew|>20° → skip)    rotate high-quality bicubic on full-res gray
[6] Conditionally: light denoise 3×3 median/  
    mild bilateral (only if noise measured;      NEVER aggressive on upscaled fine marks)
[7] Resolution normalize:                   upscale gray so text height ≈ 30–50 px (≥300 DPI equiv);
    Lanczos/bicubic via canvas; cap ~80 px to stay in LSTM sweet spot
[8] IF low contrast:                       CLAHE (clipLimit≈2.0, 8×8) on gray
[9] Binarize:
      clean & uniform bg → Otsu (or feed gray to Tesseract, let it threshold)
      uneven illumination/photos → Sauvola (window≈1/8 text-height, k≈0.2, R≈128) 
        or Bradley-Roth fast; THRESHOLD ON THE UPSCALED GRAY
[10] Post: remove isolated specks only      (CC area filter; no morphology)
[11] OCR with tesseract.js                  (Bengali `ben` traineddata; PSM 3 default,
    PSM 6 for single column; OSD/PSM 0 to confirm rotation if unsure)
```

**Why not sharpen/erode by default:** unsharp is safe *if subtle* on upscaled gray, but it can halo adjacent strokes; erosion is disallowed by default for Bangla.

---

## 5. Recommended parameter defaults (Bangla-first)

| Stage | Default | Notes |
|---|---|---|
| Target text-line height | **30–50 px** (cap 80 px) | ≥300 DPI equivalent; LSTM band |
| Grayscale | BT.601 luma `0.299/0.587/0.114` | |
| Denoise | 3×3 median (conditional) | NLM/bilateral only via WASM/WebGPU path |
| Unsharp | amount ≈ 0.3–0.5, radius 3 (conditional) | never on binary |
| CLAHE | clipLimit **2.0**, tiles **8×8** | 1.5–4.0 range; 2.0 = conservative |
| Deskew range | skip if \|θ\| > 20° | |
| Rotation | OSD (PSM 0) to detect; dict-check 0/180 | |
| Sauvola | window ≈ **2×stroke width (~1/8 text height)**, **k=0.2**, **R=128** | scale-aware window |
| Bradley-Roth | window ~8–15 px @300DPI | integral image, fast |
| Otsu | global histogram min-variance | default |
| Speck removal | delete CC with area < ~4–6 px | no morphology |
| PSM | 3 (auto) / 6 (single block) | |

---

## 6. Per-document-type guidance

| Document | Top techniques | Don't overdo |
|---|---|---|
| **Books (scans)** | Crop borders, grayscale, deskew, ≤300 DPI upscale, Otsu; DECT-class derotation for skew if archive copies | denoise; sharpening |
| **Newspaper scans** | CLAHE, local (Sauvola) for uneven columns, border/column segmentation (projection), speck removal | morphology (dense small print) |
| **Forms** | Background flatten, Otsu/adaptive, layout box recovery (classical OK), perspective if photographed, keep grayscale for Tesseract | aggressive blur |
| **Handwritten notes** | Upscale more (thin pens), CLAHE, CC-level cleanup, line/word DL detector (BN-DRISHTI-style) if budget allows | global Otsu on light-pressure ink; erosion |
| **Photocopies** | Median 3×3, adaptive threshold, background flatten | sharpening (halo); NLM (slow) |
| **Mobile photographs** | EXIF normalization, **perspective/homography**, illumination flatten + Sauvola/Bradley, upscale-gray-first, mild unsharp on focus blur | convolution clarity; skip Wiener |
| **Old documents** | Denoise lightly or *not at all* (empirically best), Sauvola/NICK-style local, despeckle, deskew; verify binarization visually | noise filters; global Otsu on bleed-through |
| **Screenshots** | Keep color→gray, expect tiny text → **upscale up to x-height target**, Otsu; skip CLAHE/deskew | borders (already clean) |
| **Low-contrast docs** | CLAHE (clip 2–3) then Otsu/Sauvola; background division | over-CLAHE (noise→specks) |

Cross-cutting: *for every type*, protect the matra and `ি/ী/ু/ৃ` marks — which most hurts when blur + binarize + speck-removal act in sequence.

---

## 7. Implementation choices

- **Default (recommended):** a **Web Worker** with hand-rolled typed-array kernels for: grayscale, Otsu, integral-image Sauvola/Bradley, projection-profile deskew, CC speck removal; plus Canvas for high-quality resize/rotate and `OffscreenCanvas` + transferables. Zero heavy deps, fast, inspectable, fully controlled parameters for Bangla.
- **Use `tesseract.js`** for recognition with worker pooling and scheduler (perf guide); pass preprocessed gray/binary; parameterize PSM and `thresholding_method`.
- **Adopt `jdeskew`** (Fourier radial projection) for skew if tuning time permits — battle-tested, pure JS.
- **Optional WASM accelerator:** an OpenCV.js build with `--simd` (threads only if you can serve COOP/COEP for SharedArrayBuffer) for bilateral/NLM/CLAHE where JS is too slow. Set an explicit fallback to typed-array paths.
- **Loading strategy:** load worker/WASM/traineddata on-demand and cache (`cachePath`/IndexedDB) per tesseract.js perf docs.

---

## 8. Alternatives

- **Server-side preprocessing** (Python/OpenCV/Tesseract): full control, DNN layout available — but violates a browser-first product goal and adds latency/privacy surface.
- **ONNX Runtime Web / transformers.js:** run small layout parsers or learned binarizers (e.g., VIT-based block classification, DBNet) on WASM/WebGPU; heavier weight, conv-path speed caveat applies.
- **Learned document enhancement** (binarization nets, dewarp nets): strong on degraded/handwritten Bangla but large downloads; treat as future tier.
- **Bypass pre-binarization:** feed upscaled *grayscale* straight to Tesseract's internal Leptonica binarization; often the best "no-effort" option for clean scans, per §4 and ImproveQuality docs.

---

## 9. Known limitations

- **Thin-mark destruction:** any denoise/morphology/threshold sequence can erase `ি/ী/ু/ৃ` tails or split the matra; no current browser pipeline auto-validates stroke connectivity.
- **Binarization is not universal truth:** "OCR binarization and image pre-processing" study found no-denoise+Otsu-class best *for their historical set*; results vary per dataset — tune per document class.
- **LSTM sweet-spot limits:** Tesseract's own note on upper x-height bound means *over-upscaling* (4–10×) can *hurt*; pixel-height targeting is a real requirement, not ritual `300 dpi`.
- **Bad Bengali traineddata:** `ben` tessdata quality/coverage (fonts, conjuncts) varies; classical-engine errors are surface-type, LSTM errors are structural (matra/conjunct) per the Devanagari stress-test analogy — post-correction + dictionary layers are complementary to preprocessing.
- **Perspective/warp:** true page **dewarping** (spine/curvature) is out of scope for simple homography; needs learned models — expensive client-side today.
- **Memory/time on mobile:** full-A4 300+ DPI buffers + Tesseract WASM in low-RAM phones; require progressive/downsampled fallbacks.
- **Cross-origin/threads:** SharedArrayBuffer-based parallelism needs COOP/COEP; Safari's WASM weaker; WebGPU uneven (IMC 2025).

---

## 10. Future work

- **WebGPU compute shaders** for the expensive kernels (bilateral, NLM, big CLAHE, homography warp) now that it demonstrably beats CPU on large inputs (IMC 2025 polybench findings); reuse the same pipeline on-WebGPU with CPU/JS fallback.
- **On-device neural binarization & dewarp** (DBNet/PPM, learned dewarp) via ONNX/WASM/WebGPU for old docs and handwritten notes.
- **Bangla layout models:** BN-DRISHTI-style YOLO line/word segmentation (and WACV-2024-style type-aware models) exposed as an optional WASM/WebGPU tier.
- **Stroke-connectivity guard:** a post-check that counts thin-vertical-mark components in the binary image and flags/survives pipelines that risked erasing them.
- **Content-aware parameter selection** ("select by evidence", learnopencv): estimate noise/contrast/blur, choose CLAHE/denoise/upscale accordingly; measure on Bangla grapheme test sets, not Latin.
- **Benchmark harness:** record OCR CER/WER per document type × pipeline preset over Bangla datasets (aclanthology 2023.emnlp-industry.44 gold-standard set) to tune defaults empirically.

---

## 11. References

- Tessdoc — Improving the quality of the output: https://tesseract-ocr.github.io/tessdoc/ImproveQuality.html · https://github.com/tesseract-ocr/tessdoc/blob/main/ImproveQuality.md
- Tesseract binarization params & smoothing destroying small characters (#3707): https://github.com/tesseract-ocr/tesseract/issues/3707
- Tesseract min/max text size discussion (SO): https://stackoverflow.com/questions/64547823/does-tesseract-do-image-resizing-internally
- Rescaling to 300 DPI (SO): https://stackoverflow.com/questions/36716840/how-to-improve-ocr-quality-using-tesseract
- IBM best practices — optimal DPI (200–300; 400–500 for intricate scripts): https://www.ibm.com/docs/en/cloud-paks/cp-biz-automation/25.0.1?topic=processing-best-practices-ocr-automation-document
- El Harraj & Raissouni — OCR accuracy improvement via preprocessing (illumination, grayscale, unsharp, Otsu): https://arxiv.org/abs/1509.03456
- OCR binarization & preprocessing for historical documents (no-denoise best; Otsu-class leads; Sauvola ~13% behind): https://www.sciencedirect.com/science/article/abs/pii/S0031320306002202
- Comprehensive review of document image binarization: https://pmc.ncbi.nlm.nih.gov/articles/PMC12112497
- Enhanced binarization framework for degraded historical documents (survey refs incl. Sauvola): https://link.springer.com/article/10.1186/s13640-021-00556-4
- Degraded historical documents binarization using CLAHE + hybrid thresholding: https://arxiv.org/pdf/1901.09425
- Sauvola & Pietikäinen, Adaptive document image binarization (Pattern Recognition 2000): https://doi.org/10.1016/S0031-3203(99)00055-2
- Local thresholding via integral/sum-area images (near-global speed): https://arxiv.org/pdf/1201.5227
- Modified Sauvola (adaptive window via stroke width): https://www.sciencedirect.com/science/article/pii/S0952197620301159
- Niblack/Sauvola in scikit-image (params k, window): https://scikit-image.org/docs/stable/auto_examples/segmentation/plot_niblack_sauvola.html
- Skew detection review (PP/HT/NN — NN fastest, PP/HT accurate): https://ieeexplore.ieee.org/document/7576562 · https://www.dfki.de/fileadmin/user_upload/import/4943_Joost-Orientation-Skew-Detection-IJDAR10.pdf
- Fast Hough transform skew detection (speed figures): https://arxiv.org/pdf/1912.02504
- Adaptive deskewing (DISCEC'2013 + PubLayNet; projection/Hough/fourier taxonomy): https://pmc.ncbi.nlm.nih.gov/articles/PMC9610931 · https://www.mdpi.com/1424-8220/22/20/7944
- Adaptive radial projection on Fourier magnitude (pure-JS `jdeskew`): https://arxiv.org/pdf/2603.05942 · https://github.com/phamquiluan/jdeskew
- Unicode 17.0 — Bengali chart (vowel-sign positions, virama, two-part signs): https://www.unicode.org/charts/PDF/U0980.pdf
- Common Bengali handwritten graphemes (root+diacritics; matra/conjunct challenge): https://arxiv.org/pdf/2010.00170
- Bangla OCR — matra/headline detection and zones (UAP-BD JCIT): http://www.uap-bd.edu/jcit_papers/vol-1_no-1/JCIT-100707.pdf
- Matra hierarchy in Bangla word segmentation (ScienceDirect): https://www.sciencedirect.com/science/article/abs/pii/S0031320309000338
- Segmentation of handwritten Bangla script (ICIEV 2013): https://www.computer.org/csdl/proceedings-article/iciev/2013/06572635/12OmNAlvHxu
- BN-HTRd dataset (line segmentation for Bangla handwriting); YOLOv5-based BN-DRISHTI: https://huggingface.co/papers/2206.08977 · https://github.com/crusnic-corp/BN-DRISHTI
- Enhancement of Bengali OCR for diverse document types (WACVW 2024; type-aware models + perspective): https://arxiv.org/abs/2402.05158
- A deep OCR for degraded Bangla documents: https://dl.acm.org/doi/10.1145/3511807
- Gold Standard Bangla OCR Dataset (preprocessing + annotation process): https://aclanthology.org/2023.emnlp-industry.44.pdf
- tesseract.js — performance guide (reuse workers, corePath dir, fast data) and API (upscale-before-recognize): https://github.com/naptha/tesseract.js/blob/master/docs/performance.md · https://github.com/naptha/tesseract.js/blob/master/docs/api.md
- OpenCV.js real-time webcam filters (WASM feasibility notes): https://opencv.org/opencv-js-real-time-webcam-filters
- OpenCV.js performance on WASM across browsers (UNLP): https://sedici.unlp.edu.ar/bitstream/handle/10915/89186/Documento_completo.pdf-PDFA.pdf
- OpenCV Wasm threads/SIMD perf tests (threshold): https://intel.github.io/webml-polyfill/workload/opencv_threshold/perf_threshold_thread_simd.html
- OpenCV DNN poor WASM performance (conv ×50–60; SIMD/threads fix): https://github.com/opencv/opencv/issues/23516
- opencv-js-wasm npm builds: https://github.com/ttop32/opencv-js-wasm/releases
- WebGPU vs WebGL / reality check (small inputs slower, wins at scale): https://dl.acm.org/doi/10.1145/3730567.3764504
- WASM image-processing performance study (10–55% vs native): https://www.diva-portal.org/smash/get/diva2:1764648/FULLTEXT02.pdf
- Bilateral & NL-Means theory/pitfalls (blurs thin edges): https://imaging.cs.cmu.edu/15-463/2019_fall/lectures/lecture8.pdf · https://web.cs.hacettepe.edu.tr/~erkut/bil717.s13/w05-bilateral_nlmeans.pdf · https://people.csail.mit.edu/sparis/bf_course/slides/07_variants.pdf
- NLM denoising for preserving textures (skimage; fast_mode note): https://scikit-image.org/docs/0.23.x/auto_examples/filters/plot_nonlocal_means.html
- OpenCV CLAHE class (clipLimit, tilesGridSize): https://docs.opencv.org/4.11.0/javadoc/org/opencv/imgproc/CLAHE.html
- NVIDIA DALI CLAHE (clip 1.5–4.0, tiles 4–16; over-enhancement warning): https://docs.nvidia.com/deeplearning/dali/main-user-guide/docs/operations/nvidia.dali.fn.clahe.html
- ImageMagick CLAHE docs (clip-limit 2–3 starting point): https://android.googlesource.com/platform/external/ImageMagick/+ /c6dca26a587cdbe3a0c525f1e2e236d068c3670a/www/clahe.html
- LearnOpenCV — Tesseract+OpenCV preprocessing "select by evidence": https://learnopencv.com/deep-learning-based-text-recognition-ocr-using-tesseract-and-opencv
- OpenCV thresholding tutorial: https://docs.opencv.org/5.0/tutorials/imgproc/threshold/threshold.html
- Reference pipelines: grayscale→NLM→CLAHE→minAreaRect-deskew→adaptive threshold, conservative deskew ≤20°: https://github.com/srinivas-gampasani/Computer-Vision-OCR-Pipeline · https://github.com/ronaknikam/doc-layout-ocr-pipeline

*Note:* "DECT" is a derotation tool used in book-scan restoration; its algorithmic family (Fourier/entropy angle search) is covered by the jdeskew paper (arXiv:2603.05942) and deskew surveys (PMC9610931). Its primary distribution URL should be verified by the team before citing directly.
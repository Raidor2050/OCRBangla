# Bangla OCR Improvement Workflow (Research)

Status: Research working document — AGENT A4
Product target: "Ordinary Chobi Reader", a Bangla-first OCR web application published on GitHub Pages (static, browser-only). No server-side training, no GPU, no Python runtime in production.
This document defines a serious, reproducible **data → ground truth → evaluation → error-analysis → human-in-the-loop → export → documented fine-tuning** workflow that the browser product can own, **without pretending to train models in the browser**.

---

## 1. Why a workflow, not in-browser training

Browsers cannot do serious OCR fine-tuning:

- Training PaddleOCR / Transformer OCR / Tesseract LSTM requires GPU-hours, Python + CUDA/PaddlePaddle, and payloads (GBs of images + `.pdparams` / `.traineddata`).
- WebAssembly inference is possible (onnyxruntime-web, tesseract.js) but **training** in WASM/WebGPU is immature, memory-bound, and slow. WebGPU matmul-based fine-tunes are research toys, not production practice.
- GitHub Pages is static hosting: no durable storage, no background jobs.

Therefore OCR focuses on the *whole loop around the model*:

- 1. In-browser **evaluation/benchmarking** of existing engines (PaddleOCR hosted export, Tesseract.js, e/zt Gemini-level APIs, local WASM models) on user-uploaded images.
- 2. In-browser **correction & annotation** (ground truth capture).
- 3. Export of **training-ready datasets** (zip + label files + README) that a community member with a GPU can fine-tune with a documented recipe.
- 4. Hosting the **fine-tuning documentation** + a **trained artifact download** route, closing the loop when the community returns better models.

---

## 2. Data collection

### 2.1 Verified public datasets (Bangla / Bengali OCR)

| Dataset | Content | Size | License (as published) | Notes |
|---|---|---|---|---|
| **CMATERdb 3.1.1** (Jadavpur Univ.) | Handwritten Bangla numerals (6000 imgs, 10 classes) | 5000 train / 1000 test | Apache-2.0 on `prabhuomkar/CMATERdb` mirror; original is "free for non-commercial research", **acknowledge + cite CMATER** | Also Devanagari & Telugu numeral sets. Available via `tensorflow/datasets` (`cmaterdb/bangla`), NumPy format on GitHub |
| **CMATERdb 3.1.3.3** | Isolated Bangla compound characters | 55,278 samples, 171 classes | Non-commercial research; cite paper | Mirrored via tensorflow/datasets |
| **CMATERdb 1.1.1 / 1.2.1** | Unconstrained handwritten pages, pure Bangla / Bangla+English | 150 document pages + line GT | Free for research (per CMATERdb); cite IJDAR paper | Includes line-segmentation GT and the legacy "GT Gen" tool |
| **BanglaLekha-Isolated** (`banglalekha.org`) | Handwritten numerals, basic + compound chars | 166,105 images, 84 classes | Research release; **check current terms** on banglalekha.org | Agreed with collection from Bangladeshi writers; use cite per arXiv 1703.10661 |
| **ISI Bangla numeral/basic datasets** (Bhattacharya & Chaudhuri) | Handwritten numerals, basic chars | 23,299 numerals / 30,966 basic | Academic research; cite TPAMI paper | Classic benchmark |
| **iiit-indic-hw-words** (IIIT Hyderabad, NLTM OCR) | Handwritten Bengali **words** | 113,076 words (82,554 tr / 12,947 va / 17,575 te), 11,295 unique training words | Available via ilocr.iiit.ac.in (NLTM); **research use, cite Gongidi & Jawahar ICDAR 2021 / DAS 2018** | Word-level, tab-separated GT files |
| **Mozhi-Bengali** (IIIT) | Printed **word** crops from scanned books | 100,013 words (80,113 / 9,787 / 10,113) | Via ilocr.iiit.ac.in; cite NLTM pages | Manually annotated transcriptions |
| **BN-HTRd** (`shaoncsecu/BN-HTRd_Splitted`, HF) | Full-page handwritten words/lines/docs | 786 pages, 108,147 word instances, 13,867 lines | arXiv permissive license (arXiv non-exclusive); **verify page license** | Based on BBC Bangla news corpus; YOLO bbox GT included |
| **Bengali.AI Handwritten Graphemes** (Kaggle `bengaliai-cv19`) | 411k curated handwritten graphemes (1295 classes) | 200,840 / 98,661 / 112,381 | Kaggle competition terms — **non-commercial-ish; check current license** | Multi-target (root + vowel + consonant diacritic) labels |
| **AROBIN79 Bangla OCR validation (printed)** (HF) | Printed + scanned lines/pages with GT text | 1,555 items | HF dataset page terms (check) | Good as a **validation slice**, not training |
| **Bangla OCR training data (CRBLP/BanglaOCR)** | Synthetic printed training images + transcripts/box files for Tesseract (v2 vintage) | — | Free for academic use; **cite Hasnat et al. ICDAR 2009 / CLT 2009** | Box files for Tesseract 2; needs rework for Tesseract 3.02+/5 (recoder). "Simpler is better" lesson from CRBLP |
| **Gold Standard Bangla OCR dataset** (2023 EMNLP industry) | 4M+ human-annotated word/char images (computer compose, letterpress, typewriter, banners, handwritten) | ~4.1M | ICT Division, Bangladesh expected public release; **not yet confirmed available** — watch the DOI | Method paper: 3-step annotation + 1 validation; Kappa-based QA |
| UBTech / ROBUST, TextOCR, COCO-Text, MLT (ICDAR) | Multilingual / real-world text | large | Various; mostly English or multilingual with some Bengali in MLT/CurvedSVT variants | Check per-split coverage of Bengali data |

**Licensing guidance (must follow):**
- CMATER mirrors (Apache-2.0) are safe for code; the *data itself* is "non-commercial, acknowledge + cite". For a **non-commercial research workspace** this is fine; document the provenance in the README that ships with exports.
- Bengali.AI/Kaggle sets are bound by Kaggle competition terms. Re-distribution restrictions apply — treat as "origin-only" links + derived subsets with clear attribution.
- When mixing sets, attach a `DATASET_MANIFEST.json` per export listing source, subset, license, and citation for **each** contributing set.
- Never vendor PDFs/images scraped from public web without permission; prefer licensed/citable corpora (BN-HTRd uses BBC Bangla news corpus — only as HTR forms, not raw news text).

### 2.2 Synthetic data generation (the pragmatic backbone)

For printed Bangla, synthetic rendering is cheap, exact (perfect labels), and covers rare conjuncts (যুক্তাক্ষর), matras, and compound glyphs that real data under-represents.

- **TextRecognitionDataGenerator (TRDG)** — `Belval/TextRecognitionDataGenerator`, MIT. CLI + Python module. Supports custom dicts, font dirs, background noise/patterns, gaussian blur, skew, sine/cosine distortion, margins/fit, colors, stroke. **Key caveat: Bangla is a ligature/complex-script language — render **word-per-piece**, use `--word_split` semantics so PIL draws shaped clusters and not per-codepoint, and use a shaped-capable font** (Kalpurush, Noto Sans Bengali, SolaimanLipi, Bangla per Bodoni). PIL's default layout does not fully shape; verify matra/conjunct shaping by masking **rendered output vs. expected string** before batch generation.
- **GlyphScribe** (`tahsinchoudhury/GlyphScribe`) — synthetic **Bengali handwriting** generator (font_size, angle, bars, random text, curve distortions, augmentation). Used by GraDeT-HTR (EMNLP 2025 demo) for pre-training. Good to cheaply bootstrap handwriting before real data.
- **Font harvesting**: collect many free OFL Bangla fonts (Noto Sans Bengali, Hind Siliguri, Kalpurush, Charukola, Bangla MN) and render identical strings across all fonts + sizes — this is the single highest-yield diversity lever for printed OCR.
- **Corpus source**: Wikipedia dump, BNLP/Bengali corpora, OSCAR bn, or the CRBLP character-combination list for exhaustive conjunct coverage. Generate **character-frequency-weighted** text so rare conjuncts appear.
- **Persistence check**: commit a `sync/` generator script + seed so any participant can regenerate the same synthetic dataset byte-for-byte.

### 2.3 Collection of real "chobi" (photo/scanned) data

Target the artifact that defines "ordinary": phone photos of books, bills, posters, receipts, street signs, handwritten notes, blurry/low-light scans.

- **In-browser capture task** in the product: "shoot a photo of a line of Bangla text" produces consent-tracked, license-labeled raw samples (CC0 option) — pure browser, no server needed to *collect*; curation happens offline.
- **Consent + provenance fields**: shooter, device, light condition, distance, subject class (book/bill/sign/handwritten), license choice (CC0 vs CC-BY), original GPS-free.

---

## 3. Ground truth

Ground truth levels, in increasing cost:

1. **Page-level plain text** (paragraph) — cheapest; enough for CER/WER benchmarking of full-page OCR.
2. **Line-level boxes + text** — cell/row-level ground truth; drives segmentation evaluation and OCR ('rec') training crops.
3. **Word-level boxes + text** — PaddleOCR `det` + `rec` training input; the format IIIT/Mozhi and BN-HTRd already provide.
4. **Reading-order annotation** — sequence of blocks/lines; needed for documents (multi-column), and for fair WER on concatenated page text.

Ground-truth correctness requirements for a research-grade set:
- **Unicode**: normalize to NFC, and keep `ZERO WIDTH JOINER` (ZWJ) correct for conjuncts — do not strip it (this is a classic Bangla CER pitfall).
- **Transcription type**: transcription follows *what is printed*, preserving orthography; do not spell-fix the writer.
- **Verification**: 3-step annotation + 1-step validation (pattern used by the EMNLP 2023 gold-standard Bangla corpus); measure inter-annotator agreement (Fleiss/Cohen Kappa) on a 5–10% duplicate-sampled slice.
- Store a **`GT_SPEC.md`** alongside exports precisely defining tokenization rules (see §5.4) so CER/WER numbers stay comparable across runs.

---

## 4. Annotation tooling (browser-based)

| Tool | Type | Fit | Notes |
|---|---|---|---|
| **Label Studio** (`HumanSignal/label-studio`) | Open-source web app (SSR, but its *frontend library* is browser JS) | Primary recommendation for boxes + transcription + reading order | Official **OCR template** (`<Rectangle>` + per-region `<TextArea placement="perRegion">`), hOCR word-layer support (Document AI template), ML backends (Tesseract example), multi-user, Kappa agreement metrics, JSON/COCO/YOLO export. Self-host for a team; the labeling UI is React-in-browser |
| **CVAT** | Open-source (Apache-2.0) web annotation | BBox/track at scale, polygon, SAM-assisted | Better for heavy CV workloads; OCR transcription is possible but Label Studio is more text-native |
| **VGG Image Annotator (VIA)** | Single-file HTML (runs offline in browser) | **Lightest fit for a GitHub-Pages product** | The entire tool ships as one HTML file; CSV/JSON export; can be embedded/linked from the project site as a "ground truth station" for volunteers. Reading-order not native — use region_id ordering + a convention |
| **tesseract.js + custom correction UI** | In-browser automatic pre-annotation | Recommended UX path inside the product | Run Tesseract.js in-browser to pre-fill boxes/transcription; human accepts/corrects; corrected text = ground truth. This is the fastest route from photo → labeled sample in one session |
| PaddleOCR/Google Cloud Vision (API) | External (not browser) | Server-less API pre-annotation via user-triggered export | Feasible as "bring your own key" helper for heavier pages |

**Reading order annotation**: Label Studio supports per-region numeric indices and "relations" arrows for sequence mapping (see Document AI template). For a lighter path: linearize via bounding-box top-to-bottom, left-to-right sort for single-column images and let regions carry an explicit `reading_order` int in VIA/Label Studio exports.

**Export formats** the product should consume/produce uniformly:
- Vancouver-style JSON: `{image, label (UTF-8 text), bbox, reading_order, source, license}`.
- COCO / YOLO for det.
- PaddleOCR rec `label_file_list` (TAB-separated `img_path<TAB>label`), and PP-OCR det format (`img_path<TAB>[["x1","y1",...],...]<TAB>label`).
- Tesseract `.box` files (char-level) only if we pursue tesstrain line data.

---

## 5. Evaluation metrics (exact definitions)

All core metrics derive from **string edit distance** between a hypothesis H and ground truth R. Use a *standardized alignment* implementation (e.g., `jiwer` semantics) everywhere.

### 5.1 Levenshtein (edit) distance

The minimum number of single-token edit operations to turn R into H:

```
D(i,0) = i, D(0,j) = j
D(i,j) = min(
  D(i-1,j) + 1,            // deletion
  D(i,j-1) + 1,            // insertion
  D(i-1,j-1) + cost(R[i],H[j])   // substitution, cost 0 if equal else 1
)
```

(For word-level, tokens = words.)

### 5.2 CER (Character Error Rate)

Let S = substitutions, D = deletions, I = insertions, N = total characters in reference R.

```
CER = (S + D + I) / N          with   N = S + D + C   (C = correct chars)
```

**Note:** CER can exceed 100% when insertions dominate (R=`ABC`, H=`ABC12345` → 166.67%).

### 5.3 Normalized CER (bounded 0–100%)

```
CERN = (S + D + I) / (S + D + I + C)
```

This is the bounded variant used by OCR-D benchmarking (`ocrd_eval` spec). Use this for reporting; keep the raw variant for diagnostics.

### 5.4 WER (Word Error Rate)

Same formula, tokenized on words (let `S_w, D_w, I_w, N_w`):

```
WER = (S_w + D_w + I_w) / N_w        // equivalent denominator: S_w + D_w + C_w
```

**Tokenization pitfalls specific to Bangla (report the rule; do not silently pick):**
- Decide whether `৳`, `।`, `?`, commas attach to words or are standalone tokens.
- Decide whether ZWJ/non-spacing marks are counted as characters in CER (recommend: count **grapheme clusters**, not raw codepoints, for CER — a conjunct is one unit; match what the rec model emits).
- Unicode normalization must be identical on both sides.

### 5.5 Character Accuracy

```
ACC = (N - (S + D + I)) / N  =  C / N     // i.e., 1 - CER (raw form)
```

Report alongside CER; note accuracy saturates in the 90s% while CER in single digits is still a large absolute error count.

### 5.6 Segmentation-adjusted metrics (optional)

OCER/OCWER (openreview 4uTtdp90V6) weight substitutions by **visual similarity** (HOG cosine distance) and add explicit union/split operations so "key board" vs "keyboard" and visually similar substitutions (০ vs ও, ᴠ vs ল, ◌ি matra ambiguities) aren't double-penalized. Use as a *diagnostic* view for Bangla pocket-characters (০-০-ও-খ-থ etc.), report standard CER/WER as the headline.

### 5.7 Deterministic evaluation harness (product must-have)

Ship an in-browser evaluator:
- Input: image(s) + reference text (typed or loaded).
- Run 1..N engines (Tesseract.js `ben`/`ben+eng`, PaddleOCR via user-provided server or WASM, fallback cloud API), align, show per-line and per-page **CER / CERN / WER / Acc** tables and a **confusion matrix**.
- Deterministic seed + pinned engine versions in the `evaluation/` code so numbers are reproducible; write a SHA256 of inputs+engine into the report.

---

## 6. Error analysis methodology

### 6.1 Error clustering

Group misread words/lines by:
- **Visual similarity** (embedding of the cropped image, e.g., CLIP/handcrafted HOG) — finds repeated glyph confusions.
- **Edit pattern** (the aligned S-D-I fingerprint) — finds systematic offsets (dropped matras, extra `ি`).
- **Confusion pair** (R[i]→H[j] substitution frequencies) → **confusion matrix**, ordered by impact = frequency × severity.

Derived artifacts per evaluation run:
- Top-K confusion pairs (e.g., `ন`→`ণ`, `র`→`ব`, `ত`↔`শ`, `০`↔`ও`, matra-attachment errors).
- Font / DPI / blur / rotation correlation (crop-level statistics recorded at collection).
- **Character difficulty index**: per-glyph error rate (and per-conjunct) = errors on that glyph / occurrences. Surfaces rare conjuncts and matra-attachment as the pain points users actually feel.

### 6.2 Difficult-character analysis (Bangla specifics)

Bangla presents systematic hard classes; analysis MUST report these separately:
- **Matras & diacritics** (ি, ী, ু, ূ, ৃ, ে, ৈ, ো, ৌ) — misleading *attachment* to base letters.
- **Conjunct clusters** (যুক্তাক্ষর) — very high class count; rare ones near-zero training coverage.
- **Visually-confusable pairs**: র/ব, ন/ণ, থ/স, ভ/ধ, ব/ভ, ০/ও, 8-swirl numerals.
- **Up-to-sequence clusters** in handwriting (র, য় components).
Analysis output = ranked "focus list" that drives both **augmentation targeting** and **active-learning sampling** (next section).

### 6.3 Benchmark slices

Keep **stratified test slices** (never mixed into training): clean print, low-res scan, phone-photo, blur, rotated, handwritten, mixed Bangla-English. Report macro + per-slice metrics so the community can see where fine-tuning helps and where it doesn't.

---

## 7. Active learning & human review loop (the browser-native core loop)

Borrow from established OCR-correction literature (multi-engine error estimation, batch/cluster correction — Das et al. 2019, Abdulkader & Casey 2009):

1. **Suspect generation**: run 1–3 engines on a page; a word is a *suspect* if engines disagree, or confidence < threshold, or characters not in a frequency-ranked whitelist.
2. **Priority** (active learning score): weight by (a) repeat-count across the collection, (b) predicted gain to the confusion matrix (rare conjuncts first), (c) agreement across engines vs certainty of the best engine.
3. **Cluster then ask once**: group visually-similar suspect crops (LSH on image+text features); the human answers one representative, correction propagates to the cluster (per Das et al. handling of impure clusters by sub-clustering on edit distance).
4. **Corrections → ground truth**: accepted/corrected text becomes labeled data in the export pipeline (§4), and the words removed from suspects.
5. **Loop benefit measurement**: track CER reduction per N human edits; stop question batches when marginal gain < cost. Target: >70% reduction in human effort vs. naive full-page proofreading, as demonstrated by Das et al. for book corpora.

In-product UI: an editable per-line box with "accept / correct / skip" and a per-word confidence coloring; corrections stream to a local IndexedDB staging store, then one-click **export**.

---

## 8. Training approaches & feasibility (for the community/offline stage)

The product does **not** train, but must document and hand off a clear path. Community-scale feasibility ranking:

| Approach | Fit | Feasibility for community | Notes |
|---|---|---|---|
| **PaddleOCR (PP-OCRv5 / PP-OCRv4) fine-tune** | 1st choice for printed/photo text | **High** — well-trodden CLI (`tools/train.py -c config.yml`), docs, pre-trained models | Data = `img<TAB>label` lines + `character_dict_path` + `pretrained_model` + `RecAug`; train det & rec separately; needs a GPU, ~Python+Paddle. Dict must include ZWJ and Bangla conjunct glyphs |
| **Tesseract LSTM (tesstrain)** | 2nd choice; good for printed + some handwriting; bundled `ben` baseline exists | **Medium** — `tesseract-ocr/tesstrain` (make targets: unicharset/lists/training/evaluation/plot); `lstmtraining` fine-tune from `tessdata_best/ben.traineddata`; `NER_SPEC` network spec; `--pass_through_recoder` for Indic scripts; float (best) model required for "impact"/"plus" fine-tunes | Requires .box/.lstmf line data; `ben` traineddata exists so fine-tuning (not from-scratch) works with modest data; CER target stop (`TARGET_ERROR_RATE`); community example: `Shreeshrii/tesstrain-ben` (Kalpurush full flow including plots) |
| **CTC / seq2seq CNN-RNN (CRNN+CTC)** | Custom recognizer, e.g., Paddle's CTC head, or a from-scratch student project | **Medium-High** if reusing Paddle; from-scratch is more work | CTC aligns variable-length seq → label; needs per-word crops; reliable but more hand-tuning than PP-OCR paths |
| **Transformer OCR (TrOCR-style, DocTR, GOT)** | SOTA for printed+handwritten; good at full-line | **Low for community-scale** — heavy data + compute; several hundred-line doc corpora typical; Bengali-specific weights scarce | Best used as **API/cloud** during product phase (bring-your-own-key); fine-tune path lives in later work |
| **Grapheme-aware decoder-only Transformer (GraDeT-HTR)** | Handwriting SOTA for Bengali (EMNLP 2025 demo) | Research-grade; **Low** for community to reproduce on a budget | Grapheme-based tokenizer key insight for Bangla; pre-train synthetic (GlyphScribe) → fine-tune real (BN-HTRd, IIIT words) |

Reality check (community-scale): printed Bangla OCR **fine-tuning** is very achievable today (PaddleOCR or tesstrain with a few thousand synthetic + a few hundred real samples); **handwritten** recognition at strong quality needs thousands of annotated samples (IIIT words, BN-HTRd, Bengali.AI graphemes) and GPU time — market this as a later, well-goaled sub-project.

### 8.1 Documented fine-tuning recipes to ship

- `docs/research/FINETUNE_PADDLEOCR.md`: env, data format + `gen_label.py`, dict build (incl. ZWJ + conjuncts), `config.yml` diff vs PP-OCRv5 (`character_dict_path`, `pretrained_model`, `RecAug` on/off, `max_text_length`, batch), train/eval/predict commands.
- `docs/research/FINETUNE_TESSERACT.md`: `tesstrain` make flow (as in `Shreeshrii/tesstrain-ben`) + raw `lstmtraining` / `combine_tessdata -e`-based fine-tune from `tessdata_best/ben`.
- Both recipes include **how to convert the product's exports** (JSON/VIA → PaddleOCR tabs; → Tesseract .box/.lstmf) — we ship tiny converters.

---

## 9. Recommended product workflow (GitHub Pages)

**Stage A — Benchmark & validate (ship first)**
1. User uploads/document-paste image (or draws on canvas).
2. In-browser OCR pass: Tesseract.js `ben` (+ optional `ben+eng`), plus pluggable "external engine" cards (PaddleOCR/WASM, cloud key).
3. User provides/edits reference text (typed or corrected from OCR).
4. Product computes CER/CERN/WER/Acc, per-line confusion, and writes a reproducible `eval-report.json` (engine+version, hash, metrics, top confusions).

**Stage B — Collect & annotate (the ground-truth loop)**
5. Correction UI == annotation; accepted lines become labeled samples (line-level) with consent/license captured at upload.
6. Optional finer annotation preserved: VIA/Label Studio links for teams wanting word boxes + reading order.

**Stage C — Export training-ready datasets**
7. One-click **dataset export**: images + `train.txt`/`val.txt` (PaddleOCR) + JSON/VIA (via) + optional `.box`/`.lstmf` (Tesseract), a **`README.md`** with dataset manifest/licenses/citations, and SHA256 checksums.

**Stage D — Community fine-tune & download path**
8. README + recipes (`FINETUNE_*.md`) explain the GPU step.
9. When a contributor uploads a better `.traineddata` / PP-OCR inference zip (a `releases/` flow or issues/attachment, browser can only download), the product wires it into the browser engines as a **selectable model**, and re-runs Stage A to re-benchmark.

**Guardrails**: never mix evaluation slices into training exports; always log license choice per sample; keep `eval` vs `train` vs `val` explicit in file naming.

---

## 10. Implementation choices (browser)

- **Engines**: `Tesseract.js` (WASM) as default offline engine; PP-OCR via an optional "bring-your-own endpoint/WASM" extension point; pure-JS `fastest-levenshtein`/`js-levenshtein` for CER/WER (align using the standard DP and count S/D/I).
- **Alignment**: use the exact `jiwer` conventions (default tokenizers) to stay comparable with published numbers; implement a configurable tokenizer for Bangla (see §5.4).
- **Storage**: IndexedDB (Dexie) for staged annotations/samples; export = JSZip + Blob download. GitHub Actions optional: generate releases when a new model artifact is tagged.
- **Workers**: Offload tesseract.js to a Web Worker; keep the evaluator DAG (decode → binarize → OCR → align → cluster) in a typed pipeline module so it's testable (vitest already in repo).
- **Framing terminology**: never claim "AI training in your browser"; call it "improvement loops" or "community fine-tuning workflow".

---

## 11. Alternatives considered

- **In-browser WebGPU fine-tuning** — researched, rejected for now (memory/immat mature, no ecosystem, no GPU on many mid-range phones).
- **Server-side colab-style backend** — rejected for GitHub-Pages constraint; could be a *partner* later (Colab notebooks that consume exported zips: a "Fine-tune on Colab" button that pre-fills Drive CLI, keeping the product static).
- **Administer own model zoo (self-hosted PaddleOCR Server)** — out of scope for pure static hosting; documented instead in the recipes.
- **Doing nothing (ship Tesseract.js only, no loop)** — rejected: without an evaluation + export loop there is no path to accuracy improvement, which is the whole premise of the brand.

---

## 12. Limitations

- CE/A WER **tokenization choices** (grapheme vs codepoint; ZWJ) change numbers materially — must be pinned per report.
- Public Bangla datasets are skewed toward **handwritten recognition** and **numerals/characters**, with *printed full-page* data sparse (Mozhi words, Bengali.AI, ARDBIN validation set are partial); synthetic data dominates printed coverage → synthetic/real domain gap must be monitored.
- Two datasets (Bengali.AI / Kaggle, others) constrain redistribution — exports must remain **derivative + provenance-tagged**, not wholesale.
- No in-browser training by design; latency of multipage docs, memory limits on phone browsers, and license of Tesseract.js WASM bundle (Apache-2.0) are manageable but real.
- Inter-engine comparisons are only meaningful on identical engines/versions (pin them).

---

## 13. Future work

- **WASM/WebGPU pilot**: track WebGPU matmul training maturity; feasibility spike on a tiny PP-OCR-lite fine-tune in 12–24 months.
- **e/zt cloud adapters**: optional serverless OTS OCR APIs (Google Cloud Vision, Gemini-, GOT-style) for text-heavy pages; reconcile outputs into the same report format.
- **Post-correction layer**: character-level seq2seq / BERT-CCC-style post-correctors (offline artifact) can cut residual CER beyond raw engine output; export corrected pairs as extra training data (semi-supervised self-training per Rijhwani et al.).
- **Reading-order aware evaluation**: block-level IoU + reading-order accuracy metrics for multi-column material.
- **Typography-aware augmentation**: label-space-consistent augmentation (e.g., **keep matra/ZWJ integrity while distorting**) rather than blind geometric ops.
- **Model zoo pages + leaderboards** on the site, from the exported eval reports.

---

## 14. References (primary sources consulted)

1. CMATERdb — `prabhuomkar/CMATERdb` (Apache-2.0 mirror); NIST catalog entry for CMATERdb 3.1.3.3; tensorflow/datasets `cmaterdb/bangla`. Original lab: Jadavpur University.
2. Sas, J., et al. (CMATERdb1) — IJDAR 15:71–83, 2012, doi:10.1007/s10032-011-0148-6.
3. CMATERdb3.1.3.3 compound char benchmark — arXiv:1802.00671 (Roy et al., 2018).
4. Biswas et al., *BanglaLekha-Isolated* — arXiv:1703.10661; banglalekha.org.
5. Bhattacharya & Chaudhuri, *Handwritten numeral databases of Indian scripts* — TPAMI 31(3), 2009.
6. Gongidi & Jawahar, *iiit-indic-hw-words* — ICDAR 2021, pp. 444–459; NLTM/ilocr.iiit.ac.in pages (dataset 2 = hw words; dataset 4 = Mozhi-Bengali).
7. Rahman et al., *BN-HTRd* — arXiv:2206.08977; HF `shaoncsecu/BN-HTRd_Splitted`.
8. Alam et al., *A Large Multi-Target Dataset of Common Bengali Handwritten Graphemes* — ICDAR 2021, pp. 383–398; Kaggle `bengaliai-cv19`.
9. Hasnat et al., *An Open Source Tesseract Based OCR for Bangla* — ICDAR 2009; CRBLP blog posts (2013) w/ training data & box files.
10. Hasnat et al., *Integrating Bangla script recognition support in Tesseract* — CLT 2009.
11. Omee et al., *A Complete Workflow for Development of Bangla OCR* — arXiv:1204.1198.
12. Ali et al., *Gold Standard Bangla OCR Dataset* — EMNLP Industry 2023, doi:10.18653/v1/2023.emnlp-industry.44.
13. Belval, *TextRecognitionDataGenerator* — github.com/Belval/TextRecognitionDataGenerator (MIT).
14. Tahsin Choudhury, *GlyphScribe* — github.com/tahsinchoudhury/GlyphScribe; used by *GraDeT-HTR* (EMNLP 2025 System Demonstrations, aclanthology 2025.emnlp-demos.52).
15. PaddleOCR docs — PP-OCRv5 configs (`PP-OCRv5_server_rec.yml`), `tools/train.py`, v2.x fine-tuning documentation (paddleocr.ai), tim's blog *Fine-tuning PaddleOCR* (2025).
16. tesseract-ocr/tesstrain — github.com/tesseract-ocr/tesstrain; tessdoc *TrainingTesseract-4.00.md* & *TrainingTesseract-5.md*; `lstmtraining.1.asc`; `Shreeshrii/tesstrain-ben`.
17. Label Studio — github.com/HumanSignal/label-studio; OCR template; Document AI / reading-order guide; Tesseract ML-backend tutorial.
18. CVAT — cvat.ai (Apache-2.0).
19. OCR-D — Quality Assurance spec (`ocrd_eval`): CER, normalized CER, WER (ocr-d.de/en/spec/ocrd_eval).
20. jiwer — jitsi.github.io/jiwer (metrics + alignment conventions); HuggingFace `evaluate` CER metric (same formulas).
21. Stringalign — stringalign.com/concepts/cer_wer_ter.html (tokenization caveats).
22. Leung, *Evaluating OCR with CER and WER* — Medium, 2021 (worked examples).
23. *OCER and OCWER* — openreview.net/pdf?id=4uTtdp90V6 (visual-similarity-weighted + split/union metrics).
24. Das et al., *Cost-Efficient Approach to Correct OCR Errors in Large Collections* — arXiv:1905.11739 (batch/cluster human-in-the-loop; >70% effort reduction).
25. Abdulkader & Casey, *Low Cost Correction of OCR Errors Using Learning in a Multi-Engine Environment* — ICDAR 2009, doi:10.1109/icdar.2009.242 (active learning, suspect clustering).
26. Rijhwani et al., *Lexically-Aware Semi-Supervised Learning for OCR Post-Correction* — arXiv:2111.02622 (self-training + lexically-aware decoding).
27. Ramirez-Orta et al., *Post-OCR Correction with Character seq2seq ensembles* — AAAI 2023 (ICDAR 2019 post-OCR competition background).
28. Bengali.AI datasets page & HF org — bengali.ai/datasets; huggingface.co/bengaliAI.
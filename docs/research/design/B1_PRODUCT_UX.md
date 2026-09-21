# B1 — Product UX Research: Interaction Patterns from Existing OCR/Document Products

**Project:** Ordinary Chobi Reader (Bangla-first OCR web app, minimalist research-instrument aesthetic)
**Role:** AGENT B1 — Research only (web research + findings doc)
**Date:** 2026-09-21
**Target design context:** A two-pane "document → extracted text" workspace, a multi-file queue, and a settings/advanced panel.

This document extracts concrete, transferable interaction patterns (not marketing claims) from shipped OCR and document-processing products, plus the UX failures to avoid. It is intended as design input for the analyst/design agents (B-series) and the implementing engineers.

---

## 1. Product Survey

### 1.1 Adobe Acrobat / Document Cloud (professional desk/web PDF OCR)
- **Scan-to-PDF workflow:** Create → Scanner → pick scanner → set pages/duplex, color mode (Autodetect / Color / B&W / Grayscale), DPI, paper size → Scan, then "Scan More Pages / Scan Reverse Sides / Scan Is Complete".
- **Preprocessing filter set (the "enhance" family):** Deskew (auto-straighten tilted pages), Descreen (removes print dot patterns, best for 200–400 DPI), Background Removal, Text Sharpening slider. These are offered *before* recognition and are advert-ised to improve OCR accuracy — a strong signal that preprocessing is part of the OCR UI, not a hidden step.
- **Recognize Text dialog:** page range + language + output type. Minimal, task-local options.
- **Output routing:** "Create New PDF / Append to File / Save Multiple Files" — explicit destination decision at scan time.
- **Searchable PDF variants:** text layer visible vs. invisible; "Text and pictures only" vs "Text over image" vs "Text under image" (ABBYY also uses this trichotomy).
- **Add Metadata once for a batch** — enter shared metadata once for multiple files.
- **New experience:** tabs per open document, All Tools rail, Quick Action floating widget, drag-and-drop to open. Progress shown as a small dialog (lower-right corner) rather than blocking modal.

### 1.2 Google Cloud Vision "Try It!" demo
- "Drag an image file here or browse from your computer"; **states limits up front**: max 20 MB, supported formats (PDF/TIFF not supported in demo), JS required, English-only demo text.
- **Raw JSON viewer** ("Show JSON") — for a developer/analyst audience, surfacing the raw response is a feature, not an omission. Tabs per detection feature (Objects, Labels, Safe Search, Document Text).
- "Replay / Reset / Upload new file" affordances for iteration.
- Separate `TEXT_DETECTION` vs `DOCUMENT_TEXT_DETECTION` feature types — the model/variant distinction is exposed to the user.

### 1.3 OCR.space (free online OCR + API)
- Input by **file upload or paste a URL** — the "bring content without downloading" pattern.
- Preprocessing checkboxes: *Detect orientation + auto-rotate*, *receipt/table recognition*, *auto-enlarge low DPI*.
- Output mode radio: **"Just extract text and show overlay (fastest)"** vs *Searchable PDF with visible text layer* vs *Searchable PDF with invisible text layer* — output mode picked *before* processing.
- **Engine selection with explicit speed/quality framing:** "Engine1 (Default, fastest)", "Engine2 (Fast and very good)", "Engine3 (Extremely good, including Handwriting. May be slower.)" — a model/settings selection pattern.
- Workspace = **image preview pane** (which also accepts drag-and-drop) + **result pane with Text/Json tabs** + Download / Show Overlay buttons. This is a two-pane source→result workspace in its simplest form.
- Free-tier constraints stated plainly (5 MB file, registration-free).

### 1.4 Amazon Textract (AWS console demos)
- **FeatureTypes selection**: TABLES / FORMS / QUERIES / SIGNATURES / LAYOUT — the user selects which extraction passes to run.
- **Structured output categories**: raw text, key-value pairs, tables, queries, signatures, layout (paragraph/list/header/footer/page-number/figure).
- **Async job pattern**: `StartDocumentAnalysis` → JobId → SNS completion → `GetDocumentAnalysis`; "check SUCCEEDED status then fetch" — a job-id state machine surfaced as progress.
- **Bulk Document Uploader** in console (multi-file), plus the Analyze Document Demo.
- Output to JSON/CSV/TXT.

### 1.5 CamScanner / Adobe Scan (mobile capture + OCR)
- **Live edge detection with strong feedback:** blue corner dots on detected page; on-screen status text ("Looking for document", "Capturing… hold steady", "No document found. Capture manually") — status the user can act on.
- **Auto-capture vs manual-capture modes**; auto crop + image cleaning; captured scan appears with **crop handles + editing tools** (confirm/adjust before save).
- **Capture loop:** "Keep Scanning" (next page) vs "Retake" vs "Save PDF" — pages stack into one multi-page document. Adobe Scan adds "Scan Reverse Sides".
- **Review mode:** reorder pages by drag-and-drop; **multi-select rotate/delete** with a Select All checkbox; long-press thumbnail + red X to delete.
- **Scan modes as affordance:** Photo / Document / Whiteboard / Business Card (Microsoft Lens) — presenting the category changes preprocessing heuristics.
- **OCR language = downloaded language pack** (Adobe Scan: Preferences → Text recognition language → download pack). Editing later happens in that language.
- **Save PDF:** tap-to-rename then save; "Scan in progress" resume dialog for unsaved captures.
- CamScanner critique insights: camera-button *lockout* as a forcing constraint; **missing save-confirmation on annotations confused users** ("is it saved?") — feedback gaps are a real failure mode.

### 1.6 Microsoft Lens (Office Lens)
- Four capture modes chosen at open; automatic edge detect; image correction/cleanup (deskew, glare/shadow removal) run *before* OCR.
- **Export straight after editing:** choose OneNote, OneDrive, Word, PowerPoint, PDF, gallery, or email *at save time*; Immersive Reader share.
- Known complaints (Capterra): no folder organization after capture; **PDF export only available immediately after scan** (not later) — an export-access anti-pattern. Multiple capture of many pages is awkward.

### 1.7 Google Lens
- **All text regions highlighted as tappable boxes;** tap to select, drag handles to extend; Copy bar above the selection.
- **Search / Text / Translate tri-state** above the annotated image.
- **Translation rendered in-place** over the original, matched to font family/size/color, with full copyable text below — "annotated source" pattern.
- Auto-detect source language with a language picker; Listen mode highlights each word as read aloud.

### 1.8 Document-intelligence UIs: Parseur, Klippa/Doxis AI.dp, OmniAI, ParseAI, TableFlow, AWS A2I
- **Upload = drag-and-drop onto the workflow view or a click**, multi-file, formats + per-file size limit stated on the surface (ParseAI: PDF/PNG/JPEG, ≤50 MB).
- **Granular per-document status state machine** (ParseAI): `pending → parsing → parsed → extracting → completed | pending_review | failed`; `pending_review` triggered by missing required field, confidence < 0.75, or review mode. Retry affordance on `failed`.
- **Review panel = split-pane:** original document image left, extracted field values right, **per-field confidence scores**, low-confidence fields highlighted, inline edit, Approve/Reject with optional reason (ParseAI).
- **Tiered routing (AWS builder guidance, Azure Content Understanding, Appian):** auto-approve high-confidence → STP; flag medium/low per configured field thresholds; reject unreadable. Flagged items go to a *queue* that does not block the pipeline (OmniPATH: 8% human intervention).
- **Grounding:** extracted values link to the page/section/box they came from (Azure grounding; OmniAI: "cited results" with source coordinates; Appian reconcile screen with a highlighter tool that picks the correct value *from the document*).
- **Validation before export:** recompute totals, check formats, flag gaps (OmniAI, TableFlow); e.g., invoice total must equal sum of line items.
- Appian nuance: **confidence scores displayed only for fields below threshold** — this avoids visual noise on the 95% that are fine.

### 1.9 Tesseract wrapper apps: gImageReader, Tesseract-GUI (reference for a Bangla-first tesseract/localtool aesthetic)
- **gImageReader:** import from disk, scanner, clipboard, screenshots; **manual or automatic recognition-area definition** (draw a box on the image for region-only OCR); recognize to plain text or hOCR; **recognized text displayed directly next to the image**; spellcheck post-processing; PDF/ODT from hOCR.
- **hOCR tree with collapsible branches** and an **output pane whose orientation (side/bottom) is user-arrangeable;** "quick navigation for low confidence words"; thumbnail view of source documents; multi-tab text output; sources shown as a tree; **batch export dialog**; prepend source filename+page number to plain-text output.
- **Tesseract-GUI:** pre-recognition image ops surfaced in UI — Rotate (correct skew), Crop (make columns), Contrast (sharpen edges), and "Generalize: apply changes to every image"; Auto-index for many images; Concatenate multiple results into one text file. This is a **preprocessing-and-batch toolkit as first-class UI** — highly aligned with a research-instrument product.

### 1.10 Research/humanities OCR interfaces: Scribe OCR, MNH ProSeek, mokuro
- **Scribe OCR proofreading mode:** editable OCR text is **layered precisely over the original image**, using a per-document generated font so errors are visually obvious; **low-confidence characters colored red**; Proofreading vs Ebook display modes. Positioning text over image allows proofreading "significantly faster".
- **MNH ProSeek text correction (two-pane, humanities crowdsourcing):** left = page image, right = OCR text; **every captured word highlighted in yellow on the image**, hover reveals block/line boundaries, double-click a word on the image selects it in the right-pane text; zoom in/out/Fit in left pane; wheel zoom; drag to pan.
- **mokuro (manga/OCR web demo):** OCR text boxes overlaid on pages, toggleable; **inline editable text boxes directly on the page**; page navigation via prev/next buttons, keyboard, or clicking screen edges; per-page view modes (fit-to-screen/width/original/keep-zoom); adjustable text font size; LTR/RTL page order — a compact, minimal, viewer-plus-overlay reference.

### 1.11 Minimal browser-OCR tools: OOCR, josephso.org demo, demo-document-parser
- **OOCR:** drop / paste (Ctrl-V) / pick; **"live bbox overlay… synced line-by-line to the readout"**; copy text / export .txt / searchable sandwich PDF; strong *privacy* framing ("image never leaves the browser"). Three-step flow: add image → model runs → copy or export.
- **josephso.org:** file input → language select → "Extract Text" button → textarea result. Plain but shows the minimal skeleton: input, language, trigger, output.
- **demo-document-parser (Vercel):** "Upload a PDF to get started / 0 documents processed" empty-state with **dashboard counter**; "Drag and drop your PDF here, or click to browse / Select PDF / Maximum file size: 10MB".

---

## 2. Upload Patterns

1. **Drop zone + click-to-browse as equal affordances** (Acrobat web, Vision demo, OOCR, ParseAI, demo-parser). The drop zone *is* the primary action; keep a visible "or click to browse" label.
2. **Clipboard paste as a first-class route** (OOCR: "Ctrl/Cmd+V … no file picker gymnastics"; gImageReader: import from clipboard/screenshot). For a researcher tool, Ctrl-V is often the fastest ingestion path.
3. **URL input as an alternative to file upload** (OCR.space "Paste url to source file") — users may hold documents on the web, not disk.
4. **State limits on the surface:** max file size, supported formats, page limits stated *before* upload (Vision demo 20 MB; demo-parser 10 MB; ParseAI ≤50 MB; OCR.space 5 MB). Reject early rather than silently at processing time.
5. **Upload accepts multiple files at once** for batch/queue building (gImageReader batch, ParseAI multi-upload, Textract Bulk Uploader).
6. **Empty-state that teaches:** "Upload a PDF to get started" + a processed-count ("0 documents processed") establishes the workspace metaphor.
7. **Sample/trial documents** ("Try a sample" — getomni.ai OCR demo) reduce cold-start friction and let analysts benchmark the engine against known content.
8. **Pre-ingestion check/confirm cycle for camera/scanned input:** live edge detection with color feedback, status text, auto-capture vs manual, crop handles, Retake/Keep-Scanning loop (CamScanner, Adobe Scan, Lens). For supported-by-file upload, the analog is a preview + an "adjust region / confirm" step.
9. **Progress in a non-blocking affordance** (Acrobat lower-corner dialog) rather than a modal; associate progress with the item in a queue, not with the whole window.

---

## 3. Viewer Patterns

1. **Two-pane source→text workspace:** image/scan on one side, recognized text on the other (ABBYY Image+Text windows; gImageReader "recognized text displayed directly next to the image"; ParseAI review panel; MNH ProSeek). This is the core layout of the requested product; the panes should be re-arrangeable (side-by-side vs stacked) as gImageReader allows.
2. **Page thumbnails / page strip** for multi-page navigation (ABBYY Pages window/Batch window as thumbnails or details; gImageReader source thumbnails; Adobe Scan page thumbnails). Click thumbnail to jump; thumbnails double as page-level status indicators (OCR done/pending/low-confidence).
3. **Zoom without clutter:** zoom in/out, Fit Page/Fit Width toggles, wheel-zoom, drag-to-pan (MNH ProSeek; ABBYY Zoom window; mokuro per-page view modes: fit-to-screen / fit-to-width / original / keep-zoom).
4. **Recognition-area visualization:** recognized blocks/words highlighted on the image — yellow for all words (MNH), color-coded areas (ABBYY blue blocks for text images), low-confidence highlighted red (Scribe OCR), live line-synced bbox overlay (OOCR).
5. **Hover reveals structure:** hovering image regions shows block/line boundaries (MNH) — cheap way to show what the engine found without permanent clutter.
6. **Click-through selection:** click/double-click a word *on the image* to select it in the text pane (MNH) — the inverse of text→image; powerful for proofreading.
7. **Keyboard + edge-click page navigation** (mokuro) as complement to thumbnail clicks; keep current page indicator synchronized.
8. **Quick view toggles for display density:** e.g., "overlay text on image" vs "clean text" (Scribe OCR proofreading vs ebook mode) — a mode switch that serves different users (verify vs consume).
9. **Overlay translated/annotated in place, matched to the source** (Google Lens font-matched overlay) — relevant only if the tool adds cross-lingual or character-variant overlays.

---

## 4. Editor Patterns

1. **Inline editable OCR results:** the text pane is editable text, not a read-only dump (ABBYY Text window edit + Verification dialog; gImageReader edit + spellcheck; Scribe OCR inline overlay edit; ParseAI inline field edit; mokuro editable boxes).
2. **Source-result pairing for interrupts:** editing the text should link back to the source region — per-paragraph/word anchors so the editor can "jump to source" (MNH highlight-on-select both directions; Appian highlighter). At minimum, mirrored scroll: "both pages are scrolled simultaneously and the identical fragments are always displayed side by side" (ABBYY compare).
3. **Low-confidence surfacing:** questionable characters/words highlighted (Scribe red; ABBYY behaviorally verified "unreliably recognized characters"; gImageReader "quick navigation for low confidence words"). For Bangla, low-confidence clustering is likely glyph-level — highlight glyphs, not whole lines.
4. **Proofreading mode that overlays text on image** (Scribe OCR) as an *alternative* editing surface; with a per-document font or accurate positioning, misrecognitions are visually obvious. (Fitting Bangla script to the overlay is a research challenge — note as open question, not blocked feature.)
5. **Spellcheck / dictionary as post-processing** (gImageReader, ABBYY Verification): spellchecker against a Bangla dictionary; "add to dictionary" to persist corrections.
6. **Approve/Reject with optional reason** for review items (ParseAI), plus inline correction; corrections double as training/ground truth data (AWS A2I "every correction becomes training data").
7. **Verification navigator:** an explicit tool that walks the user through uncertain words only (ABBYY Tools→Verification) — "review the 3% that matter" framing matches the research-instrument ethos.
8. **Keep the original extraction alongside corrections** (Scrim UI pattern: "Keep the extracted value under every correction — the audit trail is the point of the review pass") — avoids destroying evidence of the model's error.

---

## 5. Queue / Multi-file Patterns

1. **Explicit per-document state machine with human-relevant states** (ParseAI): pending → parsing → parsed → extracting → completed / pending_review / failed. Status is per item, shown in the queue row.
2. **Per-item progress and status badge:** color/icon status per document in a list/queue; the queue lane shows "2 done · 1 reviewing · 1 failed".
3. **Flagged items form a review queue, not a blocker** (AWS, OmniPATH "92% straight-through"): high-confidence auto-completes; only low-confidence items await a human — the queue *is* the review surface.
4. **Non-blocking parallel pipelines:** start all files, let the queue process independently; the user can open one done item while others run (Textract async job pattern generalized to UI).
5. **Batch-level operations mirror single-item operations:** rotate/delete/reorder many pages at once with Select-All (Adobe Scan); "Generalize: apply changes to every image" (Tesseract-GUI); shared metadata entered once for the batch (Acrobat).
6. **Thumbnails as queue tiles:** each queued doc shows a thumbnail + status + size/pages — thumbnails serve the list (gImageReader source thumbnails/tree).
7. **Retry affordance on failed items** (ParseAI `failed` → retry) plus a visible reason for failure (unsupported format, oversize, engine error).
8. **Dashboard aggregate counters** ("0 documents processed") as ambient progress (demo-parser, OmniPATH extraction summary 14/14 line items).
9. **Concatenate/merge outputs across the batch** (Tesseract-GUI Concatenate; gImageReader prepend source filename+page) — useful final-step pattern for an analyst who wants one file.

---

## 6. Export Patterns

1. **Destination chosen at save time, available anytime** (Microsoft Lens review complaint shows the anti-pattern: export-once-then-never). Keep export reachable from the workspace even after the item is no longer active.
2. **Format variants with a stated tradeoff** (Acrobat/ABBYY searchable PDF trichotomy; OCR.space visible vs invisible text layer): e.g., plain text (fastest/fidelity to text) vs searchable sandwich PDF (visual fidelity + invisible text) — the "research instrument" should offer `.txt`/`.md`/`.json` + searchable PDF.
3. **Structured export with per-element geometry** for downstream research use: JSON/CSV with word/page coordinates (Textract, OmniAI "returns every field with source coordinates"; OCR.space Json tab; gImageReader hOCR).
4. **Prepend provenance to concatenated output** (gImageReader: source filename + page prefix) — a killer research feature: multi-doc dump stays traceable.
5. **Export gating on unresolved review items** (Scrim UI: "disabled until every flagged field is confirmed") — with an explicit "export anyway" escape for convenience.
6. **Format targets that match the consumer:** OneNote/Word/PDF/email (Lens) or CSV/XLSX one-row-per-doc (ParseAI/TableFlow) — let the user pick the shape.
7. **Copy-to-clipboard as a first-class export** (Lens Copy bar; OOCR "Copy the text") — the most common "export" is a paste.

---

## 7. Settings / Advanced Panel Patterns

1. **Engine/model selection framed by speed/quality tradeoff, not codenames** (OCR.space Engine1/2/3). For a Bangla OCR web app: default engine recommended for Bangla, "alternate model — slower, better for handwriting/old scans", "fast preview" tier.
2. **Preprocessing filters offered as checkboxes before/among processing** (OCR.space: auto-rotate, auto-enlarge low DPI; Acrobat: deskew/descreen/background removal/sharpening). For Bangla scans: "deskew, binarize (B&W), upscale low-DPI, de-hyphenate?" Let the settings panel mirror the preprocessing vocabulary.
3. **Task-local options, not global bloat** (Acrobat Recognize Text dialog: page range + language + output). Advanced settings in a collapsible "Advanced" disclosure or separate settings panel; keep the main workspace clean (minimalist instrument aesthetic).
4. **Language = downloadable pack** (Adobe Scan language packs; Tesseract tessdata): show installed vs available languages; auto-detect as a default for Bangla+English mixed docs (ABBYY multi-language recognition).
5. **Explicit page-segmentation / area mode where it matters** (Tesseract PSM; gImageReader manual vs automatic recognition area): "auto / single block / region I drew" surfaced in advanced panel.
6. **Confidence & grounding controls:** per-field thresholds that route to review (Appian, Azure, Ocrolus); the analyst sets "flag below X%" — an advanced-but-values-driven control.
7. **Output defaults preselectable** (output format, concat mode, name/prefix, folder) — batch-repeatable settings for a recurring research pipeline (Tesseract-GUI generalize).
8. **Transparency tools:** raw engine output/JSON viewer for developers/analysts (Vision "Show JSON", gImageReader hOCR tree) — a research product should expose the hOCR/JSON layer, collapsible.
9. **Persistent, versioned settings with "backend defaults" reset** — the research-instrument version of "Restore defaults"; also expose engine versions used (reproducibility).
10. **Privacy/processing-locale choices where applicable** (region/data-region for OCR; "process entirely on device" framing from OOCR/Lens) — communicate where pixels go, since Bangla docs may be sensitive.

---

## 8. UX Anti-Patterns to Avoid

1. **One global confidence score for the document** (Scrim UI: "the smudged tax ID deserves the badge, not the invoice number"). Score at the finest meaningful unit (glyph/word/block), not the whole page.
2. **Overwriting the extracted value with the correction**, destroying the record of what the OCR originally said — keep raw + edited.
3. **Export enabled while unresolved low-confidence fields exist**, making the confidence UI meaningless; if you allow it, say so.
4. **Validation errors that surface only at export time**, far from the field that caused them (Scrim).
5. **OCR language fixed or hidden** and locked to a single script with no auto-detect (Lens-family complaint for Indic/CJK users); a Bangla app must allow Bangla+English auto and manual override.
6. **Opacity of engine/status** — user cannot tell whether an item is queued, running, or waiting on human action (mitigate with the ParseAI state machine).
7. **No save feedback** (CamScanner critique: "is the annotation saved?"). Any in-place edit/annotate action needs explicit saved/unsaved state.
8. **Export only immediately after processing** (Microsoft Lens complaint) — "get it later" is a common need.
9. **No folder/organization after capture** (Microsoft Lens complaint) — give the queue/document library stable grouping.
10. **Blocking modal progress for a long job** — use per-item asynchronous progress instead (Acrobat lower-corner; Textract async jobs).
11. **Silent thresholding** — preprocessing (binarization, deskew, upscale) applied invisibly can surprise analysts about fidelity; show what was done, allow override.
12. **Forcing constraint without explanation**: lockouts are good (CamScanner) only when feedback says *why*; pair disabled states with helper text.
13. **Fragmented reprocessing loop** — don't force users back to upload to re-run a job with different settings; keep the source image and permit "re-OCR with other settings" in place (gImageReader keeps image + hOCR tree paired).
14. **No model/engine version record on results** — a research tool must be able to say "this text came from model X vN" for reproducibility (tie into transparency section).

---

## 9. Transferable Pattern List (bulleted, concrete)

For the **two-pane document→text workspace**:

- Split pane: source image left, editable recognized text right; panes re-arrangeable, synchronized scroll (ABBYY; gImageReader; MNH ProSeek).
- Word/line boxes overlaid on the image, toggled by display mode; low-confidence glyphs/words tinted (MNH yellow-all; Scribe red-low-conf; OOCR line-synced bbox).
- Click word on image ↔ highlight word in text pane, both directions (MNH).
- Hover on image reveals block/line boundaries without permanent clutter (MNH).
- Thumbnail strip for multi-page docs; thumbnail tiles carry per-page status (ABBYY Pages window; Adobe Scan; gImageReader).
- Zoom: in/out, Fit Page / Fit Width, wheel zoom, drag-to-pan; per-page view-memory optional (MNH, ABBYY, mokuro).
- Display mode switch: overlay-on-image proofread view vs clean text view (Scribe OCR).
- Region-OCR: draw a box to recognize only that area; auto vs manual region (gImageReader).
- Verification navigator: walk only uncertain items (ABBYY; gImageReader low-confidence navigation).
- Keep raw OCR value visible under every correction (Scrim; AWS A2I audit trail).

For the **multi-file queue**:

- Per-item status state machine: pending → parsing → extracting → completed / review / failed (ParseAI).
- Queue lane with per-item progress + thumbnail + size + pages; processed counters (demo-parser; OmniPATH 14/14 line items).
- High-confidence auto-completes; flagged items enter a non-blocking review queue (AWS A2I; Azure; OmniPATH 92% STP).
- Open finished items while others process; retry affordance with failure reason on failed items (ParseAI).
- Batch operations mirror single-item ops: select-all reorder/rotate/delete/re-OCR (Adobe Scan; Tesseract-GUI Generalize).
- Enter shared metadata once per batch (Acrobat).
- Concatenate batch outputs into one file, prefixed with source name+page for provenance (Tesseract-GUI; gImageReader).

For the **settings/advanced panel**:

- Engine select framed as speed/quality tradeoff with recommendations (OCR.space Engine1/2/3).
- Preprocessing toggles (deskew, binarize, descreen, upscale low-DPI) exposed as checkboxes; applied state visible (OCR.space; Acrobat enhance set).
- Task-local options (language + output) in the main flow; deep controls (PSM, thresholds, engine version) in an Advanced disclosure (Acrobat; ABBYY).
- Language: auto-detect default plus manual override; installed vs downloadable packs (Adobe Scan; Tesseract tessdata).
- Confidence threshold control for what gets flagged for review (Appian; Azure; Ocrolus).
- Raw hOCR/JSON view for transparency and reproducibility, collapsible (Vision Show JSON; gImageReader hOCR tree).

For **upload & export**:

- Drop zone + click-to-browse as equal affordances; Ctrl-V paste; URL input; stated size/format limits pre-upload (all surveyed tools).
- Multi-file ingestion straight into the queue (ParseAI; gImageReader; Textract Bulk Uploader).
- "Try a sample" documents for benchmarking (getomni.ai demo).
- Export reachable anytime (not only right after processing); format variants with stated tradeoffs (.txt/.md, searchable sandwich PDF visible/invisible layer) (Lens; Acrobat; OCR.space).
- Structured export with per-element coordinates/JSON; CSV/XLSX one-row-per-doc (Textract; OmniAI; ParseAI; OCR.space Json).
- Copy-to-clipboard as first-class export (Lens; OOCR).

---

## 10. References

- Adobe — Scan documents to PDF (Acrobat): https://helpx.adobe.com/acrobat/desktop/create-documents/scan-documents-to-pdfs/scan.html
- Adobe — Improve scanned PDFs / scanned PDF settings (deskew, descreen, OCR options): https://helpx.adobe.com/acrobat/desktop/create-documents/scan-documents-to-pdfs/scanned-pdf-settings.html
- Adobe — Online OCR tool (select/drag-drop upload): https://www.adobe.com/my_en/acrobat/online/ocr-pdf.html
- Adobe — New Acrobat workspace experience: https://experienceleague.adobe.com/en/docs/document-cloud-learn/acrobat-learning/get-started/basics/new-experience
- CSUEB — Using the Scan & OCR feature in Acrobat (progress dialog): https://csueastbay.screenstepslive.com/a/1674353
- Google Cloud Vision — "Try it!" demo UI (20 MB limit, JSON viewer, tabs): https://docs.cloud.google.com/vision/docs/drag-and-drop
- Google Cloud Vision — OCR/how-to docs (language, formats): https://cloud.google.com/vision/docs/ocr
- OCR.space — Free online OCR UI (URL upload, checkbox preprocessing, engine select, Text/Json tabs): https://ocr.space/
- OCR.space — Free OCR API docs (engine variants, limits): https://ocr.space/ocrapi
- AWS Textract — Analyzing Documents (feature categories): https://docs.aws.amazon.com/textract/latest/dg/how-it-works-analyzing.html
- AWS Textract — Start/Document Analysis async job pattern: https://docs.aws.amazon.com/boto3/latest/reference/services/textract/client/start_document_analysis.html
- AWS — Customizing Textract with Custom Queries (console: bulk upload, annotation, review): https://www.amazon.com/blogs/machine-learning/customize-amazon-textract-with-business-specific-documents-using-custom-queries
- AWS Builder Center — Human-in-the-loop review system (split-pane review, tiered routing, inline edit): https://builder.aws.com/content/3HR4WZAl4gsTJ02TR1ACFzwJ2Gb/building-a-human-in-the-loop-review-system-for-ai-document-extraction
- CamScanner — product/flows (edge crop, enhancement, OCR languages): https://www.camscanner.com/
- Adobe Scan — devnet docs: Scan workflow, auto-capture, book scanning (iOS): https://www.adobe.com/devnet-docs/adobescan/ios/en/scan.html
- Adobe Scan — Modify scans (multi-page rotate/delete, reorder, cleanup, resume): https://www.adobe.com/devnet-docs/adobescan/ios/en/modify.html
- CamScanner iOS design critique (feedback, lockout, save-feedback gap): https://ixd.prattsi.org/2018/01/design-critique-camscanner-ios-app
- Microsoft Lens / Office Lens — MS Research blog (edge detect, correction, export): https://www.microsoft.com/en-us/research/blog/office-lens-snap
- Microsoft Office Lens Quick Guide (capture modes, save targets): https://cdn-dynmedia-1.microsoft.com/is/content/microsoftcorp/microsoft/final/en-us/microsoft-product-and-services/microsoft-education/downloadables/Microsoft-Office-Lens-Quick-Guide.pdf
- PCMag — Microsoft Office Lens review (modes, OCR flow): https://www.pcmag.com/reviews/microsoft-office-lens-for-android
- Capterra — Microsoft Lens reviews (folder/export complaints): https://www.capterra.com/p/193405/Microsoft-Office-Lens/reviews
- Google Lens — Android Central usage (tap to highlight, drag handles, Copy bar): https://www.androidcentral.com/google-lens-real-world-copy-paste
- Google Research — Lens reading capabilities (bounding boxes → lines, paragraph segmentation, word highlighting): https://research.google/blog/giving-lens-new-reading-capabilities-in-google-go
- GDELT — Chrome Google Lens integration (Text/Translate tri-state, in-place translation): https://blog.gdeltproject.org/visual-explorer-using-chromes-google-lens-integration-to-ocr-translate-onscreen-text
- ParseAI Docs — Documents platform (upload, statuses incl. pending_review, review panel, export CSV/XLSX): https://docs.parseai.org/platform/documents
- Parseur — OCR software overview (vision/text AI, field extraction): https://parseur.com/ocr-software
- Klippa (Doxis AI.dp) — IDP overview (upload batch, field selection, human-in-the-loop, output formats): http://klippa.com/en/dochorizon
- OmniAI (getomni.ai) — bank statements page (drag-drop upload, extracts with coordinates, validation): https://getomni.ai/documents/bank-statements
- OmniPATH — Intelligent Document Processing (extraction summary, STP %, field-level validation): http://omnipath.ai/intelligent-document-processing
- Azure Content Understanding — document analysis with confidence/grounding (per-field confidence, STP routing): https://learn.microsoft.com/en-us/azure/ai-services/content-understanding/document/analyzer-improvement
- Azure Vision in Foundry — OCR characteristics/limitations (WER, per-word confidence): https://learn.microsoft.com/en-us/azure/foundry/responsible-ai/computer-vision/ocr-characteristics-and-limitations
- Appian — Testing & Metrics (confidence threshold flagging, reconcile screen, highlighter tool): https://docs.appian.com/suite/help/26.6/aidc-4.2/metrics.html
- Ocrolus — Confidence score docs (per-field scores, review routing): https://docs.ocrolus.com/docs/confidence-score
- Scrim UI — Structured Extraction & Review pattern (per-field risk badges, audit trail, export gating): https://scrimui.dev/patterns/extraction-review
- ABBYY FineReader User's Guide v11 (Image/Text/Zoom/Pages windows, Verification dialog): https://static1.abbyy.com/abbyycommedia/6629/guide_english.pdf
- ABBYY FineReader PDF User's Guide v16 (OCR Editor, side-by-side comparison): https://help.abbyy.com/assets/en-us/finereader/16/Users_Guide.pdf
- UT Austin LibGuides — ABBYY FineReader editing/formatting (text editor alongside image): https://guides.lib.utexas.edu/abbyy-finereader/editing-formatting-text
- UIUC LibGuides — ABBYY intro (verify results step, uncertain chars highlighted): https://guides.library.illinois.edu/OCR/abbyygettingstarted
- gImageReader — GitHub README (import sources, batch, manual/auto region, hOCR, spellcheck): https://github.com/manisandro/gImageReader
- gImageReader — releases v3.4.0 (thumbnail view, batch mode, quick navigation for low-confidence words): https://github.com/manisandro/gImageReader/releases
- Tesseract-GUI (SourceForge) — rotate/crop/contrast, auto-index, concatenate: https://tesseract-gui.sourceforge.net/
- Scribe OCR — GitHub (proofreading mode, text over image, low-confidence red): https://github.com/scribeocr/scribeocr
- MNH Newspapers — OCR Text Correction screen (image left, highlighted words, click-through, zoom): https://newspapers.mnhs.org/help/image-(left-pane).html
- mokuro demo — page-view modes, editable boxes, navigation: https://kha-white.github.io/manga-demo
- OOCR — in-browser OCR (paste, live bbox overlay synced to readout, sandwich PDF): https://www.oocr.app/
- josephso.org — minimal OCR demo (input → language → extract → textarea): https://www.josephso.org/ocr.html
- Vercel OCR API demo — upload/queue empty state + limits: https://demo-document-parser.vercel.app/
- getomni.ai OCR demo — sample docs, drop/upload: https://app.getomni.ai/embed/ocr-demo

---

*Prepared for the Ordinary Chobi Reader design-research team. Companion inputs expected from B2 (workflow), B3 (wording/IA), and the engineering track.*
# Bangla Text Analysis for OCR Post-Processing

> **Document:** `docs/research/BANGLA_TEXT_ANALYSIS.md`
> **Author:** AGENT A2 (research)
> **Scope:** Research only — web research + analytic write-up. No application code.
> **Audience:** Ordinary Chobi Reader (Bangla-first OCR web application) — engineering team and downstream agents consuming this spec.
> **Objective:** Understand how Bengali/Assamese text is encoded, shaped, and mis-read by OCR, then deliver a **conservative, safe** set of post-processing rules that do **not** silently alter legitimate text.

---

## Table of Contents

1. [Bengali Unicode Primer](#1-bengali-unicode-primer)
2. [Glyph Formation and Shaping](#2-glyph-formation-and-shaping)
3. [Unicode Normalization Behavior on Bengali Text](#3-unicode-normalization-behavior-on-bengali-text)
4. [Common OCR Failure Modes by Category](#4-common-ocr-failure-modes-by-category)
5. [Confusable Glyph Table](#5-confusable-glyph-table)
6. [Segmentation Issues](#6-segmentation-issues)
7. [Post-Processing Recommendations: Safe vs Dangerous](#7-post-processing-recommendations-safe-vs-dangerous)
8. [Implementation Choices](#8-implementation-choices)
9. [Alternatives Considered](#9-alternatives-considered)
10. [Known Limitations](#10-known-limitations)
11. [Future Work](#11-future-work)
12. [References](#12-references)

---

## 1. Bengali Unicode Primer

Bengali (*বাংলা*) and Assamese (*অসমীয়া*) are written with the **Bengali script**, encoded in Unicode as the single block **U+0980–U+09FF "Bengali"**. The same block serves Bengali, Assamese, and minor languages (Bodo, Kokborok, Meitei, Santali historically). There is **no separate Assamese block**; Assamese differs mainly by using ৰ (U+09F0 BENGALI LETTER RA WITH MIDDLE DIAGONAL) and ৱ (U+09F1 ... WITH LOWER DIAGONAL) in place of র / ব in some word positions, plus the Ganda mark U+09FB.

The script is an **abugida (alphasyllabary)**: every consonant carries an **inherent vowel** /ɔ/ (or /o/), which is suppressed by the **virama / hasanta** (্, U+09CD) or changed by a **dependent vowel sign — কার / কারের চিহ্ন, also called মাত্রা**.

### 1.1 Code point inventory (U+0980–U+09FF)

| Range | Content | Notes |
|---|---|---|
| U+0981 | **Chandrabindu** (ঁ) | nasalization mark |
| U+0982 | **Anusvara** (ং) | nasal sign |
| U+0983 | **Visarga** (ঃ) | aspiration sign |
| U+0985–U+0994 | **Independent vowels** | অ আ ই ঈ উ ঊ ঋ ঌ এ ঐ ও ঔ (098D/098E/0991/0992 reserved) |
| U+0995–U+09B9 | **Consonants (35)** | ক খ গ ঘ ঙ চ ছ জ ঝ ঞ ট ঠ ড ঢ ণ ত থ দ ধ ন প ফ ব ভ ম য র ল শ ষ স হ |
| U+09BC | **Nukta** (়) | combining dot; base of ড় ঢ় য় |
| U+09BE–U+09CC | **Dependent vowel signs (কার)** | া ি ী ু ূ ৃ ে ৈ ো ৌ |
| U+09CD | **Hasanta / virama** (্) | kills inherent vowel; licenses conjuncts |
| U+09CE | **Khanda ta** (ৎ) | word-final "t" without inherent vowel |
| U+09D7 | **Au length mark** (ৗ) | right-hand part of ৌ |
| U+09DC–U+09DF | **Nukta-formed letters** ড় ঢ় য় | precomposed; canonically equivalent to base + nukta |
| U+09E0–U+09E3 | **Vocalic letters/signs** ৠ ৡ ৢ ৣ | |
| U+09E6–U+09EF | **Bengali digits** ০ ১ ২ ৩ ৪ ৫ ৬ ৭ ৮ ৯ | |
| U+09F0, U+09F1 | **Assamese ৰ ৱ** | |
| U+09F2, U+09F3 | **৲ ৳** (rupee mark / sign) | |
| U+09FA | **৺ Isshar** | superscript, line-end marker in manuscripts |

**Punctuation caveat:** Bengali sentence punctuation — **danda (।)** and **double danda (॥)** — live in the *Devanagari block*, at **U+0964** and **U+0965**, not in U+0980–09FF. Any Bangla punctuation normalizer should include U+0964/U+0965 in its Bangla scope. Modern Bangla typography also freely uses ASCII `,` `.` `:` `;` and `'`.

### 1.2 Combining marks and their visual placement

Dependent vowel signs attach to a base consonant and are placed **left, right, above, or below** the base:

| Placement | Bengali vowel signs |
|---|---|
| Left (pre-base, reordered by shaper) | ি (U+09BF), ে (U+09C7), ৈ (U+09C8), plus the ে-half of ো/ৌ |
| Right (post-base) | া (U+09BE), ৗ (U+09D7, last element of ৌ) |
| Above | chandrabindu and other nasal marks over the base |
| Below | ু (U+09C1), ূ (U+09C2), ৃ (U+09C3), sub-joined ৎ-forms, below-base র (র-ফলা) and য (য-ফলা) |

Two vowel signs are **two-part composites**: ো (o-kar) decomposes canonically as **ে (U+09C7) + া (U+09BE)**; ৌ (au-kar) as **ে (U+09C7) + ৗ (U+09D7)**.

### 1.3 Special combining forms (ফলা) and reph

- **রেফ / ৰেফ (reph)** — র followed by hasanta at syllable start (র্ + consonant); rendered as a curved mark above the following base or conjunct. ৰেফ/রেফ are spelling variants (Assamese/Bengali).
- **য-ফলা (ya-phala / j-phala)** — য as a sub-joined stroke under a base (e.g., in শ্য); glyph often bears no resemblance to standalone য.
- **র-ফলা (ro-phala / ra-phala)** — র as a sub-joined stroke under the base; frequently confused by OCR with ঞ, ৈ, ক.
- **ব-ফলা (ba-phala)** — ব as a sub-joined form (e.g., স্ব), again not resembling ব.
- **ল-ফলা, ম-ফলা (sub-joined)** — similar sub-joined variants.

---

## 2. Glyph Formation and Shaping

### 2.1 Logical order vs visual order

Bengali Unicode text is stored in **phonetic/logical order**: `base_consonant + vowel_sign + hasanta + consonant + vowel_sign + ...`

A text shaping engine (HarfBuzz in Chrome/Firefox/Safari; Uniscribe/DirectWrite in legacy Windows; CoreText in Safari/Keynote) performs per-syllable operations on that logical sequence:

1. **Decompose** two-part matras (ে+া → the pieces of ো).
2. **Reorder** left-side matras (ে, ি, ৈ, and the ে-half of ো/ৌ) to the visual start of the syllable.
3. **Reorder reph** (র্) to an above-base mark position.
4. **Apply GSUB**: replace `consonant + ্ + consonant` with a **conjunct ligature glyph** where the font has one; apply **half forms** (pre-base), sub-joined/ফলা forms, and Khanda-ta handling.
5. **Apply GPOS**: position marks (reph above, below-base forms under, above-base marks above).
6. **Final reorder** of remaining marks.

The Bengali specifics of the OpenType Indic shaper (`BASE_POS_LAST`, `REPH_POS_AFTER_SUBJOINED`, `REPH_MODE_IMPLICIT`, four matra placement classes) are documented by Microsoft and n8willis (see References). The essential takeaway for OCR:

> **The byte sequence an OCR emits is the logical sequence; the pixels it saw were visual glyphs.** A correct Bangla OCR must output *logical* order even when a mark appears to the left of its base in the image. A naive per-character OCR emitting marks in visual left-to-right scan order will produce e.g. `ে + ক` (matra before base), which is **invalid logical order** and will render differently or garble.

Correct logical encodings:

```
কি   = ক U+0995 + ি U+09BF          [i-kar renders LEFT of ক]
কো   = ক + ো U+09CB                 [o-kar renders on both sides]
কৌ   = ক + ৌ U+09CC
ক্ক  = ক + ্ U+09CD + ক              [conjunct or half form, one glyph]
ক্ষ  = ক + ্ + ষ                     [single conjunct glyph, unlike ক+ষ]
দ্য  = দ + ্ + য                     [ya-phala below]
র্য  = র + ্ + য                     [reph above + ya-phala below]
ব্রহ্ম = ব + ্ + র + া + হ + ্ + ম (final র -> র-ফলা below হ; see §2.2 note)
```

(Some clusters place র first in logical order to form reph and elsewhere place র last as র-ফলা; the shaper moves these. This is exactly why OCR byte order must be logical.)

### 2.2 Conjuncts (যুক্তাক্ষর) and what they cost OCR

Conjuncts ligate 2–3 consonants into a **single glyph** that can be visually unrelated to its parts (ক্ষ, ষ্ট্র, ঞ্জ, দ্ধ, ঙ্ক্ষ...). For OCR:

- **Segmentation fails first.** The headline (মাত্রা, the horizontal stroke across word tops) merges letters horizontally; conjunct glyphs resist splitting into components.
- **Class count explodes.** The Bengali Grapheme dataset counts **~167 consonant roots × ~11 vowel diacritics × ~7 consonant diacritics → up to ~14,784 theoretical classes**; a single root can appear in ~41 materially different shapes. State-of-the-art models therefore predict **root + vowel-diacritic + consonant-diacritic as separate targets** rather than flat character classes (e.g., Rabby et al. 2024; the Bengali AI Grapheme dataset and Bengali Handwritten Grapheme dataset).
- **Cluster-order confusions.** Model confusions are often between conjuncts sharing the first consonant (দ্ঘ / দ্দ / দ্ধ / দ্ব all begin with দ); on handwritten glyphs, 56.5% of top-level errors were among roots sharing at least one character, and 28.8% among roots sharing the first character.

### 2.3 Grapheme clusters and segmentation of units

Unicode extended grapheme clusters (UAX #29) are "a base letter plus its combining marks." Before Unicode 15.1, a Bengali conjunct was split into two clusters at the virama (`ক্` then `ক`). Unicode 15.1 introduced **Indic_Conjunct_Break = Linker for U+09CD** in Bengali, Devanagari, Oriya, Telugu, Gujarati, Malayalam so that `C + ্ + C` stays one cluster — provided the consumer implements the new UAX #29 rules (modern Chrome, Firefox, Safari do; the W3C Bengali Gap Analysis tracks engine status). Grapheme clustering does **not** perform Indic reordering — that is shaping, not segmentation.

Implication: an OCR pipeline that lets the *browser* render extracted text is fine — HTML/CSS with HarfBuzz will shape any correct logical sequence correctly. What the pipeline must **not** do is rely on `textContent`/`innerText` or pixel-to-glyph mapping to *recover* the logical order; the DOM contains logical order only if the OCR model already emitted it.
---

## 3. Unicode Normalization Behavior on Bengali Text

### 3.1 Canonical decompositions present in the Bengali block

| Character | Canonical decomposition | NFC behavior |
|---|---|---|
| ো (U+09CB) | ে (U+09C7) + া (U+09BE) | recomposed to ো — NFC unifies both spellings |
| ৌ (U+09CC) | ে (U+09C7) + ৗ (U+09D7) | recomposed to ৌ |
| ড় (U+09DC) | ড (U+09A1) + ় (U+09BC nukta) | **composition-excluded — NOT recomposed** |
| ঢ় (U+09DD) | ঢ (U+09A2) + ় | **composition-excluded — NOT recomposed** |
| য় (U+09DF) | য (U+09AF) + ় | **composition-excluded — NOT recomposed** |
| ৠ…ৣ (U+09E0–U+09E3) | ঋ + ় etc. | **composition-excluded — NOT recomposed** |

Key subtleties (critical for any normalizer):

- **NFC handles ো/ৌ automatically**: `ে + া` and `ো` both normalize to `ো`. Documents that look identical for o-kar collapse to one byte sequence under NFC. (Under NFD, both become `ে + া`.)
- **NFC does NOT unify nukta spellings.** `ড়` stays `ড়`, and `ড + ়` also stays `ড + ়` after NFC (UAX #15 §5.1 lists "many precomposed characters using a nukta diacritic in the Bangla/Bengali ... scripts" as composition exclusions). Two canonically-equivalent strings can both be in NFC and **differ byte-wise**. A Bangla normalizer therefore needs an **explicit project convention**: store the precomposed forms (ড় ঢ় য় ৠ ৡ ৢ ৣ), which are what fonts/GSUB assume; both spellings are *canonically equivalent* (provably identical appearance), so this conversion is safe.

### 3.2 What NFC / NFD / NFKC do on Bengali

- **NFC**: safe; recommended for storage + comparison. Folds ো/ৌ; leaves nukta precomposed forms alone. Never changes meaning or appearance.
- **NFD**: full canonical decomposition (base + nukta, ে + া forms). Safe as a *search/index key*; discouraged as the storage form because fonts and downstream tools expect precomposed characters and the decomposed form of nukta letters may not render as intended in some fonts.
- **NFKC/NFKD**: adds *compatibility* mappings. Pure-Bangla text has almost no Bengali compatibility decomposables, so NFKC ≈ NFC for Bangla letters. But NFKC also converts shared punctuation/whitespace (NBSP → space, curly quotes/soft hyphens removed, full-width Latin folded), which can be content-visible in mixed-script documents. **Apply only to an indexing copy, never to primary output.**

### 3.3 Practical equivalence contract for the pipeline

Normalization is **not closed under string concatenation** (UAX #15 §1.4): joining two NFC strings can create a non-NFC seam. Apply NFC *after* text assembly (per page/paragraph), not per OCR tile.

For every rule below, only two outcomes are permitted on the **primary (displayed/stored) text**:

1. **Canonical-equivalent transformations** — safe, apply automatically: NFC, explicit precomposed-nukta mapping, whitespace/line-ending collapse, BOM/control-character handling (narrow allowlist).
2. **Flagged, non-destructive annotation** — keep the original bytes; attach a machine-readable tag (`conf`, `rule`, `position`, `original`, `suggested`) so a downstream UI/user can decide. **Never auto-apply a rewrite that changes pronunciation, meaning, or glyph identity, and never drop a diacritic.**

---

## 4. Common OCR Failure Modes by Category

### 4.1 Vowel-sign (মাত্রা/কার) confusion

The most damaging error class — vowel signs are small, positional, low-contrast:

- **ি ি → ী / ু** — pre-posed i-kar vs post-posed long ī-kar vs below u-kar: at low resolution all three are tiny strokes/curls; a classic low-confidence zone.
- **ো → ৌ (and back)** — the two differ only in the right-hand element (া vs ৗ + curl); ৌ is routinely read as ো at small sizes.
- **ৃ vs ি** — ঋ-sign's small below-right element.
- **Stray/phantom vowel signs** — over-segmentation of the lower text zone hallucinates ি/ু where none exist in the source (see §4.3).
- **Broken two-part matras** — one half of ো/ৌ recognized, the other dropped → the model emits ে alone or া alone, changing the rendered word. The Pal–Chaudhuri survey explicitly flags split-modifier failure.
- **Missing or extra entire মাত্রা** — silent meaning change (কিল / কীল / কুল) and **not** recoverable by any safe rule.

### 4.2 Consonant confusion

Reported in literature for handwritten and printed Bangla: ক-খ, গ-ঘ, চ-ছ, ন-ণ, ব-ভ, ঘ-থ, ঢ-ণ, ত-স, য-য় (ya vs yya), ঔ-ঐ, ই-হ. Errors are strongly driven by **class-frequency imbalance**: rare graphemes (ণ, ঢ) get absorbed into frequent ones (ন), and conjuncts are confused along the leading consonant (দ্ঘ/দ্দ/দ্ধ/দ্ব).

### 4.3 Conjunct / cluster errors

- **Dropped (missing) hasanta** — ক্+ষ should be ক্ষ; OCR emits ক+ষ or ক+স; renders as separate syllables, corrupting reading.
- **Inserted hasanta** — a spurious ্ splits a cluster into a half-form + base, or turns কা into ক্+... typographic errors.
- **Broken ফলা** — য-ফলা/র-ফলা/ব-ফলা/রেফ dropped, or emitted as a full standalone consonant (য instead of ্য); e.g. শ্য → শয.
- **Khanda ta (ৎ)** — emitted as ত+্ (renders similarly in some fonts) or dropped entirely; ৎ is composition-stable (no mapping) — a normalizer must not fuse ত+্ → ৎ without consent.
- **3-consonant clusters** (ক্ষ্ণ, ষ্ট্র): models emit a long or partial conjunct; both are hard errors even for the best Bangla recognizers.

### 4.4 Numerals

- **৭ vs ৮** (and ৩/২, ৫/৬ at low resolution) — digits are frequently the salient content (dates, page numbers, amounts); numeric errors are silent and dangerous.
- **Dateline figures** — Bengali newspapers set dates in Bengali digits (০-৯); OCR mixing Bengali and Latin digits within one document is common.
- **২ as a lower-modifier lookalike** in newsprint (per BRACU lower-modifier work, the glyph ২ is a common false lower-modifier container).

### 4.5 Repetition and decorational marks

- Bengali normally has **no dedicated repetition (ditto) mark** in modern prose; reduplication is fully written out. Older letterpress occasionally uses ২ (numeral two) superscripted, or the danda as a quasi-ditto, which OCR misreads. Treat a lone "সংযোজন"-style ২ as *word* context, never auto-expand.
- **Ishshar (৺ U+09FA)** and **Avagraha (ঽ U+09BD)** appear in older/religious texts and are almost never segmented correctly.
- **চন্দ্রবিন্দু (ঁ)** dropped by OCR — silent nasalization loss (বাঁধা → বাধা).

### 4.6 Punctuation corruption

- **danda । mis-segmented** as ভা-না or as digit ১; **danda vs comma/colon confusion** at low resolution (a danda is a vertical bar, a comma a hook) — reported in practice and in the OCR-adjacent literature.
- **Colon vs semi-colon vs danda**: thin vertical runs get merged into the preceding cluster.
- **Opening/refutation quotes** („, „) special Bangla quote „" — typographic quotes „ and " are frequently dropped.

### 4.7 Line mixing and reading order

- Multi-column Bangla (newspapers, magazines, dictionaries) confuses the reading order: a row-wise scan interleaves columns. Column-wise recovery requires layout analysis, not text post-processing.
- Line-touch errors: the Shirorekha/matra headstroke of a line touching the top of the next merges lines; **line mixing** then yields word fragments that normalizers must NOT try to merge heuristically.

---

## 5. Confusable Glyph Table

Pairs below are drawn from the cited literature (CMATERdb analysis, Bengali CharNet, Bengali Grapheme dataset error analysis, Hasnat & Khan 2009, Frontiers 2025, and general newsprint knowledge). Confidence column distills how *reported* the pair is; treat every substitution as **flag-only** in post-processing.

| # | Confused pair(s) | Direction bias | Typical cause | Reported confidence |
|---|---|---|---|---|
| 1 | া / ি / ী / ু (vowel signs) | all directions | tiny marks, print quality, font | very high (anecdotally) |
| 2 | ো / ৌ | ৌ→ো | right-element curl invisible at small size | high |
| 3 | ি / ে / ৈ pre-posed signs | ি↔ে↔ৈ | stroke length/position of the left mark | high |
| 4 | ক / খ / গ / ঘ | ক↔খ, গ↔ঘ | single stroke vs second stroke at headline | high (reported) |
| 5 | চ / ছ | চ↔ছ | curl direction under the head | medium |
| 6 | ন / ণ | ণ→ন (rare→frequent) | class imbalance; stroke at baseline | high (reported) |
| 7 | ব / ভ | both | loop size / bottom stroke | high (reported) |
| 8 | ঘ / থ | both reported | loop under matra, similar curvatures | medium |
| 9 | ঢ / ণ; ঢ / ২ | often→ণ | bowl shape / stem position; lower zone | medium |
| 10 | ত / স | both reported | horizontal contact strokes | medium |
| 11 | য / য় (ya vs yya) | য়→য | nukta dot invisible at low res | high |
| 12 | য / জ; ড় / ণ | various | curve + dot ambiguity | low–medium |
| 13 | ই / হ | both | curved initial stroke (Grapheme dataset) | medium |
| 14 | ঔ / ঐ | both | no shared stroke but similar size/curve | medium |
| 15 | ৭ / ৮, ৩ / ২, ৫ / ৬ | ৭↔৮ | open vs closed head at low res | medium |
| 16 | ফলা visuals: র-ফলা / ঞ / ৈ / ক | any→that stroke | ro-phala stroke vs these glyphs | high (Hasnat & Khan) |
| 17 | ৎ (khanda ta) / ত + ্ | ৎ→ত্ | identical look in many fonts | high |
| 18 | ং (anusvara) / ; (semi) | drop both | thin punctuation and dot lost | medium |

Additional structural traps (not a single-pair confusion): the **matra headline** merges akhand clusters; **„" quote pairs**; the **Avagraha (ঽ)**; and **IsBangla ৺** rarely segmented.

---

## 6. Segmentation Issues

1. **Headline / শিরোরেখা**: the horizontal line joining letters at word top makes character-cut segmentation near-impossible below the line; glyph identity lives in the descender zone. This is why modern Bangla OCR is **grapheme/world-recognition first** (whole-word CNN/attention), not "segment then classify."
2. **Lower-modifier over-segmentation**: BRACU's 1999–2009 line of work (Hasnat & Khan) shows the lower text zone (া ো ৌ ু ূ ৃ and the ফলা forms) is where most segmentation errors accumulate: over-segmentation (phantom lower modifiers) is unavoidable with cut-line approaches.
3. **Conjunct segmentation**: a conjunct is one glyph but several characters; the OCR must either (a) recognize the conjunct as a root-class in a multi-target model or (b) split it, which typically breaks the parts.
4. **Grapheme-cluster boundary**: with UAX #29 Unicode 15.1 rules, C+্+C clusters stay together; older Unicode data splits them. Tooling must be built on a Unicode 15.1+ version of the segmentation tables for Bengali.
5. **Word boundaries**: Bangla uses spaces between words like Latin; no post-processing revision of word boundaries is safe (OCR merges/splits words routinely but re-segmenting risks reorganizing text).
6. **Multi-column / reading order**: layout-level, out of scope for a text-only post-processor.
---

## 7. Post-Processing Recommendations: Safe vs Dangerous

### 7.1 Design principle

Drive post-processing from **what the Unicode + orthography guarantees**, not from language statistics. Split every rule into one of three tiers:

| Tier | Behaviour | Applies automatically? |
|---|---|---|
| **A — provably safe** (canonical/text-level) | equivalence-preserving transformations | yes |
| **B — flagged advisory** (orthotactic checks) | detectors attach a tag; they may *offer* a fix, but never change bytes without a confirm | detect + tag only |
| **C — dangerous** | dictionary/LM "correction", diacritic deletion, digit translation, visual reordering | never in the OCR path |

### 7.2 Tier A: safe, run unconditionally

1. **Decode to Unicode; drop BOM** and stray zero-width control chars (U+FEFF inside text), normalize all line endings to `\n`, and strip invalid surrogate sequences.
2. **NFC normalization** on the assembled page (assembly *first*, normalize *after* — see §3.3). This folds the ো/ৌ double-spelling to single spellings.
3. **Explicit precomposed-nukta convention**: map `ড+় → ড়`, `ঢ+় → ঢ়`, `য+় → য়`, `ঋ+় → ৠ`-family — a *canonical* equivalence, safe, gives one byte form for storage. Keep the mapping on NFD too as "bn_ngta_nfd" index key.
4. **Whitespace/newline normalization**: collapse runs of spaces/tabs to a single space; trim trailing whitespace; normalize at page boundaries. Do this only at *sentence/paragraph* granularity, and AFTER column-splicing, so OCR tile seams don't leave phantom gaps.
5. **Control character stripping** (`U+0000–U+001F`, `U+007F`) — but NEVER strip `U+200C ZWNJ` / `U+200D ZWJ` automatically (see Tier B), and keep `U+200B` handling flagged.
6. **Preserve ZWNJ/ZWJ byte-for-byte in the stored text** (they alter conjunct vs non-conjunct rendering); if the OCR engine never emitted them, do not synthesize them.
7. **Danda/double-danda**: normalize only the *whitespace around* them (zero-width), never the marks themselves.

### 7.3 Tier B: orthotactic checks — detect, tag, do NOT rewrite

All tags carry `{rule, conf: HIGH|LOW, position, original, suggested}`. Suggested values are advisory; they are auto-applied ONLY in an explicitly-flagged "review mode" UI, one at a time.

| Rule | Condition (invalid in standard Bangla orthography) | conf | Suggested (advisory) |
|---|---|---|---|
| VV1 vowel-sign after vowel-sign | vowel-sign immediately after a vowel-sign, **except** the canonical pair ে+া (= ো) and ে+ৗ (= ৌ) | HIGH | drop the second sign only if it duplicates the first (াা, ুু…) |
| VV2 broken two-part matra | lone ে or া or ৗ in a cluster that would form ো/ৌ (detectable only with a conjunct table) | LOW | none (require user) |
| VIR1 virama after vowel-sign | hasanta follows a vowel sign | HIGH | remove the hasanta |
| VIR2 leading virama | hasanta at word start | HIGH | remove |
| VIR3 trailing virama at word end | word-final ্ before space/punct | HIGH | remove (typographic artifact, cf. bnunicodenormalizer) |
| VIR4 virama before vowel-sign | ্ before া/ি/… (breaks cluster) | HIGH | drop the virama |
| MRK1 matra before base (**visual order**) | i/e/ai sign (ি ে ৈ) that the OCR emitted *before* a consonant base with no valid preceding base | HIGH if only one candidate base follows | swap with the single following base; else LOW + no suggestion |
| NKT1 nukta context | নুক্তা on a consonant that never takes it (e.g., ক়) | HIGH | drop with user confirm |
| KTA1 khanda-ta | ৎ used non finally, or ত+্ where ৎ would be standard-final | LOW | none |
| DGT1 cross-script digits | Bengali digit adjacent to Latin digit within one token | LOW | none |
| PM1 punctuation collapse | `।` immediately followed by `,` or `.` doubles | HIGH | dedupe punctuation |
| PM2 comma/colon/danda | `,` vs `:` vs `।` ambiguity — only flag if OCR conf-score < threshold | LOW | none |
| MIX1 token script mixture | Latin digits/words inside a Bangla token and vice versa | LOW | none |

The virama adjacency checks (VIR1–VIR4) are the single most valuable family: stray/phantom হসন্ত is the signature of conjunct errors in (a) and (b) of §2.2, has very high-precision micro-statistics, and is *nearly* always a safe removal — but keep it in Tier B because a "trailing hasanta" can be a legitimate half-form display when ZWJ follows.

**Rule of thumb for every Tier-B check**: if keeping the original text is semantically neutral and the fix is not provablyness-preserving, you keep the original and emit the tag.

### 7.4 Tier C: never run in the OCR output path

1. **Spell correction / dictionary voting / LM rescoring** (Levenshtein+dictionary, character-group "Dissimilarity Matrix", n-gram selection): great search-side, destructive as transcription. Bangla is highly inflectional; "fixing" a word is usually guessing.
2. **Aggressive Unicode "normalizer" such as stripping consonant diacritics or deleting "invalid" sequences wholesale** — the LREC-COLING 2024 Bangla normalizer removes connectors/vowel-signs aggressively; that is fine for corpora and search, but **not** for faithful OCR output. If used, run it on the *index copy* only and record a provenance tag.
3. **Digit translation ০-৯ → 0-9** (or back) — destroys source fidelity (dates, amounts). Offer as an explicit export option.
4. **Codepoint "visual reordering"** — converting logical to visual order, or guessing at রেফ/গুলো placement to insert invisible marks — both change byte meaning without pixel evidence.
5. **Khanda-ta fusion / ত+্ → ৎ** without consent; **nukta insertion** («doubtful dot») — never invent a nukta that isn't visibly present.
6. **CROSSWORD/contextual spelling that changes pronunciation** (e.g., swapping ভ/ব, ট/ঠ in a word) even with HIGH conf — the only acceptable use is an interactive "suggest edit" list.

### 7.5 Confidence flag model

Per §7.3 tags: `conf` ∈ {HIGH, LOW}. HIGH = orthotactically impossible in standard Bengali (e.g., vowel-vowel, leading/trailing virama, virama-after-vowel); LOW = possible-but-rare or shape-dependent (two-part matra halves, cross-script, danda/comma). Every tag carries `original` and `suggested`; the diff is always lossless (bytes preserved).

---

## 8. Implementation Choices

| Concern | Recommended | Why |
|---|---|---|
| Canonical normalization | Python `unicodedata.normalize('NFC', s)`; Java/Kotlin `Normalizer.normalize(s, Form.NFC)`; ICU `Normalizer2.getNFCInstance()` | W3C-recommended storage form; folds ো/ৌ |
| Grapheme-boundary-safe iteration | ICU `BreakIterator`/`Normalizer2.getNFCInstance()`, `regex` module `\X` (UAX #29 15.1+) or `Intl.Segmenter` in JS on a Unicode 15.1+ runtime | keeps C+্+C together, reph/matra marks attached |
| Bangla-language orthotactic checks | hand-rolled FSM on the tables in §7.3 (~200 lines) | no dictionary needed; deterministic |
| Conjunct "license" table (advisory) | derive from Avro keyboard's conjunct list or from the Grapheme dataset roots; used only for VV2/LOW suggestions | optional |
| Shaping/rendering | let HarfBuzz in the browser do all shaping; never reorder in the backend | HTML/CSS render correctly given logical input |
| Provenance/audit | sidecar JSON with `{page, tile, rule, conf, position, original, suggested}` | enables the "review mode" UI |
| Storage of Unicode version | pin a Unicode version (15.1+) in the build for segmentation tables | avoids conjunct-splitting regressions |

Python descriptor: `nfc = unicodedata.normalize('NFC', text)`; a `bn_nukta_precompose(text)` step; a regex-based detector for the VIR/VV families; `regex` module (`pip install regex`) with `\X` for cluster iteration, or ICU via `PyICU`.

---

## 9. Alternatives Considered

1. **Do nothing** — ship raw OCR text. Simple, zero risk of altering content, but no normalization: ো/ৌ double spellings, BOM/control artifacts, phantom hasanta, VIR/VV errors all flow through to users and search. Not acceptable for a product claiming Bangla-first quality.
2. **Full Bangla normalizer (bnunicodenormalizer-style, LREC-COLING 2024)** — cleans aggressively (removes connectors, fixes diacritic sequences). Great for building clean ML corpora; risks silent alteration of ambiguous-but-legit OCR output (e.g., removing an actual ্ halves a numeral-conjunct). Used only as an index-side transform by this project.
3. **Dictionary + character-group correction** (Levenshtein, Dissimilarity Matrix, LM-based) — improves reading of *known* words by rewriting *recognized* words; destroys rare/proper/inflected words; relegated to Tier C.
4. **Devanagari-style solution: strip matra then pattern-match** — Bangla conjunct inventory is denser; pattern-matching without a conjunct table underperforms; kept as LOW-only advisory.
5. **Tesseract/legacy Ṣhawna-profiles trained on character cut-outs** — bypassed by modern grapheme-root + diacritic multi-label models (per the 2024 WACV Bengali OCR paper), which is the upstream that makes the Tier B checks cheap.

Recommendation: **Default = Tier A only. Tier B = always tag, never auto-apply (opt-in "review mode" UI). Tier C = never.** Provide per-page provenance so "what did the machine change" is always answerable.

---

## 10. Known Limitations

1. **No standardized eval for printed Bangla OCR** across fonts/engines; per-system error statistics (esp. for vowel signs) are mostly anecdotal or dataset-specific.
2. **Composition-excluded nukta letters** mean NFC alone won't unify → our explicit convention must be maintained project-wide; other teams could regress it.
3. **Mixed-script**: Bengali + Latin + Bengali digits in one page means raw grapheme counts and the "word" concept change per script; Tier-B orthotactic rules are Bengali-specific and quiet for Latin spans.
4. **Assamese overlap**: the same block; র/ব → ৰ/ৱ replacements and dialectal orthographs (ক্ষ = খ্য in Assamese orthography vs Bangla) are *not* handled by any safe rule — keep both spellings.
5. **Handwriting / low-quality scans**: VIR/VV rules still apply, but confidence timescale shrink; LOW suggestions are nearly useless for handwriting.
6. **Font dependence**: shapes of র-ফলা/য-ফলা differ across fonts (Lohit vs Noto vs SolaimanLipi); pixel-derived confusion tables (§5) are font- and OCR-model-dependent; the neutral post-processor must not encode font-specific rewrites.

---

## 11. Future Work

1. **Corpus-driven confusion matrix** per OCR engine (Confusion/Match matrix) — feeds better `conf` priors and sustains a "learning confusables" map without auto-rewrite.
2. **Conjunct license FSM** over the full Bengali conjunct inventory (from Avro-style license tables) — upgrades VV2/конjunct-split checks from LOW to HIGH where no license exists.
3. **Grapheme-level diff/render display** in the review UI (original vs suggested rendering) using the browser's HarfBuzz — the safest human-in-the-loop correction loop.
4. **Per-font and per-resolution calibration** of the confusable pairs in §5, so flags reflect the actual print medium.
5. **Unicode 15.1+ grapheme cluster integration tests** for Bengali (C+্+C retention, reph cluster) pinned into CI.
6. **Normalization provenance** — emit an "ocr:norm" URN-style chain (engine → NFC → bn_nukta_precompose → tags) to satisfy audit requirements and reproducibility.
7. **Safety net for Tamil-confusable danda**: measure expected danda-frequency per source type and only flag outliers.

---

## 12. References

1. Unicode Consortium, *Bengali* code chart (U+0980–U+09FF). https://www.unicode.org/charts/PDF/U0980.pdf
2. Unicode Standard Annex #15, *Unicode Normalization Forms* (incl. script-specific composition exclusions §5.1, non-closure §1.4). https://www.unicode.org/reports/tr15/
3. Unicode Standard Annex #29, *Unicode Text Segmentation* (Indic_Conjunct_Break / Linker for Bengali virama since Unicode 15.1). https://www.unicode.org/reports/tr29/
4. Unicode FAQ on Normalization. https://www.unicode.org/faq/normalization.html
5. Microsoft, *Bengali Script Development* (OpenType shaping; matra/reph half-forms; reordering). https://learn.microsoft.com/en-us/typography/script-development/bengali
6. n8willis, *OpenType shaping for Bengali* (Indic shaper categories; LEFT/RIGHT/TOP/BOTTOM matra classes; REPH ordering). https://github.com/n8willis/opentype-shaping-documents/blob/master/opentype-shaping-bengali.md
7. W3C, *Bengali Gap Analysis*. https://www.w3.org/TR/beng-gap/
8. Pal & Chaudhuri (2004), *A survey on optical character recognition for Bangla and Devanagari scripts*, Sadhana 38(1):133–168. https://www.ias.ac.in/article/fulltext/sadh/038/01/0133-0168
9. Hasnat, M.A. & Khan, M. (2009), *Rule based segmentation of lower modifiers in complex Bangla scripts*, BRACU. http://hdl.handle.net/10361/338
10. Omee (2012), *A Complete Workflow for Development of Bangla OCR*. https://arxiv.org/abs/1204.1198
11. Ansary et al. (LREC-COLING 2024), *Unicode Normalization and Grapheme Parsing of Indic Languages*. https://aclanthology.org/2024.lrec-main.1479/
12. Rahman et al. (2020), *A Large Multi-Target Dataset of Common Bengali Handwritten Graphemes* (Bengali.AI). https://arxiv.org/abs/2010.00170
13. Zulkarnain et al. (2023), *bbOCR: An Open-source Multi-domain OCR Pipeline for Bengali Documents*. https://arxiv.org/abs/2308.10647
14. Rabby et al. (2024), *Enhancement of Bengali OCR by Specialized Models and Advanced Techniques*, WACV-WVLL 2024. https://openaccess.thecvf.com/content/WACV2024W/WVLL/papers/Rabby_Enhancement_of_Bengali_OCR_by_Specialized_Models_and_Advanced_Techniques_WACVW_2024_paper.pdf
15. HarfBuzz, *Working with HarfBuzz clusters*. https://harfbuzz.github.io/working-with-harfbuzz-clusters.html
16. Frontiers in Big Data (2025), *Enhancing Bangla handwritten character recognition using ViT/VGG/ResNet* (confusion pairs ক-খ, ন-ণ). https://www.frontiersin.org/journals/big-data/articles/10.3389/fdata.2025.1682984/full
17. BRACU thesis (2024), *Bengali CharNet evaluation* (ব-ভ confusion). https://dspace.bracu.ac.bd/xmlui/bitstream/handle/10361/24364/23141083_CSE.pdf
18. Hasan, Pal & Ahsan (IEEE SPICSCON 2024), *Enhancing Bangla Language Text Recognition in OCR Using Levenshtein Distance and Character Grouping*. https://doi.org/10.1109/spicscon64195.2024.10941489
19. BORCAi, *Dissimilarity Matrix: Bridging the Gap of Bangla OCR Error Correction* (2023). https://sah.borca.ai/papers/268708499
20. ICU Project, *User Guide: Unicode Normalization*. https://unicode-org.github.io/icu/userguide/transforms/normalization/

*Referenced in text but not a citation target: OmicronLab "Avro Keyboard" (Bangla phonetics/licensing table reference for conjunct lists).*
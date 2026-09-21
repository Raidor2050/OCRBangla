# B3 — OCR Animation & Processing-State Design Research

**Researcher:** Agent B3 (research team)
**Product:** Ordinary Chobi Reader — Bangla-first OCR web application
**Scope:** Visual treatments for technical/scanning/processing states that communicate *intelligence without being flashy*: scan/read animations, region-detection overlays, progressive text reveal, staged pipeline progress, motion tokens, reduced-motion fallback.
**Date:** 2026-09-21
**Status:** Research findings + spec recommendations (no application code)

---

## 1. Principles

These principles are the filter every recommendation below passes through. They are derived from the studied references in §2.

1. **Motion must map to real work.** Every animation corresponds to an actual pipeline signal (a stage callback, a detection event, an OCR crop). No autonomous "ambient AI" loops. The **Evil Martians CLI article** makes the sharpest version of this point: a spinner should only tick when a unit of work actually completes — that is what tells users the process is alive *and* when it is stuck.
2. **Honesty over theater.** Faked percentages erode trust in *all* progress bars the product ever shows afterward (UI Snippets "Loading States"). Show determinate progress only when real numbers exist; otherwise show stage states, not invented fill.
3. **Restraint is the brand.** Restrained, precise, technical. The scanner-beam family (SpectreUI, shadcn, UploadScannerFrame) reads as "intelligent" precisely because it stays thin, low-contrast, and mechanical — not glowing, shimmering, or blooming.
4. **The motion is the state machine.** Visuals derive 1:1 from a small set of pipeline states (idle → detecting → reading → recognizing → done). There is exactly one emphasized element at a time.
5. **Bangla is a complex script — never reveal per character.** Contextual shaping means conjuncts and the headline (মাত্রা) must stay intact; per-char reveals break shaping (the same warning applied to Arabic in Appica's `TextAnimate`). Reveal by line or word.
6. **Respect the user's system.** `prefers-reduced-motion` is non-optional. It degrades *state* to instant *snaps*, not to nothing (state changes must still be perceivable).

---

## 2. Studied References

| Family | Sources studied | What to take |
|---|---|---|
| Scanners (line sweep) | UploadScannerFrame (Stripe Identity-style: corner brackets + sweep line + verified state, `aria-hidden`, pauses on reduced motion); SpectreUI ScanBeam (opacity 0.05–0.30, speeds 1.5/3/6 s); LabrysScanner thumb (Flutter: beam / laser / gradient styles, ~2 s sweep, `linear` vs `easeInOut` curves); shadcn "scanner beam sweep grid" (2.5 s per-cell advance, hover pause); 21st "Animated Scan Loader"; CSS scanline simulation gists | Thin 1–2 px beam, linear constant velocity, low opacity, decorative + `aria-hidden`, sweeps only while work is active, stops at rest on completion / reduced motion. |
| Camera/edge detection | Adobe Scan docs ("Looking for document" → "Capturing … hold steady" → "No document found"; live edge boundary detection with **blue corner dots**); Simform React-Native scanner animation (shaded frame + corner brackets + moving line) | Detection is a *search state* that outputs a settled frame. Explicit textual states alongside the visual. Corner anchors are the strongest detection cue. |
| ML/detection overlays | Meta SAM API client docs (`maskFillOpacity` default **0.35**, `maskOutline.opacity` default **0.8**, cumulative streaming so overlays "stream in"); `gradio-sam-prompter` (mask alpha ~0.4, color-coded objects, box prompts, processing lock during inference); `gradio-detection-viewer` (bboxes with labels + confidence scores, toggleable layers) | Region overlays reveal progressively as results stream; restrained fill (0.3–0.4 is heavy → we recommend lower); labels ride the box; overlay updates are cumulative, never cleared-and-flashed. |
| Progressive text reveal | Appica `TextAnimate` (**per-char breaks cursive/contextual scripts — use word/line**; `sr-only` full copy + `aria-hidden` units; reduced-motion snaps to static legible frame); `reveal-text` (stagger ~50–60 ms, duration ~500 ms, fade-up); prompt-kit Response Stream (typewriter vs fade mode); toui / SATIS UI (word/line/char units, 30–80 ms stagger) | Line/word fade-up with 40–60 ms stagger is the honest "text being recognized" read. Never char-level for Bangla. Keep DOM screen-reader-clean. |
| Staged / honest progress | USWDS step indicator (segments, counters, `aria-current`, concise label guidance); r-lib `cli` `progress_step` (discrete named steps, auto success/failure); Evil Martians CLI UX (**X of Y beats spinner; spinner ticks-per-completed-unit; switch gerunds to past tense when done**); rich-stepper / Velocity UI multi-step loaders (~2 s per step, blur/fade distance cues); GitHub Actions run view (`gh run view`, job/step state lists, "log-failed"); gh-aw PR #8731 (progress bar tracks the *actual bottleneck*, text fallback when non-TTY); narrative-loader (debounce + minimum visible duration, no flicker, timelines `after:` 2500/7000 ms) | Stages as short labeled states driven by real pipeline events; current stage the only emphasized one; gerund→past-tense on completion; no flicker (debounce/coalesce); minimum dwell; bar tracks real bottleneck. |
| Motion tokens | M3 easing/duration tokens (50–1000 ms, 16 durations; `cubic-bezier(.2,0,0,1)` standard); Carbon (`70/110/150/240/400/700 ms`); UI Craft docs (fast 120 / base 200 / medium 280 / slow 400 / slower 600; **exits ≈ 75% of entrance**; *linear only for loading loops*); DesignSystems.one (5 durations, 4 easings, ~6 pairings in production; **token-level reduced-motion override to 0 ms**); Carmen Ansio motion tokens (enter decelerate / exit accelerate pair; spring only for positive feedback); raxxo three-tier tokens (primitives→semantic→component; stagger via calc) | Small duration scale, semantic tokens, exits faster than entrances, linear reserved for loops, one emphasized thing at a time. |
| Reduced motion | CSS patterns (Animation Patterns fill-sweep: *pin the filled state under reduce*, don't delete the result); dev.to Raxxo (prefers-reduced-motion as token override — shorten to ~100 ms linear, collapse stagger to 0, not a global kill switch); SmoothUI / narrative-loader (respect reduced motion); M3 / A11y guidance | Reduce = instant-but-complete state snap. Loops stop on a static meaningful frame. Kept: geometry, color, state text. Removed: repeated transform/opacity cycles. |
| Technique (CSS) | CSS-Tricks sliding background (**transform is GPU-composited; background-position is not**); Coder's Block gradient trick (oversized `background-size` + animate `background-position`); shimmer skeleton patterns (200% sized gradient, band = gradient sweep, **swap must preserve layout exactly**) | Sweep via `transform: translateY` on its own layer is the compositor-friendly choice for a beam; `background-position` cheaper for single non-looped paint states but repaint-heavy at scale; mobile Safari is sensitive. |

---

## 3. Scan Animation Spec ("the sheet being read")

**Concept:** A thin horizontal beam reading the page top-to-bottom, exactly like a paper scanner head / fax beam — constant velocity, mechanical, no glow.

**When it runs:** only while Pipeline stages `Preprocess` and `Layout` are active (§6). It is *not* an idle ambient animation; when nothing is processing, the beam sits at rest (or is not shown).

**Spec:**

| Property | Value | Rationale |
|---|---|---|
| Beam | 1–2 px rule, full page width | A scanner head is a line, not a zone. |
| Color | Neutral-on-surface accent (e.g. steel `oklch(70% 0.05 250)`), avoid saturated neon | Restraint. |
| Opacity | 0.35 center, gradient falls off to 0 over ~12% height above/below | Leading/trailing edge reads as motion direction. |
| Motion | `translateY` from page top → bottom, **`linear`** easing (constant velocity) | Physical scanner heads move at constant speed; `linear` is the honest easing for loops/continuous travel per UI Craft docs. |
| Sweep duration | **1200–1600 ms** one pass | Within Spectre's "normal" band (3 s full) × short page; stays under 1.6 s maximum sweep. |
| Passes | Max 2 passes per stage, then beam parks at final line | Repeated looping reads as fake/ambient. |
| Heady edge cue | 1 px brighter leading rule (opacity 0.5) | Gives the "reading head" a sharp edge. |
| Completion | Beam parks at last baseline, fades out **180 ms** `ease-out`; corner confirmation (§4) appears | The exit of the sweep is the handoff to the overlay state. |
| Decorative? | Yes — `aria-hidden="true"`, `pointer-events: none` | Per UploadScannerFrame pattern. |
| Implementation | Composited overlay layer, animate `transform: translateY(0→100%)` only; `will-change: transform` | Transform is GPU-composited; `background-position` repaints (CSS-Tricks / Omni Apps). |

**Bangla note:** the sweep carries no text, but if it ever overlaps the OCR output region it should dim (not shimmer) the area just-read — a static opacity step, not a glow.

---

## 4. Region Overlay Spec ("detection boxes")

**Concept:** Camera-focus-box grammar — L-shaped corner anchors that draw in and settle into confirmed regions, labeled by type. Taken from Adobe Scan's corner-dot edge detection and SAM's box+mask streaming.

**Spec:**

| Property | Value | Rationale |
|---|---|---|
| Stroke | 1 px, neutral accent (same family as beam) | Precise, technical. |
| Corner anchors | 12–14 px L-brackets at 2 px width (stronger than the 1 px rule), rounded 2 px | The corners are the strongest detection cue (Adobe Scan dots). |
| Fill | 8–12% white (4–8% on light docs = dark at ~8%) behind the box, **not** 30–40% | SAM's 0.35 default is research-tool weight; too heavy for a consumer doc UI. |
| Draw-in | Corner brackets + stroke fade+scale from anchor origin, **240 ms `ease-out`**; fill fades in last at 180 ms | Assembled, not exploded — restrained settle. |
| Stagger | Boxes settle with 60–90 ms stagger, max 3 distinct starts, then silence | Per UI Craft stagger rule (30–80 ms); cap so a 40-region layout doesn't ripple. |
| Live "searching" state | Per-region thin indeterminate box (1 px, opacity 0.25, slow 1200 ms linear shimmer over the *edge only*) shown **only while detection is pending**; snaps to confirmed box | Boxes appear as results stream in (SAM cumulative overlay) — never re-draw from scratch. |
| Label | Mono, 10–11 px, uppercase, `letter-spacing .06em`, follows the box, appears after settle (120 ms later) | e.g. `TEXT`, `TABLE`, `IMAGE`. Label is the "what got found" payoff. |
| Confidence | Stroke opacity ramps 0.5→1 as confidence crosses 0.6; numeric % shown once, muted, small, on hover only | Numeric spam is noise; one quiet number at most. |
| Interaction | Overlays are selection targets; selected region gets 2 px anchor, others dim to 0.6 opacity (not blur) | Hierarchy by emphasis, like detection viewers. |
| Failure | No box + region terminator: thin re-scan sweep of just that row once, then the state text reports it | Mirrors Adobe Scan's "No document found. Capture manually." |

**Detection messaging (**§2 — Adobe Scan states**):** surface the search phase in one short status line under the page:
`Looking for regions…` → `Found 3 regions` → `Reading text…`. Gerund while running, past tense once done (Evil Martians).

---

## 5. Progressive Text Spec ("text recognition appearing")

**Concept:** OCR output reveals line-by-line as recognition completes. The reveal *is* the work: each line group's animation starts on the real OCR callback for that crop, not on a timer.

| Property | Value | Rationale |
|---|---|---|
| Unit | **Line**, fallback **word**. NEVER character | Per-char breaks Bangla conjuncts/matra shaping (Appica warning for Arabic applies; `by="char"` must be banned for Bangla). |
| Reveal | `opacity 0→1` + `translateY 8px→0`, **260 ms** `ease-out` (word-level; lines 320 ms) | Restrained entrance, no bounce, no blur-filter wobble. |
| Stagger | 40–60 ms between units, driven by crop order (top→bottom reading order) | Matches reveal-text / UI Craft stagger guidance. |
| Active-line cue | The line/element currently "being read" sits at 100% color while already-read lines dim to a static 78% — a **subtle permanence gradient**, not a pulse | Communicates machine ordering; reading order, not drama. |
| Caret | Thin 2 px vertical caret on the leading edge of the active line, **1000 ms**, `steps()` blink (on 56%/off 44%), stops at completion | A paper-reader "cursor"; steps() = mechanical. |
| Completion | After last line, one quiet settle: caret rests at end-line for 300 ms then fades 180 ms; no confetti/checkmark burst | Matches "Verified" behavior in UploadScannerFrame but quieter. |
| Reduced motion | All text shown immediately at full state; reveal collapses to a 0 ms snap (but lines still *arrive* in order of callbacks) | §8. |
| Perf | Units animate `transform`+`opacity` only; container reserves layout (fixed height) so the page doesn't jump as blocks land | Matches skeleton-swap layout-stability rule. |

**Accessibility:**

```html
<div aria-live="polite" aria-busy="true">... animated units are aria-hidden ...
  <span class="sr-only">Full OCR text after completion</span>
</div>
```

- Screen readers get the complete text once (sr-only copy), animated spans are `aria-hidden` (pattern from `reveal-text` / Typewriter components).
- `role="status"` on the stage indicator (§6).

---

## 6. Pipeline Progress Spec ("staged indicators")

**Pipeline (real stages, from the product's processing backend):**

**Upload → Preprocess → Layout → OCR → Normalize → Done**

**Model:** USWDS-style segmented step indicator + one thin global bar. GitHub Actions-like: *states*, not invented continuous fill.

| Property | Value | Rationale |
|---|---|---|
| Layout | Horizontal segmented indicator: 6 short label chips + tiny 2 px connector track + a single 2 px global progress line under the page | USWDS segments; keeps total ≤ 6 so labels fit. |
| Emphasis | Only the **current** stage is emphasized (full color + its own 2 px underline). Completed = solid check + past-tense label. Future = muted 45% | USWDS: current most prominent; pending least. |
| Tense | Running: gerund (`Reading text…`); complete: past (`Text read ✓`) + check; failed: `Failed — retry` red, no animation | Evil Martians "ing→ed" rule. |
| Per-stage indicators | If REAL % exists (upload bytes, `X of Y` pages) → **determinate** thin bar. If unknown → **indeterminate** 2 px bar, 1000–1200 ms `linear` loop, inside that stage's present cell | Determinate only when true numbers exist (UI Snippets honesty rule); indeterminate otherwise. |
| Stage advance | Advance only on confirmed completion callback. **Minimum dwell 300–400 ms** so a stage can't flash; if two stages complete < 200 ms apart, coalesce (never flash 3 labels) | narrative-loader debounce + min-visible-duration; Velocity UI step loaders show ~2 s per stage — we favor tighter dwell but never sub-frame. |
| Never regress | Global line steps forward in **discrete jumps at stage boundaries**, easing 400 ms `ease-out` between anchors; it never crawls smoothly (that would fake a %) | "Eased cushion" — real jumps, eased friction. |
| Stalled watchdog | If a stage exceeds its P95 budget, show `<stage> is taking longer than usual` small muted text (timeline-style), state text `/…/ — still working` — **not** a faster spinner loop | CLI/narrative-loader watchdog. |
| Bottleneck honesty | If a "page count" number is available mid-OCR, prefer `page 3 of 12` over a floating percent | X of Y is the strongest honest format (Evil Martians). |
| ID / a11y | Indicator list: `role="status"` (or `progressbar` with `aria-valuenow` only when determinate); `aria-current="step"` on active | USWDS + CLI patterns. |

---

## 7. Motion Tokens (durations / easings)

**Duration scale** (converged on the cross-DS 150 ms standard; keep the scale small — UI Craft: "five tokens cover ~95%").

| Token | Value | Use |
|---|---|---|
| `--dur-instant` | 0 ms | State text swap in reduced-motion; system states |
| `--dur-micro` | 80 ms | Button press, seed states |
| `--dur-fast` | 120 ms | Fades, exits, color changes, caret blink hold |
| `--dur-base` | 200 ms | Standard state confirmations, connector fills |
| `--dur-medium` | 280 ms | Box draw-in, dialog entrances, line reveal |
| `--dur-slow` | 400 ms | Global bar stage jump, larger shape settles |
| `--dur-long` | 600 ms | Page handoffs (scan→result panel), stage dwell cap |
| `--dur-sweep` | 1400 ms | Beam one-pass sweep (1200–1600 range) |
| `--dur-pulse` | 1100 ms | Indeterminate bar / live shimmer loop (one period) |
| `--dur-dwell` | 350 ms | Minimum visible stage dwell (debounce floor) |

**Easing scale** (semantic; exits ~**75%** of entrance durations; enter decelerates, exit accelerates).

| Token | Value | Use |
|---|---|---|
| `--ease-linear` | `linear` | Beam sweep, indeterminate pulse, splash sweeps — *loops/continuous travel only* |
| `--ease-out` | `cubic-bezier(0.22, 1, 0.36, 1)` | Entrances: all reveals, box draw-in, label appears |
| `--ease-enter` | `cubic-bezier(0.0, 0, 0.2, 1)` | Modal/sheet/page entrances |
| `--ease-exit` | `cubic-bezier(0.4, 0, 1, 1)` | Exits, beam fade-out (at ~75% of entrance duration) |
| `--ease-in-out` | `cubic-bezier(0.65, 0, 0.35, 1)` | Same-layer morphs (layout stage → OCR stage body swap) |
| `--ease-settle` | `cubic-bezier(0.2, 0, 0, 1)` (M3 standard) | The "Done" stabilize step — front-loaded, long settle. Use **once**, at completion only |

**Choreography rules bound to these:**
1. Loops: `linear`, capped count where possible (beam max 2 passes).
2. Entrances ≤ entrances duration 200–320 ms; exits at ~75% of the paired entrance.
3. Stagger: 40–60 ms between siblings, ≤ 80 ms, never 0 uniform.
4. Only `transform` + `opacity` animate; `background-position` only for non-looping one-shot fills.
5. Never exceed 500 ms on intra-view microinteractions (per M3/Carbon/Heer & Robertson).
6. Semantic tier: components reference `--motion-scan-sweep`, `--motion-region-in`, `--motion-line-out`, etc., which alias primitive tokens — so a single token change retunes the whole app and reduced-motion is one media-query override (raxxo three-tier + DesignSystems.one).

---

## 8. Reduced-Motion Strategy

**Goal:** same information, zero unnecessary movement. Reduce is a *token override with pinned final states*, not `animation: none` everywhere (that hides states and reads as bugs).

| Element | Normal | Reduced motion |
|---|---|---|
| Beam sweep | translateY 1200–1600 ms loop | **No loop.** Render the final frame once: beam parked at the last read line, static. Or omit beam entirely; keep text states. |
| Box draw-in | 240 ms ease-out assembly | Boxes and labels **snap** in at full state (opacity/stroke/color change at color-target duration, transform skipped). |
| Line reveal | fade-up 260 ms + stagger | Full text visible when its crop completes; lines still arrive in callback order but without transform. |
| Caret blink | 1000 ms steps blink | Caret rendered statically at the end line; no blink. |
| Indeterminate bar | 1100 ms linear loop | Replace with static muted fill + live stage text; if backend supplies %, show determinate — do **not** substitute a fade/pulse (Animation Patterns rule). |
| Stage advance | 400 ms eased jump | Instant color/label swap (`--dur-instant`). `aria-live` still announces the change. |
| Prefers-reduced-motion | — | Override at token root: `--dur-*: 0ms` for movement, keep `color/opacity` snaps; loops → `animation: none` with `from`/`to` pinned. |

**Implementation outline:**

```css
@media (prefers-reduced-motion: reduce) {
  :root {
    --dur-micro: 0ms; --dur-fast: 0ms; --dur-base: 0ms;
    --dur-medium: 0ms; --dur-slow: 0ms; --dur-long: 0ms;
    --dur-sweep: 0ms; --dur-pulse: 0ms; --dur-dwell: 0ms;
    --stagger-step: 0ms;
  }
  .ocr-beam { animation: none; transform: translateY(100%); }      /* pin final frame */
  .region-box { transition: color 0ms, opacity 0ms; animation: none; }
  .line-reveal { transition: none; }
}
```

- `aria-busy` and `role="status"` announcements are unaffected by motion; stage text changes still fire.
- Test matrix: macOS "Reduce Motion", Windows "Show animations off", `prefers-reduced-motion` in emulators.
- Do NOT replace a sweep with a *different* animation under reduce; the reduced state is static-but-meaningful (Animation Patterns).

---

## 9. Anti-Patterns (explicitly rejected)

1. **Shimmer/gradient loops** that advertise "AI thinking" without any work happening — glow blooms, sparkles, floating particles, aurora gradients (Codioful/Obsidian-style ambient backgrounds).
2. **Per-character typewriter for Bangla text** — breaks conjuncts (যুক্তাক্ষর), matra, and diacritics; slow to read; also a screen-reader hazard unless sr-only handled.
3. **Continuous idle beam sweep** running when no job exists — the beam must only move during Preprocess/Layout and must park afterward.
4. **Fake percentages** or smoothly-crawling overall bars whose motion doesn't correspond to a real value (UI Snippets rule) — induces learned distrust.
5. **Flicker/jitter between stages** — labels flashing in <200 ms; missing debounce or coalescing.
6. **Regressing progress** (bar going backward) unless the stage reports a genuine clear/restart.
7. **Dangerous micro-durations** — hand-tuned `transition: 153ms`, `120 vs 220ms` for the same state; bespoke easings named "smooth" that are secretly linear; `transition: all`.
8. **`88springs`/bounce/elastic on system/status states** — spring easing is for positive *reward* moments only; CI/OCR status is neutral. (Carmen Ansio's spring-misuse warning.)
9. **Repaint-heavy full-viewport `background-position` loops on mobile** — mobile Safari jank; prefer compositor layers.
10. **Reduced-motion as blackout** — removing transitions *and* state cues so users lose where they are; and the opposite extreme of keeping a pulse that the reduce user explicitly turned off.
11. **"Verified" confetti/starburst** and oversized success states — the Done state is a small quiet check + settle, not a celebration.

---

## 10. References

**Scanners / beams:**
- UploadScannerFrame (Stripe Identity-style scanner with corner brackets + sweep, reduced-motion aware): https://docs.uploadkit.dev/docs/sdk/react/upload-scanner-frame
- SpectreUI ScanBeam (speeds/opacity guidance): https://spectreui.dev/docs/components/scan-beam
- shadcn scanner beam sweep grid (2.5 s cell advance): https://www.shadcn.io/blocks/features-scanner-beam-sweep-grid
- 21st Animated Scan Loader: https://21st.dev/@muhammad-binsalman/components/animated-scan-loader
- File scanner animation (Flutter LabrysScanner: beam/laser/gradient, 2 s, linear vs easeInOut): https://gist.github.com/roipeker/051379b9680f93391ed3912af9263a52

**Edge detection / scanner app UX:**
- Adobe Scan Android docs (live edge boundary detection, corner dots, detection state messages): https://www.adobe.com/devnet-docs/adobescan/android/en/scan.html
- Adobe Scan iOS docs: https://www.adobe.com/devnet-docs/adobescan/ios/en/scan.html
- Document Scanner Animation (React Native, Simform): https://medium.com/simform-engineering/document-scanner-animation-in-react-native-e50aafba0934
- CamScanner / Adobe Scan full UX teardowns (109–163 screens): https://screensdesign.com/apps/camscanner-pdf-scanner-app/

**Detection / segmentation overlays:**
- Meta SAM client libraries (mask fill 0.35 / outline 0.8, cumulative streaming overlays): https://dev.meta.ai/docs/sam/client-libraries
- SAM interactive prompter (mask alpha, color-coded objects, box prompts): https://github.com/hysts/gradio-sam-prompter
- Gradio detection viewer (bboxes, labels, confidence, layers): https://github.com/hysts/gradio-detection-viewer

**Progressive text reveal:**
- Appica TextAnimate (char-level breaks cursive/contextual scripts; sr-only; reduced-motion snap): https://appica.dev/ui/components/react/text-animate
- reveal-text (accessible split-text primitives): https://github.com/mulkatz/reveal-text
- prompt-kit Response Stream (typewriter vs fade): https://agents-ui.github.io/agents-kit/docs/response-stream
- SmoothUI Typewriter Text: https://smoothui.dev/docs/components/typewriter-text

**Staged / honest progress:**
- USWDS Step indicator (segments, counters, a11y): https://designsystem.digital.gov/components/step-indicator/
- Evil Martians — CLI UX: spinner, X of Y, progress bars, -ing→-ed: https://evilmartians.com/chronicles/cli-ux-best-practices-3-patterns-for-improving-progress-displays
- r-lib cli progress reference (`cli_progress_step` named steps): https://github.com/posit-dev/skills/blob/HEAD/r-lib/cli/references/progress.md
- rich-stepper (terminal multi-step widget, step statuses/progress): https://github.com/abbazs/rich-stepper
- narrative-loader (debounce, min visible duration, timeline, reduced motion, live-region): https://github.com/danko167/narrative-loader
- gh workflow / run CLI (step-state view): https://github.blog/news-insights/product-news/work-with-github-actions-in-your-terminal-with-github-cli/
- gh-aw progress bar PR (track the real bottleneck, TTY fallback): https://github.com/github/gh-aw/pull/8731
- Aceternity Multi Step Loader: https://ui.aceternity.com/components/multi-step-loader
- UI Snippets — Loading States (honesty of determinate vs indeterminate): https://fwdtools.com/ui-snippets/tag/loading-states/
- shadcn stepper segmented progress: https://www.shadcn.io/blocks/stepper-segmented-progress

**Motion tokens:**
- Material 3 easing & duration tokens: https://m3.material.io/styles/motion/easing-and-duration/tokens-specs
- Carbon motion basics (productive/expressive curves, 70–700 ms): https://carbon-website-git-fork-theiliad-patch-2.carbon-design-system.vercel.app/guidelines/motion/basics
- UI Craft — Motion (duration scale, exits ≈75%, linear only for loops, reduced-motion contract): https://skills.smoothui.dev/docs/motion
- DesignSystems.one — Duration & easing (token pairs, reduce → 0 ms): https://www.designsystems.one/foundations/duration-and-easing
- Carmen Ansio — Motion tokens for design systems (enter/exit pair, spring misuse, reduce override): https://www.carmenansio.com/articles/motion-tokens-design-systems/
- open-design animation-discipline (150 ms convergence, M3 curve specifics, >500 ms warning): https://github.com/nexu-io/open-design/blob/main/craft/animation-discipline.md
- Domain data.dev.com/raxxostudios — Motion tokens that compose (three-tier, stagger, reduce as metric): https://dev.to/raxxostudios/motion-design-tokens-that-actually-compose-durations-easings-choreography-12e4

**CSS sweep / scanline technique:**
- CSS-Tricks — sliding background (**transform composited vs background-position repaint**): https://css-tricks.com/creating-a-css-sliding-background-effect/
- Coder's Block — gradient animation trick (oversized background-size + position): https://codersblock.com/blog/gradient-animation-trick/
- Animation Patterns — CSS fill sweep (oversize gradient, focus-visible, reduced-motion pin): https://animationpatterns.art/animations/background-position-fill-sweep/
- Animation Patterns — shimmer skeleton (layout-stable swap, repaint cost): https://animationpatterns.art/animations/shimmer-gradient-sweep-skeleton/
- Omni Apps — animated background gradient methods (method 3 GPU compositing): https://omniapps.blog/css-animated-background-gradient
- CSS scanline simulation gist: https://gist.github.com/ctgnauh/8b7580cd6769600aadeb20a48029d8ee
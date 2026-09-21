# Design Research — Ordinary Chobi Reader

This document synthesizes Research Team B (five independent design/product research agents). The full agent reports live in `docs/research/design/`:

| Agent | Topic | File |
| --- | --- | --- |
| B1 | OCR product UX patterns | [`design/B1_PRODUCT_UX.md`](design/B1_PRODUCT_UX.md) |
| B2 | Minimalist design systems & tokens | [`design/B2_MINIMAL_DESIGN.md`](design/B2_MINIMAL_DESIGN.md) |
| B3 | Scanning / OCR animation | [`design/B3_OCR_ANIMATION.md`](design/B3_OCR_ANIMATION.md) |
| B4 | AI / developer-tool UX | [`design/B4_DEVTOOL_UX.md`](design/B4_DEVTOOL_UX.md) |
| B5 | Teste-skill search + accessibility sources | [`design/B5_SKILL_AND_ACCESSIBILITY.md`](design/B5_SKILL_AND_ACCESSIBILITY.md) |

## Key determinations

### The "Teste" skill does not exist in this environment
Agent B5 searched the project, user profile, `.config/opencode`, `.opencode`, `%APPDATA%/%LOCALAPPDATA%\opencode`, globbed every `SKILL.md`, and grep'd all skill names for "teste" (case-insensitive). Zero matches. The only available built-in skill is `customize-opencode`. No OpenCode skill directory exists on this machine. **The design guidance below therefore comes from the documented research sources, not from a "Teste" skill.** (B5 did locate two genuine design skills in a third-party Codex plugin cache — `frontend-app-builder` and `accessibility-and-inclusive-visualization` — and extracted their guidance into §1.3 of the B5 file.)

## Product position
"Ordinary Chobi Reader" should feel like a **reading desk / research lightbox**: a calm, matte workspace where the document and its extracted text are the content and the chrome disappears. Not a SaaS dashboard, not a "premium marketing" site. Data-status readouts (confidence, latency, model, stages) use restrained monospaced labels like a scientific instrument.

## Interaction patterns adopted (from B1 + B4)
1. Two-pane source→text workspace with synchronized, region-aware interaction.
2. Per-item status state machine: `queued → preparing → processing → complete | failed`, with retry.
3. Confidence at the finest unit the engine actually provides — never fabricate per-document confidence.
4. Raw OCR kept under every processed/corrected view; user can always revert to raw.
5. Reveal-on-image overlays only where the engine actually returns regions/lines (Tesseract hOCR gives real bounding boxes).
6. Upload parity: drop zone = click-to-browse = paste; stated format/size limits up front.
7. Engine selection framed as a capability-metadata selector, not a confusing dropdown.
8. Export anytime: TXT / JSON / ZIP, copy-to-clipboard.
9. Masked API key with "unchanged" semantics, test-connection checklist, explicit forget-key.
10. Blind/paired model comparison with side-by-side panels + sync, CER/WER table with provenance captions, top-K character confusion matrix.
11. Batch job queue styled like a CI test runner (per-file rows, chips, retry-failed banner).

## Anti-patterns explicitly rejected
AI gradients, glassmorphism for chrome, glowing buttons, card spam, mixed radii, 700-weight everywhere, glow shadows, fake progress, color-only status, per-character text reveal (breaks Bangla conjuncts), background-position scan loops, blocking modals for long jobs, one global confidence score.

## Animation approach (from B3)
Motion maps 1:1 to real pipeline events. Beam sweep is *decorative* during real work only; region boxes assemble from real line data; text reveals at line/word granularity (never per character — Bangla conjuncts break); pipeline indicator is stage-based (`Upload → Preprocess → Layout → OCR → Normalize → Done`) with honest progress; viewer: entrance `ease-out (0.22,1,0.36,1)`, sweep 1400ms linear, micro 80–400ms; `prefers-reduced-motion` pins final frames instead of animating.

## Accessibility (from B5, WCAG 2.2 AA)
Semantic HTML + landmarks; full keyboard flow; visible focus ≥3:1; 24px+ targets (44px aim); `aria-live="polite"` for OCR progress, `role="alert"` for errors; dropzone is a styled native `<input type="file">`; OCR output is real text with correct `lang="bn"`; API-key input is `type=password` with reveal toggle and `aria-pressed`; reduce-motion gates all animation; empty/error copy teaches next steps without raw stack traces.

## Token recommendation (from B2, adopted in DESIGN_SYSTEM.md)
Spacing 4/8 grid; type Inter + Noto Sans Bengali + Noto Serif Bengali (+ JetBrains Mono-style tabular monospace for readouts); palette light `#FCFCFD` canvas / `#1C2024` ink with indigo accent `#3E63DD`; Radix-12-step style neutrals; semantics green/amber/red; radius 4/6/8; borders-first elevation; shadows only for floating layers. Full spec: see [DESIGN_SYSTEM.md](../../DESIGN_SYSTEM.md).

## Verified vs. judgment
- **Verified facts**: WCAG contrast ratios (4.5:1 body, 3:1 UI/focus); NN/g empty-state/error-writing guidance; the specific products studied all exist and were documented.
- **Implementation choices**: palette and animation timings are our translation of research into tokens.
- **Known limitations**: no brand-recognition data for "research instrument" positioning; motion behalf of real pipeline is constrained by how much real progress OCR engines expose (Tesseract exposes per-block progress, not per-line, so progressive text reveal is approximated per-line from real words).
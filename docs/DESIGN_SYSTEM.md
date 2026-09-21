# Design System — Ordinary Chobi Reader

The product looks like a **research lightbox**: a matte workspace where the document and the extracted text are the content. Chrome is quiet, precise, typography-led.

Source research: [`docs/research/DESIGN_RESEARCH.md`](research/DESIGN_RESEARCH.md) and `docs/research/design/*`.

## 1. Typography

### Latin
- **Inter** (variable 400/500/600) via Google Fonts for UI chrome and Latin text.
- Fallback stack: `Inter, system-ui, -apple-system, "Segoe UI", sans-serif`.

### Bangla
- **Noto Sans Bengali** (400/500/600) for UI and OCR reading pane; **Noto Serif Bengali** for the long-form reading/editor view of extracted text.
- Fallback stack: `"Noto Sans Bengali", "Nirmala UI", "Vrinda", "Bangla MN", sans-serif`.
- Bangla renders one nominal size step above its Latin pair and needs `line-height 1.7–1.9` so মাত্রা/ঊর্ধ্ব marks don't collide.
- Mixed-script lines must not break: allow `word-break: normal`, never justify with `text-align: justify` (creates rivers through Bangla).

### Monospace / data readouts
- `ui-monospace, "SF Mono", "JetBrains Mono", "Cascadia Code", Consolas, monospace`, `font-variant-numeric: tabular-nums`, 12–13px, for confidence, latency, coordinates, model IDs, and pipeline stage counters.

### Scale (fluid, 4-step)
`--fs-xs 12` · `--fs-sm 13` · `--fs-md 14` · `--fs-base 15` (Latin body) · `--fs-lg 17` (Bangla body) · `--fs-xl 20` · `--fs-2xl 24` · `--fs-3xl 30`. Reading pane: `--fs-read 18/30`.

## 2. Spacing, layout, density

- Base unit 4; layout grid 8. Scale: `4 8 12 16 20 24 32 40 48 64 96`.
- `--sp-1…--sp-10` tokens.
- Control heights: 32 default / 28 dense; inputs and buttons share the same height as their adjacent selects.
- Two-pane workspace (≥1100px), split at 50%, draggable; stack vertically below 1100px; below 720px show Document → Processing → Text as separate stacked panels.
- Panel separation: 1px hairline dividers, not big gaps.

## 3. Colors

Two themes (light default, dark automatic + manual toggle). Hand-calibrated neutral scales inspired by Radix 12-step scales.

### Light
- Canvas `--bg: #FCFCFD` · panel `--bg2: #F8F9FA` · raised `--bg3: #F1F3F5`
- Hairline `--line: #E4E6EA` · strong `--line2: #C9CDD3`
- Ink `--ink: #1C2024` · muted `--ink2: #5A5F67` · subtle `--ink3: #8A9098`
- Accent `--accent: #3E63DD` · hover `#3358D4` · text-accent `#3A5BC7`
- Semantics: ok `#18794E`/bg `#E6F4EF` · warn `#AD5700`/bg `#FFF4E5` · error `#D93036`/bg `#FFECEE`
- Paper (document stage) `--paper: #FDFBF7`

### Dark
- Canvas `#111113` · panel `#17181B` · raised `#1E2024`
- Hairline `#26282E` / `#363943` · ink `#ECEDEF` · muted `#9DA1A8` · subtle `#6C7178`
- Accent `#5E6AD2`; semantics ok `#30A46C` · warn `#FFB224` · error `#E5484D`

Contrast is a system property — text tokens were chosen so muted text on panel meets 4.5:1 AA and UI affordances meet 3:1.

## 4. Radius, borders, shadows

- Radius `--r1 4` · `--r2 6` · `--r3 8` · `--r4 12`. Pill radius reserved for badges/avatars only.
- Elevation is border-first: hairline 1px borders + (only for floating layers) shadows:
  popover `0 2px 8px rgba(16,17,20,.08), 0 12px 32px -8px rgba(16,17,20,.16)`; dialog doubles offsets.
- No glow, no backdrop blur chrome.

## 5. Controls

- Buttons: 32px, radius 6, `--bg2` surface with hairline border; primary = ink-filled (or accent for the single most important action per page); ghost = no border, ink on hover.
- Selects/inputs: 32px, hairline border, focus ring = 2px `--accent` at 40% over pixels + offset ring for visibility.
- Toggles: small, hairline-thick, track 32×18.
- Status chips: 12px label, 4px-dot + text + optional mono number. Never color-only.
- All interactive elements ≥24px tall; 44px aim for thumb targets.

## 6. States

- **Empty (first use)**: 4 elements — 24px optional glyph, one sentence of what this is for, one concrete next action, and a link to the deeper manual. Initial state ≠ no-results state ≠ error state.
- **Loading**: progress maps to real pipeline (upload → preprocess → layout → OCR → normalize). Within-stage determinate only for real numbers; otherwise 1100ms linear indeterminate bar. Watchdog copy after a generous budget ("still working — large documents take time").
- **Error**: plain-language headline + what happened + what the user can do + retry. Never raw stack traces. Errors are announced via `role="alert"` and never auto-dismiss.
- **Disabled**: 40% opacity + `aria-disabled`, never invisible.

## 7. Animation

- Motion maps 1:1 to real pipeline events. Decorative scan beam is allowed **only while real work is running**.
- Scan beam: 2px, width 100%, opacity 0.35, `linear`, one pass 1400ms, max 2 passes, parks then fades 180ms.
- Region boxes: 1px stroke, 12px L-corner anchors, 8–12% fill, assemble 240ms `ease-out`, 60–90ms stagger.
- Text reveal: line/word fade-up `opacity 0→1` + `translateY 8→0`, 260ms `ease-out`, 40–60ms stagger. **Never per-character** (breaks Bangla conjuncts/ matras).
- Pipeline indicator: segmented `Upload → Preprocess → Layout → OCR → Normalize → Done`; gerund while running, past + check when done; stage advance with min 300–400ms dwell.
- Tokens: micro 80 / fast 120 / base 200 / medium 280 / slow 400 / sweep 1400ms. Easings: `ease-out (0.22,1,0.36,1)`, exits at ~75% of entrance, `ease-settle (0.2,0,0,1)` on Done.
- `prefers-reduced-motion`: all movement tokens → 0ms, loops off, final frames pinned; text swaps still announced via `aria-live`.

## 8. Accessibility

Semantic landmarks + single H1 per page; order-consistent focus flow; visible focus ≥3:1 never obscured; `aria-live="polite"` + `aria-busy` for OCR progress, `role="alert"` for errors; upload = styled native `<input type="file">` (keyboard reachable); OCR output is real `<p>/<pre>` text with `lang="bn"`; API-key inputs `type="password"` + reveal toggle with `aria-pressed`; diagrams in Workflow have keyboard-reachable HTML structure + a textual transcript of each step.

## 9. Bangla font strategy

- Prefer Noto Sans Bengali for UI labels that carry Bangla; Noto Serif/Bengali in the editor. Serve via Google Fonts with `display=swap`; fallbacks listed in §1. Load weights 400/500/700 (Noto Bengali needs 700-level weight mapping that calligraphic fonts express at 600+).
- Claim exact conjunct rendering: browsers shape via HarfBuzz, so `যুক্তাক্ষর`, `ক্ষ`, `ষ্ট্র`, `রেফ` render correctly as long as the font is present.

## 10. Responsive behavior

- ≥1100px: fixed two-pane split; 720–1100: adaptive split (drag or stacked on demand); <720: stacked Document above bottom sheet of controls and extracted-text panel.
- Queue table collapses to cards on mobile (filename + chip + expand for rows).
- Workflow diagrams: vertical, scrollable on small screens; interactive nodes ≥44px targets.
- Models page: list on desktop, single-column on mobile.

## 11. Settings / model UX

- Settings = flat sections (General, Providers, Local models, About/privacy) with inline edit, no modal chains.
- API-key fields: label + helper with constraints up front, masked on entry, reveal toggle, `(unchanged)` semantics on save, explicit "Forget key" and "Forget all keys" with confirmation.
- Model selector in Extraction is subtle: `Model: <name>` with capability hint on hover; Models/Workflow pages host the full config.
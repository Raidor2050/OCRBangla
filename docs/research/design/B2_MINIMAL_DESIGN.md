# B2 — Minimal / "Quiet Technical Elegance" Design Research

**Agent:** B2 (design research only — no application code)
**For:** "Ordinary Chobi Reader" (ছবি = image) — a Bangla-first OCR web application positioned as a premium research instrument, not a generic AI dashboard.
**Date:** 2026-09-21
**Deliverable:** Concrete, copyable tokens and principles distilled from web research on notable tool-grade design systems.
**Companion docs (produced by other agents):** typography deep-dive on Bangla fonts, color/contrast verification, states library. This file is the synthesis.

---

## 1. Philosophy

An OCR reader is not a dashboard. It is closer to a **binocular microscope, a musical instrument (Ableton Push), or a spec sheet (Teenage Engineering)** than to an analytics app. The material being inspected — a scanned Bengali page — is the star; everything on screen around it is adjustable chrome that must be quiet enough to be ignored for hours.

Principles distilled from the entire research set:

1. **Content is the interface.** Every pixel of chrome is potential fatigue during a long review session (Raycast's "every decorative element becomes fatigue"; Readwise's "a reading surface should disappear"; Figma's "work should be the center of the canvas").
2. **Hierarchy before decoration.** Decide what is seen first, second, and what stays quiet — then build hierarchy with **surface lift, hairline borders, and type weight**, not color (Linear's "every saturated pixel needs to mean something"; Figma's "set hierarchy before decoration").
3. **One accent, used as punctuation.** One chromatic color for interactivity (primary action, focus ring, links, active selection). Everything else neutral. No second accent. (Linear lavender `#5e6ad2`, Stripe blurple, Raycast's single red / single white pill.) For an OCR tool, color budget continues into *semantic* signals (success/error/confidence) — but the **accent** is a separate, single hue from status colors.
4. **Borders before shadows; surface ladder over drops.** Elevation by 1px hairline + one-step surface lightening is the language of Linear/Vercel/Readwise. Shadows are reserved for transient, floating layers (menus, dialogs, toasts). This keeps deep work areas flat and calm.
5. **Density is confidence.** Dense, machine-readable information display is a feature for expert users (Carbon's "high-density interface model," the 2x Grid 8px mini-unit; Figma's panels). But density must be *curated* — grouping, alignment, rhythm — never uncurated wall-of-cards.
6. **Respect the script.** Bangla is the primary content language. The typography system must be designed for Bangla first (conjunct stacking, matra, line-height) and Latin second. This is the single most differentiating design decision for this product.

**The governing metaphor:** a *lightbox / reading desk*. Chrome = matte graphite instrument. Document = paper (warm white). Data readouts = accurate mono type.

---

## 2. Studied products & transferable ideas

### Linear — engineering-tool minimalism, dark-first
- **Surface ladder instead of shadows.** Four surfaces on a near-black canvas (`#010102`/`#08090a` → `#0f1011` → `#141516` → `#191a1b`); hierarchy via luminance, elevation carried by hairlines (`#23252a`).
- **Single accent discipline.** Indigo `#5e6ad2` used *only* on brand, focus rings, and one primary CTA per context; hover `#828fff`. "Never fills cards, never a section background, never pairs with a second chromatic color."
- **Signature weight pair 510/590** (Inter Variable). Emphasis that whispers: 510 between regular and medium, 590 between medium and semibold. Bold (600/700) is *excluded* from the voice.
- **Negative tracking ramps with size** (`-1.4px @ 64px` … `normal @ ≤16px`) so display type stays dense and engineered.
- **Keyboard-first command surface** — ⌘K invokes one surface for navigation, search, and action. 100–250ms motion, nothing bouncy.
- Token snapshot: base 4px; radii 4/6/8/12; body 15/24; small 13/19; micro 12/16. Borders as `rgba(255,255,255,0.05–0.08)` white overlays on dark.

### Raycast — instrument chrome, keyboard-native
- **Chrome IS the product.** Marketing is an enlarged screenshot of the command palette — the tool's identity is the interface itself. No marketing/generic-dashboard schism.
- **Monospaced keycap chips.** Keyboard shortcuts rendered as compact mono badges with hairline borders — treats keystrokes as first-class typographic citizens (perfect for our shortcut surfaces).
- **Inter with `calt, kern, liga, ss03`** — the single-story `g` alternate is a *signature*, "without it the type reads generic."
- **One primary CTA, one chromatic moment.** White pill CTA + a single red hero moment; nothing else competes.
- **Weight ~500 baseline on dark** for legibility, +0.2px positive tracking (unusual, airy, breathable) — useful lesson: *dark-mode tracking laws differ from light-mode*.
- **macOS-layered shadow craft** on floating surfaces (inset top highlight, inset bottom dark, tight ring) making controls feel physical without glow. Compact density: every row earns its height.

### Figma — density done with clarity; chrome that recedes
- **Work is the center of the canvas.** Light graphite tool; panels chill on the sides; the artwork is the focal point.
- **Density is structure, not clutter.** The layers/properties panels are dense *and* legible because grouping, alignment, and rhythm carry organization ("Figma handles density like a jazz musician handles complexity — structured improvisation").
- **Silent chrome language:** toolbar 48px, icon buttons 32px, panels collapsible, `8px` internal panel padding, `14px` panel headers with chevrons.
- **"Useful, not whimsical. Practical, not superfluous."** (Figma design principle — a one-line QA test for every decoration.)
- **Placeholder span/focus-first lesson:** labels must have full context; reduced labeling hurt accessibility and was reverted.
- **Only shadow when it clarifies depth or transient layers** — panels use borders, layer order, and surface contrast first.

### Stripe — accessible color engineering + form states
- **Perceptually uniform color systems** (CIELAB/OKLCH-L) so semantic hues have *equal visual weight*, and **predictable contrast as a system property**, not a per-pair fix. Rule: any two colors ≥5 scale-steps apart pass small-text AA; ≥4 apart pass large/icon.
- **Contrast-first isn't garish:** "accessible doesn't mean vibrancy"; keep calibrated hues on neutral canvas.
- **Actionable form/status patterns:** inline validation, confirmation states, irreversible-action affordances; errors positioned with context preserved.
- **The empty/error-state catalog is a first-class deliverable** — "every flow assumes payments can fail." Our equivalent: *every flow assumes OCR can fail* (low confidence, page unreadable, model error).
- **Focus = subtle ring shadow, not outline** (`rgba(99,91,255,0.1) 0 0 0 3px`) — a shadow-as-a11y-technique.
- Typography: Söhne light weights (300 display / 400 body / 425 label); tabular figures where numerics matter. 4px base spacing; buttons 4px, cards 16px, pill reserved for the hero CTA.

### Vercel / Geist — subtraction as brand
- **Ink is the brand.** `#171717` near-black carries headings, CTAs, and dark bands; there is *no* brand accent hue in chrome. Links use a quiet blue `#0070f3` only for semantics.
- **Borders functionally invisible** — 1px `rgb(235,235,235)`/white-8%; borders define structure without becoming a design element.
- **200-step gray scale** for dividers/disabled states — every hairline and disabled token lives on its own deliberate step.
- **Stacked micro-shadows over one heavy drop**: inset 1px hairline ring + 2–3 offsets at 4–12% black for floating layers; five elevation levels, each adds an offset not a blur.
- **Mono as "technical eyebrow"** above sans headings (Geist Mono for section labels, terminal mockups, code). Perfect pattern for OCR readouts: coordinates, confidence, page ranges.
- **Radii bimodal:** functional chrome 6px; marketing hero pills 100px — never mixed on the same screen. (We adopt a strong preference for the small end: 6px.)

### IBM Carbon — data-forward product language
- **Productive vs. expressive type sets.** Productive (base **14px**, compact line-heights, fixed headings) for task UI; Expressive/16px for moments of reading. For us: chrome and data tables use productive; the extracted-text reading pane may open to a 16–17px relaxed setting.
- **Density is a supported feature** — explicit "condensed" component sizes (24px dropdowns, xs toolbar) for data-heavy tools. OCR review tables should ship a compact option by default.
- **2x Grid / 8px mini-unit.** Everything in multiples of 8 (and 4 for micro): columns, rows, boxes, margins, padding. `16px` page padding at all breakpoints; fixed sizing scale 8/16/24/32/48/64/80.
- **Stack (gap) over margins.** Spacing responsibility delegated to layout containers; components don't fight each other with margins.
- **Spacing is hierarchy:** near → related; far → separated; more space around an item → perceived importance.

### Radix Themes / Radix Colors — token system we can borrow wholesale
- **9-step spacing scale on a 4px base:** 4, 8, 12, 16, 24, 32, 40, 48, 64 — same shape as Linear/Stripe/Fluent. Accept it as-is.
- **9-step type scale** with paired size/line-height/letter-spacing where line-height runs 16→60px and tracking tightens at large sizes.
- **12-step color scales with documented semantic uses:** 1 app bg, 2 subtle bg, 3 UI bg, 4 hovered bg, 5 active bg, 6 subtle border, 7 border, 8 hovered border, 9 solid (white-text-safe, WCAG-AA guaranteed), 10 hovered solid, 11 low-contrast text (AA on step 2), 12 high-contrast text. **Dark palettes are hand-calibrated per step** (not a "darken by X" formula).
- **Per-step use-case mapping = naming without memory.** Adopt Radix scale *names* (`-bg`, `-border`, `-solid`, `-text`, `-hover`).

### Readwise / Readwise Reader — the reading instrument
- **Reading surfaces disappear.** No sidebars, no toolbars during reading; chrome reveals on hover/keyboard, then leaves (ideal for the "Extracted text" pane).
- **Warm "physical highlighter" colors**, not neon tints (`#FBDA83` yellow, `#E4938E` coral, `#8DBBFF` blue). Lesson for OCR review markup / highlight overlays: warm, paper-associated tints feel like marking a page, not like digital paint.
- **Serif-for-editorial / sans-for-chrome split.** A serif reading face vs. functional sans — signals "book/document" before any copy is read. For Bangla: Noto Serif Bengali for reading view, Noto Sans Bengali for UI (see §3).
- **Keyboard reading is a flow-state feature** — navigation, highlight, annotate all keyboard-first, the way our review pass should be.
- **One filled button carries all the weight**; everything else ghost or text-link. Cards = flat + hairline, nearly no shadows, "printed card" corners.
- **Marketing drama vs. product restraint are allowed to be opposites.** We have no marketing page requirement here, but the insight holds: the product page stays quiet.

### Obsidian — restraint via architecture
- **System/native fonts are a legitimate statement.** Zero FOIT/FOUT; identity lives in layout/color/interaction, not a proprietary face. Practical corollary for us: prefer widely-licensed variable fonts (Inter, Noto) over custom ones.
- **Dark mode as content service**, not fashion — reduce noise so the graph/notes become the focal point. Applies to our document stage.
- **Local-first deletes an entire class of UI states** (sync spinners, conflict dialogs, presence cursors). Architecturally, offline OCR means less chrome to build.
- **Expose the whole design as tokens/CSS variables** — themeability is a feature; a research instrument's power users will want density/theme controls (we recommend Style-settings-style controls, not layout rebuilds).
- **Monumental tight display** (60px, -1.2px tracking, 1.0 leading) only at the top; body relaxes to 16px/1.5.

### Ableton / Teenage Engineering / NI — instrument & label vocabulary
- **Descriptive typography over icons.** "We're not big fans of icons… descriptive typography" (NI hardware). Complex tool labels should be *words* (e.g. `Tesseract`, `Paddle OCR`) first, glyphs second.
- **Text on text labels, mono everywhere for engineering honesty** (TE: mono-only identity; tabular alignment free).
- **Constraint is the identity mechanism.** Small palettes (5 colors), limited radii (Ableton literally 0px), one typeface — the system is recognizable because of what it refuses.
- **Zero-radius / sharp angular chrome** reads as "grid-faithful, engineered" (Ableton). We won't go to 0, but we'll stay in the 4–8px band and never exceed 12px for chrome.
- **A technical manual that happens to be beautiful** — information density carried by type and layout, not containers.

### Reference design languages (context, not clones)
- **Material Design 3:** state layers (overlay tints for hover/pressed derived from an 8% alpha on surface), tonal surfaces, token layers (reference → system → component). We reject M3's 16dp cards/rounded-squircle default as it reads "app," but adopt the *state-overlay* mechanism (cheap, consistent hover/pressed/selected).
- **Apple HIG (macOS):** spatial continuity, material translucency for floating layers only, focus ring as a system constant, `⌘`-heavy shortcut culture, 44pt targets.
- **Microsoft Fluent 2:** 4px base with `2/6/10` icon-snapper steps; **semibold instead of bold** and no italic in UI; density as tunable layout tokens; baseline-grid alignment.
- **Try to avoid:** generic shadcn/tailwind "dark dashboard" output; every default AI dashboard.

---

## 3. Typography guidance (Latin × Bangla strategy)

This is the most important section for this product. **Design for Bangla, then fit Latin to it.**

### 3.1 The script reality (from research)
- Bangla is an abugida: `মাত্রা` (headline tipline), conjuncts (`যুক্তাক্ষর`), vowel marks above/below the line. Requires **complex text layout/shaping** (OpenType: `akhn, blwf, vatu, pres, abvs, half, calt`) and generous vertical room.
- Bangla renders **optically smaller** than Latin at the same point size — expect to bump Bangla sizes **+10–20%** (some guidance: 15–20%) and/or choose a taller x-height face.
- Screen-readability sources consistently name **Noto Sans Bengali / Noto Sans Bengali UI** (695 glyphs, 16–17 OpenType features, variable weights, tested across browsers) and **Hind Siliguri** (designed to harmonize Bangla + Latin in one family) as the reliable web pair, plus **Noto Serif Bengali** for editorial reading.
- **Rochona (রচনা)** — OFL, dual-weight (400/700), tall x-height (~67% cap), 798 glyphs, full shaping for 376 conjunct rules — a credible open "instrument" choice if a custom feel is wanted.
- WCAG 1.4.12 minimum line-height 1.5; Bangla with conjuncts/vowel marks in practice needs **≥1.6–1.75** for body. Bengali Layout Requirements (W3C beng-lreq) is the authoritative reference.
- Avoid pre-Unicode/ANSI-era encodings (Bijoy/SutonnyMJ) entirely; always ship Unicode.

### 3.2 Recommended font architecture (copy-paste ready)

```
Latin UI / data          : Inter (variable, wght 400–700 subset to 400/510/590)
                           font-feature-settings: "cv01", "ss03"   (Linear/Raycast signature)
Bangla UI / data         : Noto Sans Bengali (variable)  → falls back: Rokit/Hind Siliguri
Bangla reading pane      : Noto Serif Bengali (editorial "book" moment)
Bangla alternative mono? : use sans for Bangla; mono only for LATIN numerals/readouts
Mono (coordinates/conf)  : JetBrains Mono (OFL) — fallback ui-monospace, SF Mono, Consolas
```

- Load Latin + Bangla with `unicode-range` slices (`U+0000-00FF…`, `U+0980-09FF`) so Bangla faces load only when Bengali text is present.
- **Do not synth-italicize Bangla** (no native oblique; avoid fake slant). Emphasize with weight/color, not italics.
- **Numbers in OCR readouts must be tabular-nums** in the mono face (confidence `0.972`, coordinates `x=412 y=618`).

### 3.3 Productive type scale (Latin, app chrome + data)

Paired sizes/line-heights/letterspacing. **In-app display ceiling is 28px** — this is an instrument, not a marketing page.

| Token | Size | Line-height | Weight | Use |
|---|---|---|---|---|
| `t-ultra` | 28px | 36px / 1.29 | 510 | App hero / empty-state headline (rare) |
| `t-display` | 24px | 32px / 1.33 | 510 | View titles, page headers |
| `t-title` | 20px | 28px / 1.4 | 510 | Panel titles, dialog titles |
| `t-subhead` | 18px | 26px / 1.44 | 510/590 | Section heads in panels |
| `t-body-lg` | 16px | 24px / 1.5 | 400 | Reading pane prose (Latin), prominent labels |
| `t-body` | 15px | 24px / 1.6 | 400 | Panel body, tooltips, empty-state copy |
| `t-ui-sm` | 14px | 22px / 1.57 | 400 | **Default control/table label size** (prod base) |
| `t-ui-sm-strong` | 14px | 22px | 510 | Buttons, active nav, emphasized UI labels |
| `t-caption` | 13px | 20px / 1.54 | 400 | Table cells, compact metadata |
| `t-micro` | 12px | 18px / 1.5 | 510/400 | Badges, keycaps, side-labels, timestamps |
| `t-mono` | 12–13px | 18–20px | 400/500 | Cameras, confidence, coordinates, page refs (JetBrains Mono) |

Rules:
- Weights only: **400, 510, 590-600**. Never 700 in chrome. (Linear voice; Fluent says semibold-not-bold.)
- Negative tracking tightens with size (≈ -0.4px @ 24px, -0.2px @ 18px, 0 @ ≤15px) for Latin.
- **Never use line-height 1.0 below 24px.**

### 3.4 Bangla adjustments (the "shift up" rule)

| Latin token | Bangla equivalent | Notes |
|---|---|---|
| `t-body` 15/24 | `t-bn-body` 17px / 28px (1.65) | "+1 step" sizing; line-height ≥1.65 |
| `t-ui-sm` 14/22 | `t-bn-ui` 16px / 26px | Buttons/labels that carry Bangla text |
| `t-body-lg` 16/24 | `t-bn-reading` 18px / 30–32px (1.7–1.8) | Reading pane, 60–75+ chars measure |
| `t-title` 20/28 | `t-bn-title` 22px / 32px | Keep matra + conjunct vertical room |
| `t-caption` 13/20 | `t-bn-caption` 14px / 22–24px | Never dip below 13-14px for Bangla |

Summary rule: **Bangla steps sit one nominal size above their Latin pair and run at 1.6–1.8 line-height.** Mixed-script lines (Bangla body + Latin numerals) align on a shared baseline; optical size compensation is handled by the size bump.

---

## 4. Spacing / Grid

Adopt the near-universal **4px-base scale** shared by Linear, Stripe, Radix, Fluent, Vercel. Layout rests on an **8px grid**; 4px exists for micro detail and icon optical alignment. (Carbon's mini-unit = 8.)

```
space-1   4
space-2   8         ← icon↔text gap, control padding micro
space-3   12        ← control padding (h8 v3), small gaps
space-4   16        ← default gap between related controls; table cell padding
space-6   24        ← card/panel padding, section-group gap
space-8   32        ← panel gap, section separation
space-12  48        ← window padding (grand surfaces)
space-16  64
space-24  96
```

Conventions:
- Components sized/positioned in multiples of 4; **page-level layout in multiples of 8**.
- **Stack/gap, not margins.** Spacing lives on layout primitives (Flex/Stack) — components carry zero external margins (Carbon Stack rule).
- Control heights: default **32px**, dense **24–28px** (OCR tables), never below 24 except inline chips.
- **Density is a first-class setting**: a Comfortable/Compact segmented control that swaps a density multiplier (Fluent `--scaling`/density tokens, Radix `--scaling`).
- Row heights in data tables: compact 28px, default 32–36px with 44px touch rows where interactive.
- **Optical rather than literal on Bangla:** matra clipping risk → give Bangla text rows ~2–4px extra vertical tolerance.

---

## 5. Color & contrast guidance + concrete palette

### 5.1 Guidance (from Stripe + Radix + Linear)
- Build **perceptually uniform scales** (Radix 12-step, calibrated in perceptual space, not raw HSL steps) so semantic hues carry equal visual weight.
- **Contrast is a system property, not a per-pair fix**: text steps 11/12 on bg steps 1/2 pass AA; step-9 solids pass AA for white text; steps 7–8 borders pass 3:1 non-text. Never tune a pair manually when you can move up a step.
- **Accent is a single hue** (interactive). **Semantic colors are a separate, small family** (status). They must not visually merge on screen.
- Neutrals tinted toward the accent hue (blue-cast slate, not pure gray) for cohesion (Stripe's blue-tinted neutrals; Lightroom/Linear "not #000 black").

### 5.2 Light theme (default — the reading desk / lightbox)

| Token role | Token | Light value | Origin/notes |
|---|---|---|---|
| App canvas | `--bg-canvas` | `#FCFCFD` (slate1) | Chrome ground |
| Panel / surface | `--bg-surface` | `#F8F9FA` (slate2) | Sidebars, toolbars |
| Raised panel | `--bg-surface-2` | `#F1F3F5` (slate3) | Cards, inputs, popover body |
| Hover/active bg | `--bg-hover` / `--bg-active` | `#ECEEF0` / `#E4E7EA` (slate4/5) | Row hover/selection |
| Hairline | `--border` | `#DCDEE2` (slate6) | 1px default borders |
| Hairline strong | `--border-strong` | `#B8BCC3` (slate8) | Input focus frame, table head |
| Text primary | `--ink` | `#1C2024` (slate12) | Headings, body |
| Text secondary | `--ink-muted` | `#60646C` (slate11) | Meta, captions |
| Text tertiary | `--ink-subtle` | `#8E959D` (slate9) | Placeholder, disabled |
| Accent | `--accent` | `#3E63DD` (indigo9) | Primary action, focus, links |
| Accent hover/press | `--accent-hover` | `#3358D4` (indigo10) | |
| Accent text | `--accent-text` | `#3A5BC7` (indigo11) | Links, active nav (AA on canvas) |
| On accent | `--on-accent` | `#FFFFFF` | Text on accent fills |
| Success | `--success` | `#18794E` (green11) / bg `#30A46C`(9) | OCR verified / saved |
| Warning | `--warning` | `#AD5700` (amber11) / bg `#FFB224`(9) | **Low-confidence, review-flagged** |
| Error | `--error` | `#CD2B31` (red11) / bg `#E5484D`(9) | Errors, failures |
| Info | `--info` | `#0068D6`? → indigo accent family instead | Avoid a second blue family |
| Paper (doc stage) | `--paper-bg` | `#FDFBF7` | Reading/empty document canvas |
| Paper ink | `--paper-ink` | `#2A2620` | Doc-stage prose (scanned-adjacent warm) |
| Overlay | `--overlay` | `rgb(16,17,20,0.45)` | Dimmer for dialogs |
| Focus ring | `--focus` | `2px solid #3E63DD` + `3px #3E63DD2E` | Always visible |

### 5.3 Dark theme (night session; hand-calibrated, not inverted)

| Role | Token | Dark value |
|---|---|---|
| Canvas | `--bg-canvas` | `#111113` (slate1-dark) — never pure black |
| Surface | `--bg-surface` | `#18191B` (slate2-dark) |
| Raised | `--bg-surface-2` | `#1E2023` (slate3-dark) |
| Hover/active | `#24272B` / `#2A2F35` (4/5-dark) |
| Hairline | `#30363D` (slate6-dark) |
| Hairline strong | `#4A515A` (slate8-dark) |
| Ink | `#EDEFF2` (slate12-dark) |
| Ink muted | `#9BA1AC` (slate11-dark) |
| Ink subtle | `#697077` (slate9-dark) |
| Accent | `#5E6AD2` (Linear indigo) / hover `#828FFF` |
| Success | `#46A758`(green9-dark) solid / `#93C7A5` text |
| Warning | `#FFB224` solid / `#FFCB70` text |
| Error | `#F2555A`(red9-dark) solid / `#F1A7A2` text |

### 5.4 OCR-specific status language (critical, researched from OCR tools)
- **Confidence is not a binary.** Continuous scale → continuous visual:
  - `≥0.95` — default ink, no tint (silent confidence).
  - `0.80–0.94` — subtle amber dot/underline only (visible on demand, not alarming).
  - `<0.80` — amber warning treatment + listed in a "Needs review" side list.
  - Verified-by-human — green check.
- Confidence conveys with **position: icon+text+magnitude**, never color alone.
- Document-viewer overlays: warm highlighter tints (Readwise `#FBDA83`-family) over the page image for selected text regions; bounding boxes = 1px accent hairlines with mono coordinate labels, not heavy fills.

---

## 6. Borders / radius / shadows

- **Border-first.** Every elevated object earns a 1px hairline before any shadow. Chrome borders `--border`; hover row = bg shift, border unchanged.
- **Radius vocabulary (tight tool band):**

```
radius-4    4px   keycaps, mini-chips, code seams
radius-6    6px   *buttons, inputs, selects, toggles, table cells* (Linear/Stripe/Vercel)
radius-8    8px   panels, cards, dropdowns, tooltips
radius-12   12px  dialogs, modals, toasts (ceiling for overlays)
radius-pill ∞     reserved for status badges & avatars only — NOT buttons
```

- **Shadow vocabulary** (Vercel-style stacking; three real tiers):

```
shadow-hairline   inset 0 0 0 1px rgb(16,17,20,.06)         — default card definition (optional; usually just border)
shadow-popover    0 2px 8px rgb(16,17,20,.08), 0 12px 32px -8px rgb(16,17,20,.16)
shadow-dialog     0 4px 12px rgb(16,17,20,.10), 0 24px 64px -12px rgb(16,17,20,.24)
overlay           0 0 0 9999px rgb(16,17,20,.45)            — dimmer, dialog/tooltip pads
```

- **No glow, no blur-behind chrome.** Translucency permitted only on true floating overlays (menus, command palette) at ≤8% alpha blur (Apple HIG discipline). Keep the doc stage and panels opaque.

---

## 7. Controls spec

All heights px; all radii 6 unless noted; all transitions `120–200ms ease-out`, transform/opacity/color only (Linear motion); no spring, no bounce.

- **Button (primary):** bg `--accent`, fg `--on-accent`, h32 (default) / h28 (compact), radius-6, `.px = 12/16`, text 14/510. Hover `--accent-hover`; press `--accent-press` (indigo far-step); focus ring visible. Disabled: bg `slate3`, fg `slate9`, cursor default. **Ghost (icon) buttons** default in chrome: transparent, h28–32, radius-6, fg `--ink-muted`, hover bg `--bg-hover` fg `--ink`, active bg `--bg-active`.
- **Secondary:** bg `--bg-surface`, border 1px `--border`, fg `--ink`, hover border `--border-strong`. Danger variant: fg `--error`, border error-tinted.
- **Input / textarea / search:** h32, radius-6, bg `#FFFFFF` (light) or `--bg-surface-2` (dark), border 1px `--border`, padding 8/12, text 14 (16px if likely to receive Bangla → avoid mobile zoom). Placeholder `--ink-subtle`. Focus: border `--accent` + 3px `--accent/18%` ring via shadow. Error field: border `--error` + icon + inline message below (never only color).
- **Select:** same geometry; native or minimal popover list (radius-6, bg raised, rows h28, hover `--bg-hover`; option text 14/400; active 510).
- **Toggle:** h20 × w36px or smaller h18×w32 for dense; track `slate7` off / `--accent` on, thumb white h14, radius-pill; label 13 outside, `--ink-muted → --ink`. Always label-bound (not toggle-alone) for a11y.
- **Radio/checkbox:** 16px hit, radius-4 (check) / radius-pill (radio); checked fill accent; focus ring.
- **Status chip / badge:** h20, radius-4/5, mono 12/500, 1px border of its semantic tint + 10–12% bg of same hue (Radix step-3 technique), colored dot optional. `OCR`, `Tesseract`, `Wait`, `Done`, `Low-conf`.
- **Keycap (shortcut chip):** mono 12, h20, radius-5, border 1px `--border-strong`, bg `--bg-surface-2`, inset top highlight (Raycast). e.g. `⌘ P`, `F2`, `Space`.
- **Segmented control (mode switcher — OCR engine, region type):** one h28 container, border hairline, radius-6, active segment bg `#FFFFFF`/raised + 1px + 4px shadow-popover-sm, inactive fg muted. The **preferred tab substitute** in a tool.
- **Tables:** header row h32 bottom hairline-strong, text 12/510 uppercase? (no — keep sentence case 12/510), cells h28–32, text 13; row hover `--bg-hover`; selected row `--bg-active` + left 2px accent bar; mono columns for numbers.
- **Buttons carry a leading icon slot (16px)**; text-label always present unless icon-only with tooltip + `aria-label`.

Focus order: keyboard-first. Tab order mirrors spatial order (Figma discipline). ⌘K palette handles navigation+action; every palette row shows mono keycap and result category.

---

## 8. States (empty / loading / error / disabled)

Adopt the **state matrix as a first-class deliverable** — "the browser decides if you don't."

### 8.1 Loading (choose by duration — from research timing tables)
| Duration | Treatment |
|---|---|
| 0–300ms | nothing (avoid flash) |
| 300ms–2s | **skeleton mirroring final layout** (delayed 200ms entry), `aria-busy="true"` |
| 2–10s | skeleton + inline status + **cancel** |
| 10s+ (OCR jobs) | job runner: page thumbnails, `Indexing page 3/41`, **honest progress bar** (real percent), cancel/resume; notification by default |

- Skeleton: neutral blocks matching final shape — no fake text, no clickable bits, subtle 1–2s shimmer; **respect `prefers-reduced-motion`** (static skeleton).
- Per-region failure → region-level skeleton, other regions stay live (independent error boundaries).
- Page/image loads: single 1px accent progress hair at top of viewer — not a spinner.

### 8.2 Empty (initial ≠ filtered — never the same message)
Four-part formula: **quiet glyph → short heading → one-line "why + what appears here" → exactly one primary CTA** (+ one secondary link max).
- Initial empty (no documents yet): "No pages yet." → primary *Select an image*, ghost *Open sample Bengali page* (sample data teaches the filled state — Readwise/Webflow tactic).
- Filtered empty (OCR batch filtered to zero): **"No pages match your filter"** + *Clear filters* chip showing active filters (Linear/Notion pattern). Do NOT show a *Create* CTA here.
- Search empty: restate query, offer recent similes.
- **Never a dead end** — always one way onward.

### 8.3 Error (specific, recoverable, context-preserving)
- Local-inline over toast over modal, in that order (Figma/stripe rule: fix-inline → inform → block).
- Anatomy: plain-language "what happened" + "is my work safe?" + action (*Retry*, *Try other page*, *Contact support*). Error code as secondary detail.
- **Distinguish failure modes:** network vs model error vs empty page vs permission/rate-limit — each has its own copy + action.
- **Toast = transient only** (mono timestamped, hairline, radius-12, auto-dismiss 4s, `aria-live=polite`). Persistent problems live inline.
- OCR page that yields nothing: not an error — an *empty result* state with "Page appears unreadable — adjust DPI/rotation/binarization" retry ladder.

### 8.4 Disabled
- fg `--ink-subtle`, icon 50%, no color bg change, cursor default; retain layout space (no shift).
- Disabled ≠ hidden: if state explains itself, show a text reason (e.g. "Requires an image loaded") rather than a silent grayed button.

---

## 9. Settings UI pattern

Model: **Linear/Stripe-style settings** — flat, sectioned, no card-per-setting.
- Left rail (list of groups) when >4 groups; otherwise group tabs at top. Groups by color only via section headers with hairlines (`border-bottom`), not cards.
- Each row: **label (14/400) left**, **value/control right-aligned**; **edit in place** (click value → becomes input/select) or inline rows; no modal overload. Density segment: Comfortable/Compact.
- Grouping: 24px padding, 32px between groups, 16px between rows.
- Keyboard section rendered as a table with mono keycap chips + description + (optional) rebind input (mono 13, 1px dashed focus).
- Danger zone: last section, separated by hairline, fg error, no colors elsewhere in the page.
- Scope of relevance to this product: OCR engine selection (Tesseract vs cloud), page range string input with `1-10, 15` mono syntax + inline validation (Stripe AmountInput-style), confidence threshold slider, theme (light/dark/system), density, highlight colors (warm palette), shortcut remap.

---

## 10. Accessibility notes (non-negotiable constraints)

- **WCAG 2.2 AA target.** Text 4.5:1; UI components 3:1 non-text (borders: use step 7/8 or `--border-strong`; focus ring always).
- **Contrast is engineered in** via Radix step-mapping (§5.1), not eyeballed. If a pair fails, move a step — never tweak a hex.
- **Focus-visible everywhere** — 2px accent ring + 3px translucent spread; never `outline: none` without replacement.
- **Bangla specifics:** line-height ≥1.5 at minimum (aim 1.6–1.75 body); never crop matra/descenders in rows or scroll containers; large-type support at 200% zoom without loss; no synthetic italics; test conjuncts `ক্ষ জ্ঞ ঞ্জ ক্ষ্ম` and vowel signs in every new container.
- **State changes announced:** `aria-live` for OCR progress and dynamic lists; `role=alert` for persistent errors; `aria-busy` on loading regions.
- **Keyboard everything is a feature:** ⌘K palette, arrow navigation in image viewer (prev/next page), space-to-pan, F2 rename — with visible keycaps so it's discoverable (invoice fly-style).
- **Reduced motion** honored for shimmer/skeleton/transitions.
- **Touch/min sizes:** interactive rows 44px on touch; in dense tables, 28px row + 44px padded targets via hit-area expansion.
- **Labels always present** (Figma's labeling-for-accessibility lesson), even in icon-only chrome (tooltips + aria-labels).
- Color is never the sole carrier (confidence uses shape+number).

---

## 11. Anti-patterns — deliberately avoid

From every researched system's "rejects," distilled:

1. **AI-dashboard gradients** (purple/pink/teal rainbow orbs, glassmorphic hero blobs, glow buttons). One red flag: any two hues straddling the wheel in a hero = reject.
2. **Excessive glassmorphism** — blur-behind-everything. Translucency only on true floating overlays; keep panels opaque.
3. **Card spam** — every block inside a rounded bordered card with padding. Prefer flat sections separated by spacing + hairlines.
4. **Multiple radius personalities** mixing on one screen (6px input + 16px card + 9999 pill buttons). Stay in the 4–12 band; pill = badges/avatars only.
5. **Multi-color accent families** (blue links + purple active + teal hover). One accent + a distinct semantic set.
6. **Bold-everything hierarchy.** Weights capped at 600; emphasis via size/spacing/weight-510 first.
7. **Heavy/glow shadows** (`shadow-lg`, colored glows). Elevation = hairline + surface step; shadows only for overlays.
8. **Pure `#000` black or `#fff` white screens.** Blue-tinted near-charcoals; hairline-not-jet.
9. **Spinner-everything loading.** Skeletons with layout preview, honest progress for jobs, nothing loaded <300ms.
10. **Generic "Something went wrong"** errors; not differentiating initial-empty vs filtered-empty states.
11. **Pill-shaped primary CTAs** in an instrument (Stripe/Vercel use them marketing-side; Linear/Raycast do not in product). Keep primary actions in the tight radius band.
12. **Decorative motion** (bouncy springs, random floats, parallax). 100–250ms responsive feedback only.
13. **Centered long-form Bangla text or justified body** — left-align always; justified breaks Indic spacing.
14. **Emoji icons / colorful icon fills.** One-weight outline 16/20px icon set, mono labels everywhere NI-style.
15. **Faking progress** — a progress bar must reflect real OCR progress or it erodes trust forever.

---

## 12. Applying to the OCR workflow (binding map)

| Surface | Language |
|---|---|
| Import/scan list, documents | Data table: productive type, 28–32px rows, mono columns (`confirmed`, `conf`, `pages`) |
| Page viewer | The lightbox: paper canvas, image centered, accent 1px region boxes, warm highlight tints, mono coordinates bottom-left |
| Extracted-text pane | Reading surface: Noto Serif Bengali 18px/1.7, narrow measure, chrome that fades |
| OCR job runner | Progress + page thumbnails + honest bar + cancel; notifications |
| Confidence review | Amber-tinted flagged rows, "Needs review" side list, green verified chips |
| Settings | Linear-style sectioned flat panel, mono keycap table, density & theme controls |
| Command palette | ⌘K; rows = icon + label + mono keycap; the identity moment |

---

## 13. References (real URLs)

**Core design languages**
- Linear design tokens & aesthetic analysis — https://www.shadcn.io/design/linear ; https://github.com/educlopez/design-bites/blob/main/design-mds/linear.app/DESIGN.md ; https://www.reseedapp.com/demo/linear ; https://www.designsystems.one/design-systems/linear
- Raycast — https://www.shadcn.io/design/raycast ; https://designbycurio.com/learn/raycast-2024 ; https://duply.ai/raycast/design-md
- Stripe accessible color systems — https://stripe.com/blog/accessible-color-systems ; Stripe design tokens — https://www.designsystems.one/design-systems/stripe-design ; https://stripe.design/
- Vercel/Geist — https://vercel.com/geist/typography ; https://github.com/vercel/geist-font ; https://www.shadcn.io/design/vercel
- IBM Carbon — https://carbondesignsystem.com/elements/spacing/overview/ ; https://carbondesignsystem.com/elements/typography/overview/ ; https://carbondesignsystem.com/elements/2x-grid/overview/ ; density condensed components — https://github.com/carbon-design-system/carbon/issues/6202
- Radix Themes — https://www.radix-ui.com/themes/docs/theme/typography ; https://www.radix-ui.com/themes/docs/theme/spacing
- Radix Colors (12-step semantics, APCA, guarantees) — https://www.radix-ui.com/colors ; https://www.radix-ui.com/colors/docs/palette-composition/understanding-the-scale ; https://colorfyi.com/blog/radix-ui-colors-guide/
- Microsoft Fluent 2 — https://fluent2.microsoft.design/typography ; https://fluent2.microsoft.design/layout ; density tokens — https://github.com/microsoft/fast/issues/5510
- Figma on Figma: UI3 — https://www.figma.com/blog/our-approach-to-designing-ui3/ ; Figma principles — https://rsms.me/work/figma/ ; density-vs-clarity — https://webdesignerdepot.com/density-vs-clarity-the-core-tension-in-modern-ui-design/

**Reading / instrument aesthetics**
- Readwise Reader design — https://blakecrosley.com/guides/design/readwise-reader ; Readwise tokens — https://styles.refero.design/style/34c8dbee-f5d9-4495-a0e0-a25c6ca4b95b
- Obsidian design — https://blakecrosley.com/guides/design/obsidian
- Ableton brand/typography — https://styles.refero.design/style/e5081033-bd79-479a-aef6-8b002df6086a ; Ableton Push — https://disegnojournal.com/newsfeed/the-portable-orchestra-ableton-push-3
- Teenage Engineering constraints-as-aesthetic — https://blakecrosley.com/guides/design/teenage-engineering ; Maschine typography-first hardware — https://fontsinuse.com/uses/43145/maschine-mk3-dinamo

**Bangla typography**
- Noto Sans Bengali (Google Fonts) — https://fonts.google.com/noto/specimen/Noto+Sans+Bengali ; Noto Sans Bengali UI — https://notofonts.github.io/noto-docs/specimen/NotoSansBengaliUI/
- W3C Bengali Layout Requirements — https://www.w3.org/TR/beng-lreq/
- Bangla font pairing guidance — https://www.fontarray.com/blog/best-fonts-for-bangla-design
- Rochona open dual-weight Bangla — https://github.com/InanXR/Rochona

**States**
- Empty/loading/error pattern guidance — https://uxpatternsguide.com/compare/loading-skeleton-vs-empty-state-vs-error-state/ ; https://atekian.com/en/blog/designing-empty-loading-and-error-states ; https://kompassify.com/blog/empty-states-guide ; NN/g empty states — https://www.nngroup.com/articles/empty-state-interface-design/ ; loading/skeleton UX — https://www.saasui.design/blog/saas-loading-skeleton-ux-patterns

**OCR UI analogues (document/OCR workbench patterns)**
- AnyDoc Studio (review-first OCR) — https://github.com/murilonerdx/anydoc-studio ; OCR Studio — https://github.com/TheSupremeUltimate/OCR_STUDIO ; Retab UI (doc pipeline components) — https://github.com/retab-dev/retab-ui
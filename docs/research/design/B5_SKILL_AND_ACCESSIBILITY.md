# B5 — Skill Search & Accessibility Foundations for Ordinary Chobi Reader

**Purpose:** (1) Document the local-machine search for a "Teste" design skill and the exact guidance extracted from any related design skill found; (2) extract concrete, citation-backed accessibility and design principles from authoritative sources (Material 3, Apple HIG, Fluent 2, IBM Carbon, Nielsen Norman Group, WCAG 2.2, and open-source design systems — Radix Themes, Uber Base, Chakra, GitLab Pajamas); (3) produce a WCAG 2.2 compliance checklist for a minimal, accessibility-first, typography-led, Bangla-first OCR web-app; (4) translate those principles into an accessible OCR workflow.

**Agent context:** This document feeds the "Ordinary Chobi Reader" design system (see B1 `B1_PRODUCT_UX.md`, B2 `B2_MINIMAL_DESIGN.md`, B3 `B3_OCR_ANIMATION.md`, B4 `B4_DEVTOOL_UX.md`).

---

## 1. Teste Skill Determination

### 1.1 What I searched (read-only, case-insensitive, name + content)

| Location | Method | Result |
|---|---|---|
| `G:\AO projects\OCRBangla` (project) | Glob `**/SKILL.md`, `**/*.md`, glob for `.opencode`, `.config`, `skills` dirs | No SKILL.md; no `.opencode/`, `.config/`, or `skills/` folder in the project |
| `C:\Users\raiya` (user profile) | Glob `**/SKILL.md`, `**/.opencode/**`, `**/skill*/**/SKILL.md` | No SKILL.md under the profile outside tool caches |
| `C:\Users\raiya\.config\opencode` | Read `opencode.jsonc` (only `$schema` line); glob for skills | No skills folder; only `node_modules/@opencode-ai/plugin` internals (`skill.js`) |
| `C:\Users\raiya\.opencode` | Test-Path + recurse | Does not exist |
| `%APPDATA%\opencode` (`C:\Users\raiya\AppData\Roaming\opencode`) | Test-Path + recurse | Does not exist |
| `%LOCALAPPDATA%\opencode` | Test-Path + recurse | Does not exist |
| All `SKILL.md` under `C:\Users\raiya\.codex\.tmp\plugins` | Enumerated ~100+ skill dirs; content grep for `teste` | No "teste" match in any skill name or content |
| Plugin cache skill dirs | `Where-Object { Name -match "test|design|accessib|ui|ux|frontend|web" }` | Only `test-triage`, `testing-data-visualizations`, `test-driven-development`, `test-android-apps` (none is a *design* skill named "Teste") |
| `.codex\skills\.system` | Listed | `imagegen`, `openai-docs`, `plugin-creator`, `review-agent`, `skill-creator`, `skill-installer` (system skills, not design/teste) |

### 1.2 Determination

**A skill named "Teste" (or "teste") does NOT exist in this environment.** There is no OpenCode skills directory at all here: the only OpenCode skill available is the built-in global `customize-opencode`. The search covered every requested location plus a content-level grep of every SKILL.md reachable on the machine.

However, the machine does contain a **Codex tool plugin cache** (not OpenCode) at `C:\Users\raiya\.codex\.tmp\plugins\plugins\`, holding genuine **design/frontend skills**. The two most relevant were read in full:

- `build-web-apps/skills/frontend-app-builder/SKILL.md`
- `build-web-data-visualization/skills/accessibility-and-inclusive-visualization/SKILL.md` (+ its three reference files)

### 1.3 Exact guidance extracted (from those skills — quoted/summarized verbatim-by-content)

**From `frontend-app-builder` (design-system discipline):**
- Two priorities outrank everything: (1) great design first (clean, airy, readable), (2) do not stop until accepted design and browser implementation match 10/10.
- **Build a small design system from the accepted concept before coding:** tokens, typography, component families, variants, spacing, icon treatment, and container rules. Include **both content typography and UI-chrome typography** (toolbars, editors, dashboards).
- Typography: "clear hierarchy, scale, weight, line height, label treatment" — control/chrome text "must never fall back to browser-default sizing"; define typography on controls deliberately.
- "Simpler by default: use fewer, stronger visual elements instead of filling the page with… decorative widgets."
- Color fidelity: tokenize, "Color lock" the exact backgrounds (do not substitute cream/off-white for white); sample tokens (background, surface, text, border, shadow, accent, semantic colors, radii, spacing scale, motion timing).
- "Add motion only where it supports the design. Respect accessibility and `prefers-reduced-motion`."
- Implementation quality: "semantic markup, stable responsive dimensions", type/lint/test checks; for accessibility needs, **change element semantics (e.g., H1/heading levels) rather than inventing compensating visible copy**.

**From `accessibility-and-inclusive-visualization` (+ its references):**
- "Accessibility is not a post-processing step"; every important visualization needs a **non-visual path to the key insight**: surrounding text, direct labels, data tables, or formal text alternatives.
- Decide what information "must remain available without hover, color discrimination, pointer precision, expanded panels…".
- **Text alternatives:** short alt text is not enough for complex charts — the key insight, structure, and notable values may need a longer description or adjacent narrative; data tables and summaries are part of the strategy; *common mistake*: alt text that only names the chart type.
- **Color & redundant encoding:** use structured sequential/diverging schemes, not arbitrary rainbows; add labels, shapes, line styles, or ordering when color carries meaning; check contrast for marks/text/annotations not just backgrounds; **normal text ≥ 4.5:1, large text ≥ 3:1, meaningful graphics/UI-state ≥ 3:1**; check adjacent-mark contrast (stacked bars, thresholds, selected outlines); keep a **color-role ledger** so one hue doesn't mean many unrelated things.
- **Keyboard / SR / export:** essential info must not depend on pointer hover; focus order and state visibility matter for controls; exports need their own accessibility strategy; streaming/remote surfaces should expose live/stale/offline/reconnecting state to assistive tech.
- **Diagrams & interactive visuals:** keep search, selection, details panels, reset, export, expand/collapse, drill-down reachable **without pointer-only interaction**; preserve a text outline of nodes/groups/relationships for UML/ERD/workflow-style diagrams.
- **Animation:** specify reduced-motion behavior and a key-frame/final-state fallback; motion must be disable-able without losing the evidence.

---

## 2. Design-Source Principles

Bulleted, concrete, per source. URL citations in Section 5.

### 2.1 Material Design (Material 3)
- **Structure via landmarks & headings (a11y "Structure" page):** use ARIA landmark roles (`navigation`, `main`, `banner`, `complementary`, `contentinfo`, `region`, `form`, `search`); add unique labels to any landmark that repeats; don't repeat the role word in the label; identify headings by *content hierarchy*, not visual styling; don't skip levels (H2→H4); one `H1` per page recommended.
- **Target sizes:** follow the touch/pointer target guidelines — targets ≥ 48×48 dp with visible focus; spacing between targets.
- **Color/contrast:** WCAG AA — 4.5:1 normal text, 3:1 large text; use the color tool; test hierarchy through structure, not color only.
- **Focus control:** define keyboard & reading focus for frequent tasks; decide focus order, grouping, and where focus moves when the focused element disappears; keep focus indicators visible.
- **Labeling:** accessible labels for icon buttons with no visible text, interactive images, progress bars, error indicators, meaningful icons/images; **describe purpose, not appearance** ("Voice search", not "Microphone"); don't include element type in the label; mark decorative images hidden; assign ARIA roles to interactive elements.
- **Motion:** support W3C reduced-motion; avoid flashing large screen regions; use motion only to guide focus.
- **Prefer native/semantic elements** (dialogs as dialogs, buttons as buttons) — they carry AT markup for free.

### 2.2 Apple Human Interface Guidelines
- **Perceivable:** never convey info through a single sense/method; support sight, hearing, speech, touch.
- **Dynamic Type / text scaling:** support font-size enlargement ~200% (iOS); custom fonts must behave like system fonts; default type sizes (iOS 17 pt default, no lower than 11 pt min; macOS 13/10). **Avoid thin/ultralight weights — prefer Regular/Medium/Semibold/Bold**, especially at small sizes.
- **Contrast:** match WCAG AA — ≤17 pt ≥ 4.5:1; 18 pt ≥ 3:1; bold ≥ 3:1; verify in light & dark mode; APCA also cited as a standard.
- **Target sizes:** default control size iOS 44×44 pt, minimum 28×28 pt (three iOS 44-pt guidance in legacy docs).
- **Motion:** reduce parallax/bounce; tighten springs; track animation with gestures; honor Reduce Motion.
- **Adaptable:** interface adapts to user's preferred input (VoiceOver, Switch Control, keyboard).

### 2.3 Microsoft Fluent 2
- **Accessibility baseline:** components meet or exceed WCAG 2.1 AA; design for keyboard, screen readers, text-to-braille from the first wireframe.
- **Focus management:** "manage focus" — focus follows a logical left-to-right/top-to-bottom "z" pattern and must **not be lost after closing a dialog or temporary UI**; let keyboard users visually determine what they'll interact with.
- **Color:** standard text ≥ 4.5:1; large text (≥ 18.5 px bold or 24 px regular) ≥ 3:1; interactive and non-text components ≥ 3:1 against adjacent colors.
- **Tokens, two layers:** *global tokens* (raw values: color, typography, spacing, elevation) and *alias tokens* (semantic meaning; e.g., theming). Tokens must support light/dark/high-contrast/brand theming with sufficient contrast out of the box. 4 px base spacing ramp.
- **Code standards:** logical, semantic code; WAI-ARIA Authoring Practices; meaningful text; rich media alternatives.
- **Type ramp** tokens (`typeRampBase`…`typeRampPlus6`) plus a **density modifier** token — scale the whole ramp rather than restyling one component.

### 2.4 IBM Carbon (v11 / preview site: expressive tokens + data-forward density)
- **Productive vs expressive type sets:** *productive* base 14 px, fixed headings, for dense task-focused product UI (tables, forms, consoles); *expressive* base 16 px, fluid headings, for editorial/page-level contrast ("moments" — home pages, headers, empty states). Type tokens carry role (e.g., `$label-01`, `$caption-01`, `$body-compact-01/02`, `$code-01/02`). **Keep type styles consistent within a task/component/region — mixing jumbles hierarchy.**
- **Role-based color tokens, theme-independent names:** tokens abstract role from value; the same token name maps to different values per theme; layering model groups (`Background`, `Layer`, `Field`, `Border`, `Text`) + core groups; interaction-state tokens (hover/active/focus) tokenized as "half-steps"; 4 default themes (White, Gray 10 light; Gray 100, Gray 90 dark); neutral gray family organizes content into zones; core blue = primary action.
- **Motion tokens:** two modes (productive, expressive) via `@carbon/motion`.
- **Data-forward density:** every component documents usage/style/code/**accessibility** guidance; data tables over card grids for dense data.

### 2.5 Nielsen Norman Group (UX writing / progressive disclosure / empty states / errors)
- **UX writing:** users scan; keep copy concise; plain spoken language; present tense + active voice; verbs over noun phrases; avoid jargon, acronyms, internal labels; provide constraints **upfront** (before the user types), don't wait for failure.
- **Progressive disclosure:** defer advanced/rarely used features (e.g., advanced OCR settings) to a secondary screen; presence on the primary display signals importance; make progression obvious; chunk advanced features into coherent groups; staged disclosure (wizards) works for linear flows; reduces error rate for novices.
- **Empty states (complex apps):** never default to a totally empty region (looks like a loading/error bug); when data genuinely doesn't exist, use the empty state to **teach and give next steps** ("Star your favorites to list them here") or show a brief system-status message ("No records for the selected date range"); avoid false "No records" while still loading; wire instructions directly to the action/link.
- **Error messages:** must not rely on visuals alone; include copy; human-readable; concise and precise ("the exact problem"); hide obscure codes except for diagnostics; **preserve user input**; minimize correction effort (suggest/make fixes); friendly, never blame ("Illegal command" style forbidden); avoid premature errors (validate on field blur/step, not while typing); don't stack multiple indicators; keep error-like red styling for truly critical system messages only.

### 2.6 WCAG 2.2 (W3C)
- **1.4.3 / 1.4.11 Contrast:** text 4.5:1 (normal) / 3:1 (large ≥ 24 px or 18.66 px bold); **non-text UI components & graphical objects ≥ 3:1** against adjacent colors (focus indicators, input borders, icons, diagrams).
- **2.4.7 Focus Visible (AA):** every keyboard-operable component needs a visible focus indicator, not time-limited.
- **2.4.11 Focus Not Obscured (Minimum, AA):** focused component at least partially visible — sticky headers/footers that hide focus fail (Technique F110).
- **2.4.13 Focus Appearance (AAA):** indicator contrast ≥ 3:1 vs unfocused, and area ≥ a 2 px perimeter ring.
- **2.5.8 Target Size (Minimum, AA):** pointer targets ≥ 24×24 CSS px, or spaced so a 24 px circle per target doesn't intersect another target (exceptions: inline text, agent-controlled, essential).
- **2.5.5 Target Size (Enhanced, AAA):** 44×44 CSS px.
- **2.5.7 Dragging Movements (AA):** anything done by dragging (re-uploading/dropping files) must have a single-pointer (non-drag) alternative — i.e., **a standard file-input fallback**.
- **2.3.3 Animation from Interactions (AAA-level, apply as product standard):** motion triggered by interaction must be disableable unless essential; techniques **C39** (CSS `prefers-reduced-motion`) and **SCR40** (JS `matchMedia('(prefers-reduced-motion: reduce)')`); scrolling's own movement is essential/allowed.
- **2.3.1 / 2.2.2:** no flashing > 3×/sec; auto-updating/moving content lasting > 5 s must be pausable/stopable/hideable (progress spinners → static "Processing…" label fallback).
- **3.3.1–3.3.3 Input Assistance:** errors identified by text; labels & instructions present; error suggestions given.
- **4.1.3 Status Messages (AA):** status updates must be announced via live regions — `aria-live="polite"` for normal progress, `role="alert"`/`aria-live="assertive"` for unexpected errors that need attention; WCAG 2.2 removed 4.1.1 (obsolete parsing rule).
- **ARIA:** follow WAI-ARIA Authoring Practices; programmatic focus moves with context (dialog open → safe default button); label landmarks/regions; `aria-describedby` for helper/error text; `aria-invalid` + `aria-errormessage` on invalid fields.

### 2.7 Radix Themes (open-source)
- **Accessibility is built-in, not bolted on:** primitives follow WAI-ARIA APG; handle aria/role attributes, focus management, keyboard navigation; tested across modern browsers + common AT. You must still supply **accessible labels**.
- **Focus management moves logically** (e.g., AlertDialog opens → focus set to Cancel, anticipating the response).
- **State/data components useful for OCR web-app:** `Data List` (semantic key-value), `Progress`, `Skeleton` (layout-preserving loading placeholder), `Spinner`, `Tab Nav` (screen-reader navigation semantics for tabs), `Accessible Icon`, `Visually Hidden`, `Tooltip` (works on pointer *and* focus).
- Theme scaling + color system allow token-based adaptation; `Tooltip`/`Hover Card` content must be reachable by keyboard/SR.

### 2.8 Uber Base (Base Web / Base UI)
- **A11y-first process:** start from accessible components; research with disabled users; structure content + text alternatives; then visual design (text size, resize/dynamic type, color/contrast/dark mode, touch targets).
- **Text size:** 16 px default for most content; 14 px for secondary; never assume a style token is appropriate everywhere; verify layout under text resizing.
- **WCAG anchors:** Headings & Labels (2.4.6), Section Headings (2.4.10), Info & Relationships (1.3.1), Meaningful Sequence (1.3.2), Focus Order (2.4.3) — keep dynamic content in natural reading order (don't put the live result above the action that produces it).
- **Drag & drop lists are notoriously hard:** Base Web ships keyboard-navigable + screen-reader-reliable drag-and-drop (a model for accessible re-upload/reorder).
- **Base UI:** components handle ARIA roles, pointer interactions, keyboard, focus management; the *developer* must still style `:focus-visible` (WCAG focus appearance); Form/Input/Field/Fieldset auto-associate labels.

### 2.9 Chakra UI
- **Form control pattern (WAI-conformant):** `FormControl` provides `isInvalid` / `isRequired` / `isDisabled` context that cascades; `FormLabel` wires `htmlFor`; **`FormErrorMessage` adds `aria-describedby` + `aria-invalid` to the input**; `FormHelperText` extends `aria-describedby`; `isRequired` sets `aria-required` plus a visible indicator.
- **Aria-live discipline (from their #7831 regression):** injected live regions (toast managers) must be labeled and shouldn't announce empty states; keeps regions few and meaningful so screen readers aren't flooded.

### 2.10 GitLab Pajamas (state/empty/error documentation)
- **Empty state goals:** increase feature adoption, learnability/discovery, usability.
- **Anatomy:** title (≤ 5 words, no ending period) + description (full sentences stating actions) + optional CTA button.
- **Content rules:** simple & clear; provide guidance and motivation ("configure →"); friendly, supportive, empathetic brand voice; visuals complement, never distract.
- **Variants:** blank content (title is an active-verb CTA, one+ button aligning with the verb) vs. empty search results (no CTA — it's the user's filter, not first use) vs. higher-tier gating. **Differentiate error vs first-use vs no-results — never reuse the same design.**
- **Design review checklist:** account for all states (error, rest, loading, focus, hover, selected, disabled) and data sizes (empty / some / lots); accessibility check via browser inspector; illustrations: medium 144×144 for empty/error states, small 72×72 "spot" illustrations for tight spaces.

---

## 3. WCAG 2.2 Compliance Checklist for This App Type

Target: **WCAG 2.2 AA**, with AAA reduced-motion and focus-appearance treated as product requirements. Columns: area → criterion → check for OCRBangla surface.

### 3.1 Perceivable
| Check | CN (AA) | App-specific evidence |
|---|---|---|
| Body text contrast ≥ 4.5:1 (Bangla glyphs + Latin UI) | 1.4.3 | Verify every text/surface pair in light+dark themes; include placeholder/helper/disabled-adjacent text (don't gray out to < 4.5) |
| UI components/graphics ≥ 3:1 (buttons, borders, focus ring, icons, upload-dropzone dashed border, progress indicator, error icon) | 1.4.11 | Token-level audit of `border-strong`, `interactive`, `focus`, `status-error` |
| Text resize to 200% without loss (reflow) | 1.4.4 / 1.4.10 | Layered Bangla text must flow; no fixed-height OCR result boxes |
| Text alternatives: every meaningful image (sample document, illustration) has purpose-based alt; decorative marked hidden | 1.1.1 | OCR result is text (see §4), images are inputs-to-process + decoration |
| Meaningful sequence / programmatic order | 1.3.2 | Header → drop zone → options → results in DOM order = visual order |
| Info & relationships (headings, labels, lists) | 1.3.1 | One H1; heading levels by hierarchy; `<label for>`; list semantics for results |
| Color not sole channel (errors also have icon+text; grade badges have text) | 1.4.1 | Status colors double-encoded with text/icon/pattern |
| Adapted to landscape/zoom/contrast | 1.4.x | Test 200% zoom + forced-colors/Windows High Contrast |

### 3.2 Operable
| Check | CN (AA) | App-specific evidence |
|---|---|---|
| Full keyboard operation of entire flow (upload via 〉Tab, select file; run processing; copy result; manage key) | 2.1.1 | No pointer-only affordances anywhere |
| No keyboard traps (dialog/confirm modals) | 2.1.2 | Focus moved in-trappable only in true modals with Escape + focus return |
| Focus visible with ≥ 3:1, ≥ 2 px-perimeter indicator | 2.4.7 + 2.4.13(AAA) | Global focus token; never `outline: none` without replacement |
| Focus not obscured (sticky headers/bottom toolbars must not hide focus) | 2.4.11 | Verify flow with sticky status bar |
| Logical focus order (top→bottom; focus returns after modal/progress) | 2.4.3 | Processing "spinner" never steals focus; completion focuses results header |
| Skip-to-content link | 2.4.1 | First focusable tab stop |
| Headings & labels descriptive; section headings | 2.4.6 / 2.4.10 | Step headings: "Choose image", "Review text" |
| Target size ≥ 24×24 px (min) with spacing; aim 44×44 for primary controls | 2.5.8 (AA) / 2.5.5 (AAA) | Upload, re-upload, copy, toggle buttons |
| **Drag-drop has single-pointer alternative — file input fallback** | **2.5.7** | Dropzone click opens native file picker; keyboard-activated |
| Motion disable-able unless essential | 2.3.3 (AAA-req) | `prefers-reduced-motion` gates all processing/scan animations; fallback static "Processing…" |
| No flashing > 3×/sec; > 5 s auto-updates pausable | 2.3.1 / 2.2.2 | Progress = aria-live text, not blinking animation |

### 3.3 Understandable
| Check | CN (AA) | App-specific evidence |
|---|---|---|
| Page language + **per-page text** and inner `lang`/`dir` (Bangla `bn`/`LTR` mixes with English terms) | 3.1.1 / 3.1.2 | `<html lang="bn">`; mark mixed-language spans |
| Stable/unambiguous input labels & instructions (contextual helper text) | 3.3.2 | API-key field has visible helper: what it's for, where to get it |
| Error identification + suggestions; preserve input; no premature red | 3.3.1 / 3.3.3 (+NN/g) | Validate on blur/step; message = what went wrong + fix; keep key masked |
| Consistent layout/navigation/help location | 3.2.3 / 3.2.6 | Settings & API-key panel reachable consistently |
| Consistent help (same place across pages) | 3.2.6 | "How to get an API key" stable link |
| Status messages announced (polite for progress; assertive/`role=alert` for unexpected errors) | 4.1.3 | OCR progress + completion/error via live regions; no auto-dismiss of errors (Pajamas/SubUX rule) |

### 3.4 Robust
| Check | CN (AA) | App-specific evidence |
|---|---|---|
| Valid, semantic HTML; correct ARIA roles/states | 4.1.2 (parsing rule 4.1.1 removed in 2.2) | Native controls + ARIA only where needed (per Radix/Base model) |
| Custom components expose name, role, value to AT | 4.1.2 | Toggle buttons `aria-pressed`; live regions labeled; progress with accessible name |
| Reduced-motion + forced-colors support retains meaning | 2.3.3 / 1.4.7+ | Static text fallbacks preserve flow/direction/focus |

---

## 4. Accessible OCR-Workflow Guidance

Concrete mapping of the principles to the Ordinary Chobi Reader flow (drop/upload → process → result → act).

1. **Upload & re-upload (drag-drop is NOT the only path).** Dropzone = styled label wrapping a native `<input type="file">` (Base Web model: drag-and-drop is always paired with a real control). Click/tap opens the picker; Enter/Space on the focused dropzone opens it too (**WCAG 2.5.7** single-pointer alternative). Announce "Image selected: filename" politely. On wrong/dropped files, `role="alert"` error with a recovery action ("Choose a different image") and keep the previous image until replacement succeeds (**NN/g: preserve user effort, never a dead end**).

2. **Progressive disclosure for a "minimal" tool.** Primary surface = one image + one big "Read text" action. Advanced controls (model engine, language hints, pre-processing options, API-key settings) live behind clearly-labeled secondary panels (**NN/g progressive disclosure; a 'settings' disclosure per WAI-ARIA APG disclosure pattern**). The presence of the primary action signals it's the most important task; nothing hidden rides on hover.

3. **Processing status = live region, static fallback, no stolen focus.** Progress announced via `aria-live="polite"` text ("Reading the image… step 2 of 3"); a `Progress`/`Skeleton` component shows layout without hiding it; under `prefers-reduced-motion`, progress is a static label (WCAG 2.3.3; C39/SCR40). When done, set focus to the results heading and announce "Text ready — 240 words" pompously *polite*; do not move focus into body content automatically. Expose live/stale/offline states if a remote engine is used (**accessibility skill: name the state to AT**).

4. **Results as accessible text (not an image).** The OCR output is real text in a copyable `output` area — never a screenshot of text. Structure as headings + paragraphs with correct Bangla `lang`/`dir`; offer copy and "Copy as .txt" as keyboard-reachable single actions. Keep redundant encodings: confidence/grade shown as text badge, not color alone (1.4.1).

5. **Accessible diagrams & image results.** For "diagram/image → text" features, provide the OCR'd text as the equivalent of a complex-image long description; if a comparison view (original vs. text) is offered, the text must be reachable via a disclosure/keyboard, not hover — per the `accessibility-and-inclusive-visualization` skill: keep a **text outline** of what the image contains and preserve the same claim/caveat surface as the visual. Never let alt text only say "Diagram".

6. **API-key / password field pattern (APG + GOV.UK + Make Things Accessible model).**
   - Real `<label for>` describing purpose; visible helper text joined via **`aria-describedby`** (what the key is for, where to create one) so requirement is stated up-front (NN/g: constraints upfront), not on error.
   - Masked `type="password"` + a **real `<button>` toggle** labelled "Show key" (meaningful name; per W3C APG disclosure + GOV.UK): toggle `input.type` password↔text; set `aria-pressed` (or swap label consistently — never toggle both label and pressed erratically); **announce via `aria-live`/hidden text "Key is shown"/"Key is hidden"** (GOV.UK: never announce the key *value* itself — ear-shot shoulder-surfing risk).
   - Preserve value on error (re-submit keeps the key); no `autocomplete` foot-guns; `aria-invalid` + `aria-errormessage` when rejected; validation on submit/blur, never per-keystroke hostility.
   - Provide "Test connection" that announces success/failure via polite/assertive live region; failure keeps focus near the field with a recovery hint.

7. **Empty & error states (NN/g + Pajamas anatomy).** First-use empty state: title ≤ 5 words + active-verb description + CTA ("No reads yet — Read your first image"; CTA opens the picker). No-results (filtered/empty result): different copy, no fake CTA, dead-end forbidden — always a recovery action, never auto-dismissing, never exposing raw error codes (show friendly diagnosis; hide technical detail behind diagnostics). Do **not** show "No records" while still loading.

8. **Status-announcement summary for SR users (aria-live cheat sheet).**
   - `role="region" aria-label="Status"` wrapper holds progress/completion announcements.
   - `aria-live="polite"`: file selected, processing started, result ready, copy confirmed.
   - `role="alert"` (assertive): unsupported file type, OCR failure, API-key invalid, network stale.
   - Keep announcements atomic and non-empty (Chakra #7831 lesson: don't inject empty/noisy regions).

9. **Test matrix (via browser a11y inspector, keyboard-only pass, NVDA/VoiceOver + Bangla SR pass):** empty/some/lots data (Pajamas rule), error/rest/loading/focus/hover/selected/disabled states, light+dark+high-contrast, 200% zoom, `prefers-reduced-motion: reduce` emulation, Windows forced-colors.

---

## 5. References (real URLs)

**Skill-search artifacts (local, not URLs):**
- `C:\Users\raiya\.codex\.tmp\plugins\plugins\build-web-apps\skills\frontend-app-builder\SKILL.md`
- `C:\Users\raiya\.codex\.tmp\plugins\plugins\build-web-data-visualization\skills\accessibility-and-inclusive-visualization\SKILL.md` and `references\keyboard-screen-reader-and-export.md`, `references\text-alternatives-and-complex-images.md`, `references\color-contrast-and-redundant-encoding.md`

**Material Design 3 / Material Design**
- https://m3.material.io/foundations/designing/structure
- https://m3.material.io/foundations/designing/elements
- https://m3.material.io/foundations/designing/overview
- https://m3.material.io/styles/typography
- https://material.io/design/usability/accessibility

**Apple Human Interface Guidelines**
- https://developer.apple.com/design/human-interface-guidelines/accessibility
- https://developer.apple.com/design/human-interface-guidelines/foundations/typography

**Microsoft Fluent 2**
- https://fluent2.microsoft.design/accessibility
- https://fluent2.microsoft.design/design-tokens
- https://fluent2.microsoft.design/color-tokens
- https://fluent2.microsoft.design/layout
- https://learn.microsoft.com/en-us/fluent-ui/web-components/getting-started/styling

**IBM Carbon**
- https://carbondesignsystem.com/elements/color/overview
- https://preview.carbondesignsystem.com/building-blocks/foundations/typography/type-sets
- https://v10.carbondesignsystem.com/guidelines/typography/overview
- https://preview.carbondesignsystem.com/building-blocks/foundations/color/overview
- https://carbondesignsystem.com/patterns/empty-states-pattern

**Nielsen Norman Group**
- https://www.nngroup.com/articles/error-message-guidelines/
- https://www.nngroup.com/articles/empty-state-interface-design
- https://www.nngroup.com/articles/progressive-disclosure
- https://www.nngroup.com/articles/ux-writing-study-guide
- https://media.nngroup.com/media/articles/attachments/Hostile-Error-Messages.pdf

**W3C WCAG 2.2 / WAI / APG**
- https://www.w3.org/WAI/WCAG22/Understanding/focus-visible.html (2.4.7)
- https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html (2.4.11)
- https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html (2.3.3)
- https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html (2.5.8)
- https://www.w3.org/WAI/WCAG22/Understanding/target-size-enhanced.html (2.5.5)
- https://www.w3.org/WAI/WCAG22/Techniques/css/C39 (prefers-reduced-motion CSS)
- https://www.w3.org/WAI/WCAG22/Techniques/client-side-script/SCR40 (prefers-reduced-motion JS)
- https://www.w3.org/WAI/WCAG21/Understanding/animation-from-interactions.html
- https://w3.org/WAI/standards-guidelines/wcag/new-in-22
- https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/
- https://www.w3.org/WAI/tutorials/forms/examples/password
- https://webaim.org/techniques/forms/advanced
- https://webaim.org/standards/wcag/wcag22

**Open-source design systems**
- https://www.radix-ui.com/primitives/docs/overview/accessibility
- https://www.radix-ui.com/themes/docs/components
- https://www.radix-ui.com/blog/themes-3
- https://base.uber.com/ (Base design system; a11y pages)
- https://www.uber.com/blog/introducing-base-web
- https://base-ui.com/react/overview/accessibility
- https://v2.chakra-ui.com/docs/components/form-control
- https://github.com/chakra-ui/chakra-ui/issues/7831 (aria-live lesson)
- https://design.gitlab.com/patterns/empty-states
- https://design.gitlab.com/product-foundations/illustration
- https://gitlab.cse.iitb.ac.in/help/development/contributing/design.md

**Password reveal / API-key field**
- https://technology.blog.gov.uk/2021/04/19/simple-things-are-complicated-making-a-show-password-option
- https://www.makethingsaccessible.com/guides/make-an-accessible-password-reveal-input
- https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/

**Accessible coloring / charts (WAI)**
- https://www.w3.org/WAI/tutorials/images/complex/
- https://www.w3.org/WAI/WCAG22/Understanding/use-of-color
- https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast
- https://colorbrewer2.org/
# B4 — Dev-Tool / AI-Infra UX Patterns for Ordinary Chobi Reader

**Purpose:** Extract concrete, transferable interface patterns from AI/dev/research tools for a Bangla-first OCR web app's *model switching, provider config, evaluation, benchmarking, and batch-job surfaces*.

**Scope note:** OCR evaluation tools (ocrevalUAtion, dinglehopper, OCR-D) are especially relevant since the product is OCR, not chat; LLM tool UIs (LM Studio, Open WebUI, SillyTavern) are relevant for provider/model management; CI/test UIs (GitHub Actions, Playwright, Vercel) are relevant for batch-queue status.

---

## 1. Studied Products

| Category | Product / Tool |
|---|---|
| Local/desktop model runners | LM Studio (model picker, variant picker, RAM/VRAM estimation), Jan (model providers, local API server), Msty (Model Hub, Model Squad, VRAM/Cost calculators), text-generation-webui |
| Self-hosted & user-facing LLM UIs | Open WebUI (providers + connections), SillyTavern (API connections, connection profiles), Hugging Face Chat UI, Continue.dev |
| IDE / command-palette tooling | VS Code (Language Models editor, BYOK, Quick Pick provider list), JetBrains AI Assistant (providers & API keys, Test Connection), VSModelSwitch (sidebar provider/endpoint key/model manager) |
| Credential management | Open WebUI API keys (show/copy/overwrite), Jan agent config (masked "(unchanged)" key semantics), Msty Nexus client tokens (shown once), OpenClaw (env-var vs config key provenance) |
| Benchmark leaderboards | Open LLM Leaderboard v2 (HF), LMArena / Chatbot Arena, Artificial Analysis (Intelligence/speed/price), LLM-Stats |
| Eval frameworks / dashboards | Ragas (app.ragas.io), DeepEval, HF Evaluate (CER/WER metrics), LMSYS MT-Bench |
| OCR-specific eval | ocrevalUAtion (side-by-side GT-vs-OCR diff table + CER/WER), dinglehopper (Qurator, error visualization), OCR-D ocrmultieval, PRImA TextEval, ISRI ocreval, cherry-picked confusion-matrix studies |
| CI / batch runners | GitHub Actions (workflow/job/step log tree), Playwright HTML reporter (per-file/per-test status table), Playwright dot reporter, GitHub Job Summary tables, Vercel deployments & build logs |
| Diff/review tools | JetBrains diff viewer (side-by-side/unified), git diff-highlight & delta (word-level highlight), text-diff-viewer (jsdiff), GitHub PR diff |

---

## 2. Model-Selector Patterns

1. **Instant "always-visible" model dropdown with per-model affordances.**
   LM Studio/Ollama keep a primary model picker in the main toolbar (dropdown of currently loaded models) plus a `⌘K`/`Ctrl+M` shortcut. Model appears with quant badge (e.g. `Q4_K_M`) and a parameter-count hint. *(LM Studio docs, HF hub-lmstudio doc)*

2. **Variant sub-selector under a model.**
   LM Studio 0.3.28 adds a variant picker (GGUF vs MLX, 4/6/8-bit) shown *after* choosing a root model — pick the qualifier, not the base name. Layout: model identity → variant chips/row. Recommended-for-hardware variant is defaulted and *supported* vs *unsupported* variants marked (e.g. "works on your Mac" indicator in HF→LM Studio flow).

3. **Preset templates that auto-fill endpoint + key requirement.**
   co-switch and Jan use provider **presets**: pick "OpenAI Official", name+endpoint auto-filled, only the API key field is left open; notes field optional. This collapses a 5-field config into "choose preset → paste key → Add". *(co-switch user-manual)*

4. **Searchable model catalog / command-palette picker.**
   ChatGPT desktop opens the model picker with `Ctrl+Shift+M`; VS Code model picker supports filter syntax (`@provider:"OpenAI"`, `@capability:vision`, `@visible:true`). For OCR, translate to capability filters: `@capability:bangla`, `@capability:reading-order`, `vision-required`. *(VS Code docs; learn.chatgpt.com)*

5. **Capability hint chips inside the picker entry.**
   Msty tags models by purpose (Text / Coding / Tools / Vision / Embedding / Thinking); Open WebUI auto-detects available models and lets admins apply an allowlist ("Model IDs filter") and a **prefix** (`groq/qwen3.6`) to disambiguate same-named models across providers. *(docs.msty.ai; docs.openwebui.com)*

6. **Grouped-by-provider listing + default/star marking.**
   Msty groups picker options by provider and lets you set a default model with a star icon in picker. Continuous switching without leaving the input context (as opposed to going into Settings).

7. **"Fetch models from provider" button.**
   co-switch's "Fetch Models" (downloaded-icon button) calls `/v1/models` using the entered key, then populates the model dropdown, grouped by category. This is the standard pattern for dynamic endpoint model discovery and avoids hand-typing model IDs.

8. **Per-session override with a root default.**
   LM Studio: Root model set in Settings→General as new-session default; the picker overrides per session. Mirrors Msty "set default model in chat". Two-tier (default + override) is low-friction for eval tools too.

---

## 3. Credential / Config Patterns

9. **Masked key input with explicit "stored, unchanged" semantics.**
   Jan agent `/settings` edit form pre-fills all fields except the API key, which shows `(unchanged)`; typing replaces the key, blanking clears it. This is the cleanest "don't round-trip the secret" idiom — never render the real key back. *(Jan providers docs)*

10. **Reveal/copy one-time secret with expiry of raw value.**
    Open WebUI account Secrets: "Show" toggle, copy button, key shown once; creating a new key overwrites the old one. Msty Nexus client tokens: "Store the plaintext token immediately; it is shown once." Google/Mistral keys "visible only once" (provider behavior) — a `deleted`/`overwrite` affordance is standard. *(docs.openwebui.com; docs.msty.ai; docs.msty.app)*

11. **Forget / remove credential affordances.**
    Jan: `d` twice deletes a provider; Open WebUI: re-save replaces connection; JetBrains: "Revoke" for agent authorizations. Pattern: per-item trash/revoke with an explicit destructive confirmation (no silent deletion).

12. **Test Connection button wiring provider creds to a live probe.**
    JetBrains AI Assistant renders URL + API key on one page and a **Test Connection** button; success is implicit green state. OpenClaw's Control UI posts providers with a "Test" probe that identifies env-var vs config provenance *without displaying the credential*. For OCR: a "Test OCR" mini-run on the user's own sample image is the OCR analog of "Test Connection".

13. **Key-type hint inline in the field.**
    Open WebUI shows "Your secret key (starts with `sk-...`)" as field placeholder/helper; Jan enforces `https://` (or `http://localhost`) so secrets never travel plaintext. Also the "Key Visibility: Only Once / Anytime" table in Msty's "Find API Keys" onboarding informs users what to expect when they paste a key.

14. **Test-message / "Test API Key & Configuration" checklist.**
    terminal-ai's wizard prints a stepwise probe: "Checking internet connection → Checking Base URL ... → Checking API key → Checking Model gemma3:1b → Checking rate limit". Each is a discrete, sequential check with ✔ lines. Great template for an OCR provider's "Test" flow (auth → endpoint reachable → model list loads → sample run → latency).

15. **Source-of-truth provenance labeling for keys.**
    OpenClaw: a "page identifies whether each API key comes from config or an environment variable without displaying the credential." Useful in a multi-provider OCR app where keys may be env-injected.

16. **Escape hatch: "any key works" for local endpoints.**
    LM Studio docs use `api_key = "not-used"`; Jan and Msty accept arbitrary strings for local/self-hosted endpoints (the field can't be empty but isn't validated). UI should permit this rather than forcing a real provider secret, else local/self-hosted users get blocked.

---

## 4. Comparison Patterns

17. **Blind side-by-side arena with tie / "both are bad" escapes.**
    LMSYS Chatbot Arena pairs two anonymous models on the same prompt; reviewer votes between them (or *Tie* / *Both are bad*), identities revealed only after voting. A **non-voting "pick two models" side-by-side mode** exists separately. The vote-set is recorded as Elo-style ranking data over time. *(lmsys.org blog; arxiv 2403.04132)*

18. **Side-by-side output panels with independent scroll + swap.**
    JetBrains diff viewer: two locked panels, synchronized scrolling option, "Swap Sides", per-pane headers identifying each model. For OCR, pair panels = GT vs OCR-output (or Model A vs Model B) over the corrected image region.

19. **Word/char-granular diff highlighting between the two result texts.**
    git diff-highlight and delta show removed chars struck-through and added chars highlighted within changed lines (Levenshtein-based, delta.com's within-line algorithm). jsdiff-based text diff viewers offer char/word/line/patch modes with live updates — directly applicable to comparing OCR hypotheses. *(delta README; text-diff-viewer README)*

20. **Per-metric head-to-head matrix.**
    Open LLM Leaderboard "Model Comparator" compares two models across all benchmark columns with the better value emphasized; Artificial Analysis charts model-vs-model quadrants (Intelligence vs Price, Speed vs Price) with "most attractive quadrant" highlighting. Diff tables mark which model wins which metric.

21. **Leaderboard table sectioned + filterable, with many small sortable metric columns.**
    Two-tier pattern from HF Open LLM Leaderboard v2: a summary table (average → per-benchmark acc cols) plus per-sample detail rows behind an expandable (📄) link, and a results dataset with tooltips explaining each metric's evaluation protocol (*shots, measure name, num_choices*). Metrics with confidence/uncertainty were added in v2 (mean ± std across replicates). *(huggingface.co/docs/leaderboards)*

---

## 5. Metrics / Eval-Table Patterns

22. **CER + WER pair as the headline summary row, per file.**
    All OCR evaluation tools (ocrevalUAtion, dinglehopper, ISRI ocreval, PRImA) center on **CER and WER**, CER = (insertions+substitutions+deletions)/N via Levenshtein — the standard "accuracy inverted" headliner. Pattern: one row per page/image, CER% and WER% columns, plus a bag-of-words/word-recognition column; per-spec options (ignore case/diacritics/punctuation) toggles. *(PRImA survey; evaluate/cer.py)*

23. **Confusion-matrix / top-error slice panel.**
    OCR studies (e.g., Uppsala "OCR performance" thesis; shaneweisz OCR-Character-Confusion) show a **top-20 character confusion matrix** with the largest substitution pairs highlighted — reveals systematic Bangla glyph confusions (e.g., ৌ vs ে + া). Pattern: heatmap matrix with top-K cells rank-listed beside it. Also weighted-Levenshtein suggestion lists derived from the matrix.

24. **Error-type taxonomy breakdown.**
    "Error type summary / top character changes by absolute change" tables (post-OCR correction studies) bucket errors into insertion/substitution/deletion/reordering + which specific characters change most. This is a *failure-slice* view: which classes of glyphs drive most CER.

25. **Metric explainer captions (provenance) under every number.**
    Leaderboard columns carry the recipe (harness, shots, measure name, num_choices, plus "Verification: Verified 0 / Self-reported 4 / Unverified" state badges in LLM-Stats). For OCR: display which engine version, lang-data, and normalization were used for each CER figure, and mark whether the metric was computed on raw vs normalized (e.g., diacritics-stripped) text.

26. **Secondary axes: latency / cost / size glued to quality.**
    Artificial Analysis & LLM-Stats tabulate Tokens/sec (output speed), time-to-first-token latency, and price-per-1M-tokens next to the Intelligence index; LLM-Stats even columns "Errors (provider failure %) / Params / Context". For OCR the equivalents are ms/page, model size/params badge, engine backend, and memory footprint — shown as compact columns, not a spec dump.

---

## 6. Batch-Queue Patterns

27. **Run → Job → Step log tree with status icons per level.**
    GitHub Actions: left sidebar of jobs, expandable steps, failed step auto-expanded, per-step duration, line permalinks, job-level "annotations above the log view". For a batch OCR job: Job = the run, Item = a page/file, and clicking a failing file auto-opens its error slice.

28. **Summary strip / status column with counts.**
    Playwright HTML reporter header: "All `N` · Passed `N` · Failed `N` · Flaky `N` · Skipped `N`" plus total time; the file tree lists each spec with status chip, location anchor, duration, and "View Trace". GitHub Job Summary template renders the same counts ("passed/failed/skipped/duration") as a hero table. Playwright dot reporter also maps one glyph per status (`.`× · `F` fail · `×` flaky-retry · `T` timeout · `°` skipped) for console/compact rendering.

29. **Per-item status cells with color coding and timestamps-as-links.**
    Vercel deployments: status label on the deployment tile (Building/Ready/Error), each build step duration, and a permalink per log line (`#L6-L9`). Yellow=warning / red=error log highlighting; secrets ≥32 chars in logs are replaced with `[REDACTED]`.

30. **Queue metadata under control of the operator.**
    SillyTavern's Horde flow shows queue wait/worker status ("Register a Horde account for faster queue times"); Msty Model Hub shows an **activity badge** counting in-flight installs, with an "open active installs panel to review progress or cancel". OCR batch UI: item rows show queued/running/failed/succeeded + per-item retry and a visible progress bar for the in-flight page.

31. **Failure isolation + partial-success summary.**
    Shopify Polaris guidance: a critical banner "Could not publish 3 products" with "Retry failed" / "View errors" actions and a link to the failed subset; succeeded items remain succeeded on re-run. Don't block on one failure; offer batch-retry of only the failed slice.

---

## 7. Diff / Review Patterns

32. **Side-by-side text panels with granularity toggle (char/word/line) + unified/patch view.**
    JetBrains viewer exposes viewer mode (Side-by-side / Unified) and highlight granularity (Words / Lines / Split changes), synchronized scroll, Swap Sides, Accept/Append/Revert. The OCR-native equivalent (ocrevalUAtion GUI) outputs "a table with the parallel input texts where the differences are highlighted" — i.e., a diff table of GT↔OCR.

33. **In-image overlay/margin review (image-to-text pairing).**
    ocr-comparison (StellaAthena) provides side-by-side images, per-engine colored overlays, **diff view that highlights disagreements between engines**, and a margin view with leader-lines from image regions into extracted text. This closes the loop between the source image crop and the text diff — critical for an OCR product where users must visually confirm glyph mistakes.

34. **Error-only mode / inline failure markers.**
    dinglehopper highlights only the incorrectly recognized characters inline, with the GT and OCR aligned; ocrevalUAtion marks diffs in the parallel rows. "Show only differences" folding reduces review load for long pages.

---

## 8. Error States

35. **Quiet failure banner + retry path (no blocking modal).**
    The dominant AI-component pattern (assistant-ui ErrorState, Zyeon API Error Card, Shopify Polaris): inline banner with title + detail + optional Retry; never a modal for connectivity because it blocks the retry action. When retrying, the banner swaps to a spinning "Retrying" state.

36. **Class-aware recovery — don't offer a retry that can't succeed.**
    Zyeon's ApiErrorCard keys recovery by error class: **429** → countdown + auto-retry opt-in; **auth (401/403)** → open-key-settings action, retry suppressed (same key reproduces the failure byte-for-byte); **5xx/overload** → status-page link; **context-too-long** → trim/summarize action. Table-driven single recipe per error kind. Shopify's class table: 400/422 inline validation · 401 redirect · 403 reconnect · 404 empty-state · 409 modal choice · 429 countdown · 5xx retry+status link.

37. **Empty vs loading vs error as *distinct* states.**
    React/Shopify/Material guidance: skeleton loaders for loading, a fallback component with a reset/retry for failed GETs (not a toast stack), an illustration-based empty state for "nothing to show yet" interstitials ("404 → back to list"). Arc Design System adds a **Missing-display** pattern for failed table/dashboard cells: state *in place of the data region*, plus a refresh affordance.

38. **Redact secrets in error/log surfaces.**
    Vercel `[REDACTED]` for ≥32-char env values; Jan/Msty Nexus diagnostics explicitly exclude keys, token values, and prompt text from support snapshots. OCR app: never echo Authorization headers or API keys into error payloads.

39. **HTTP status surfaced with a human retry suggestion + request id.**
    Polaris: expose request/content id inside a `<details>` for support correlation; Arc: "try again ×3 then come back later" guidance for API failures. SillyTavern quick-start: "Confirm it says **Valid**" after Connect — an explicit connection-state text, not just a silent icon.

---

## 9. Transferable Pattern List (the "what to build" shortlist)

For Ordinary Chobi Reader, in priority order:

1. **Provider preset cards** — one-tap add of an OCR provider/endpoint; only the API key field remains. *(pat. 3)*
2. **Two-tier model picker** — root default model + per-run override; quant/variant sub-row; capability chips (Bangla, Reading order, Vision). *(1, 2, 5)*
3. **Fetch-models-from-endpoint button** that lists models dynamically — no hand-typed IDs. *(7)*
4. **Masked key field with `(unchanged)` semantics, show-once + copy, explicit remove/revoke with confirm.** *(9, 10, 11)*
5. **Test Connection as an ordered checklist** (endpoint → auth → model list → 1-page Bangla sample → latency), each line ✔/✗; plus "local endpoint: any key allowed" escape hatch. *(12, 14, 16)*
6. **Arena-style side-by-side model comparison** with anonymous A/B, tie and "both bad" votes, swap-sides, sync scroll, and word/char diff highlight between outputs. *(17, 18, 19)*
7. **Leaderboard eval table**: one row per model×dataset, columns CER / WER / (bag-of-words), sortable, with metric-provenance captions and verified/self-reported badges. *(20, 21, 25)*
8. **Top-error confusion matrix** (top-K Bangla glyph substitution heatmap) + error-type taxonomy slice behind it. *(23, 24)*
9. **Batch job run tree**: run → per-page rows with queued/running/failed/succeeded color chips, per-item duration, auto-expanded failure slice, per-item retry, partial-success banner with "Retry failed". *(27, 28, 29, 31)*
10. **Status summary strip** — aggregated counts + total time at the top of the board. *(28)*
11. **OCR-capable diff review pane** — GT vs output aligned side-by-side with char-level marks, plus image-crop↔text leader-line or overlay mode to verify glyph confusions against the actual scan. *(32, 33, 34)*
12. **Class-aware error handling** — distinct empty / loading / error states; per-status action mapping (429 countdown, 401 → jump to key settings, 5xx → retry); no blocking modals; `[REDACTED]` keys/logs. *(35, 36, 37, 38, 39)*
13. **Latency & size metadata as compact columns**, not dumped: engine, version, param-size badge, ms/page, memory. *(26)*

---

## 10. References

**Model runners / providers**
- LM Studio: Choose a Cloud/Local/Remote model — https://lmstudio.ai/docs/bionic/models
- LM Studio v0.3.28 (variant picker, RAM/VRAM estimation) — https://lmstudio.ai/blog/lmstudio-v0.3.28
- Jan Settings — https://jan.ai/docs/settings ; Jan Providers/agent — https://www.jan.ai/docs/agent/providers ; Jan Local API Server — https://www.jan.ai/docs/desktop/api-server
- Hugging Face ↔ LM Studio load flow (quant dropdown, supported-for-hardware) — https://github.com/huggingface/hub-docs/blob/main/docs/hub/lmstudio.md
- text-generation-webui — https://github.com/oobabooga/text-generation-webui

**Provider connections / credentials**
- Open WebUI: Add OpenAI connection (API key, Model IDs filter, Prefix ID, Save) — https://docs.openwebui.com/getting-started/quick-start/connect-a-provider/starting-with-openai
- Open WebUI API keys (show/copy/overwrite) — https://docs.openwebui.com/features/authentication-access/api-keys ; Connections overview — https://docs.openwebui.com/getting-started/settings
- Jan agent provider edit semantics (`(unchanged)` key) — https://www.jan.ai/docs/agent/providers
- JetBrains AI Assistant: Providers & API keys + Test Connection — https://www.jetbrains.com/help/ai-assistant/settings-reference-providers-and-api-keys.html
- SillyTavern: API Connections + Connect/Valid — https://docs.sillytavern.app/usage/api-connections ; Quick start — https://github.com/SillyTavern/SillyTavern-Docs/blob/main/Usage/quick-start.md ; Connection Profiles — https://docs.sillytavern.app/usage/api_connections/connection-profiles.md
- Msty: Online Providers — https://docs.msty.ai/studio/managing-models/online-providers ; Managing Models / Model Hub — https://docs.msty.ai/studio/managing-models ; Find API Keys — https://docs.msty.app/how-to-guides/find-api-keys ; Nexus settings (client tokens shown once) — https://docs.msty.ai/nexus/settings
- co-switch provider presets + Fetch Models — https://github.com/xhnhhnh/co-switch/blob/main/docs/user-manual/en/2-providers/2.1-add.md
- VS Code Language Models / BYOK / picker filters — https://code.visualstudio.com/docs/agent-customization/language-models
- OpenClaw model providers (provenance, Test) — https://docs.openclaw.ai/concepts/model-providers
- terminal-ai provider test checklist — https://github.com/dwmkerr/terminal-ai/blob/main/docs/providers/msty.md
- ChatGPT model picker shortcut ⌃⇧M — https://learn.chatgpt.com/docs/reference/commands.md

**Benchmarks / leaderboards**
- Open LLM Leaderboard (v1) about/metrics — https://huggingface.co/docs/leaderboards/open_llm_leaderboard/about ; Leaderboards index + Eval Results — https://huggingface.co/docs/leaderboards ; Model Comparator — https://huggingface.co/spaces/open-llm-leaderboard/open_llm_leaderboard
- LMSYS Chatbot Arena launch + Elo — https://www.lmsys.org/blog/2023-05-03-arena ; Tech report (blind A/B, tie, both-bad) — https://arxiv.org/abs/2310.07522 (HTML: https://arxiv.org/html/2403.04132)
- Artificial Analysis — https://artificialanalysis.ai (models/leaderboard) ; Data API — https://artificialanalysis.ai/data-api
- Ragas — https://docs.ragas.io ; app.ragas.io dashboard upload — https://docs.ragas.io/en/v0.2.9/getstarted/rag_evaluation
- DeepEval — https://deepeval.com ; Ragas-in-DeepEval — https://deepeval.com/docs/metrics-ragas
- HF `evaluate` CER metric — https://github.com/huggingface/evaluate/blob/main/metrics/cer/cer.py

**OCR evaluation**
- Neudecker et al., "A survey of OCR evaluation tools and metrics" (PRImA; cites ocrevalUAtion, dinglehopper) — https://dl.acm.org/doi/fullHtml/10.1145/3476887.3476888 ; PDF — https://primaresearch.org/www/assets/papers/HIP21_CNeudecker_OcrEvalSurvey.pdf
- ocrevalUAtion (GT-vs-OCR diff table + CER/WER) — https://github.com/impactcentre/ocrevalUAtion
- dinglehopper — https://github.com/qurator-spk/dinglehopper
- OCR-D ocrmultieval — https://github.com/OCR-D/ocrmultieval
- OCR-Character-Confusion (confusion matrices, weighted Levenshtein) — https://github.com/shaneweisz/OCR-Character-Confusion
- ocr-comparison (side-by-side/overlay/diff/margin views) — https://github.com/StellaAthena/ocr-comparison
- "Investigation of OCR Model Performance and Post-OCR Correction Strategies" (Uppsala; error-type summaries, top character changes, confusion matrices) — https://www.diva-portal.org/smash/get/diva2:1991132/FULLTEXT01.pdf
- Watercrawl CER explainer — https://watercrawl.dev/blog/Character-Error-Rate

**Batch/CI & logs**
- GitHub Actions: workflow run logs & visualization graph — https://docs.github.com/en/actions/how-tos/monitor-workflows/use-workflow-run-logs ; large-scale log rendering — https://github.blog/engineering/architecture-optimization/how-github-actions-renders-large-scale-logs ; Job Summary tables — https://github-action-toolkit.readthedocs.io/en/latest/usage/job_summary.html
- Playwright HTML reporter & dot reporter — https://playwright.dev/docs/running-tests ; reporters — https://github.com/microsoft/playwright/blob/main/docs/src/test-reporters-js.md
- Vercel: Accessing build logs (warning/error colors, REDACTED, #Ln permalinks) — https://vercel.com/docs/deployments/logs ; Troubleshoot a build — https://vercel.com/docs/deployments/troubleshoot-a-build

**Diff / error states**
- JetBrains Rider Diff Viewer (side-by-side/unified, granularity, sync scroll, swap) — https://www.jetbrains.com/help/rider/Differences_Viewer.html
- git diff-highlight — https://github.com/git/git/blob/master/contrib/diff-highlight/README ; delta — https://github.com/dandavison/delta
- text-diff-viewer (jsdiff, char/word/line/patch) — https://github.com/Abhrankan-Chakrabarti/text-diff-viewer
- assistant-ui ErrorState — https://www.assistant-ui.com/elements/error-state
- Zyeon API Error Card (class-aware recovery) — https://ui.zyeon.ai/docs/ai/api-error-card
- Shopify Polaris error-pattern guidance — https://github.com/khadinakbarlabs/shopify-app-builder/blob/main/skills/ux-empty-error-states/SKILL.md
- Arc Design System error messages — https://arc.bt.com/880cad2bb/p/16ee5c-error-messages/b/641b3a
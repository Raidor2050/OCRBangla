# PRIVACY_ARCHITECTURE — Browser OCR Limits, Hosting Constraints & Provider Feasibility for "Ordinary Chobi Reader"

**Status:** Research document (Agent A5, OCRBangla team)
**Date:** 2026-09-21
**Scope:** Maximise realistic Bangla OCR accuracy in a browser-only web app deployed on **GitHub Pages** (static, no backend, no server-side secrets). Verdicts are marked **verified** (source-confirmed), **unverified** (requires field testing), or explicitly negative/positive.

---

## 1. Browser capability matrix (as of 2026)

| Capability | Chrome/Edge (Chromium) | Firefox | Safari (macOS/iOS) | Mobile | GitHub Pages? |
|---|---|---|---|---|---|
| WebAssembly (MVP) | ✅ universal | ✅ universal | ✅ since iOS 11 | ✅ | ✅ **verified** |
| WASM SIMD (128-bit) | ✅ Chrome 91+ | ✅ 89+ | ✅ Safari 16.4+ | ✅ (Android Chrome 91+) | ✅ no headers needed. Widely available since 2025-09-27 |
| WASM threads / `SharedArrayBuffer` | ✅ 74+ **IF cross-origin isolated** | ✅ 79+ **IF COI** | ✅ 15.2+ **IF COI; flaky on iOS across many releases** | ✅ Android IF COI; iOS threads often **execute serially** | ⚠️ **headers NOT settable** → only via service-worker shim + one-time reload |
| Web Workers | ✅ | ✅ | ✅ | ✅ | ✅ **verified** |
| Service Workers + Cache API | ✅ | ✅ | ✅ | ✅ (iOS limits eviction) | ✅ (HTTPS) |
| WebGPU | ✅ desktop 113+ (full 144+); Android 121+ | ⚠️ 141+ Windows; 145+ Apple Silicon macOS; **no Linux desktop, no Android, no Intel Mac** | ✅ macOS/iOS 26 | ⚠️ Android Chrome only; Safari iOS 26+ | ✅ no headers needed |
| WebGL 2 fallback | ✅ | ✅ | ✅ | ✅ | ✅ |
| `crossOriginIsolated` / COOP+COEP | requires document headers | requires document headers | requires document headers | same | ❌ **cannot send headers** |

Key implications (source: caniuse `wasm-threads`, `wasm-simd`, `webgpu`; MDN WebGPU API; web.dev "WebGPU supported in major browsers"; gpuweb Implementation Status wiki; WebKit Bugzilla #221530; quick-tts.com Piper-on-iOS measurements):

1. **WASM + SIMD is universal** and needs no special headers → the backbone of any in-browser OCR is reliable everywhere.
2. **Threads are NOT reliable on GitHub Pages.** Threaded WASM requires `COOP/COEP` response headers, which GitHub Pages cannot set. Workarounds exist (service-worker header injection, e.g. `coi-serviceworker`) but require a page reload and break third-party assets unless they send CORP/CORS. Even when enabled, **iOS Safari threading is historically unreliable** (threads serialize; onnxruntime-web reports match this).
3. **WebGPU is converging but far from universal**: no Firefox on Linux/Android, no Intel-Mac Firefox; int8 matmul on WebGPU is reported to **silently return garbage** (transformers.js maintainers + practitioner reports) and fp16 can OOM on low-VRAM devices. Treat WebGPU as an *acceleration tier with a fallback*, never a requirement.
4. **Web Workers are the reliable parallelism mechanism** on GitHub Pages and mobile: spawn N workers rather than depending on WASM threads.

---

## 2. GitHub Pages constraints (verified)

| Constraint | Value | Source |
|---|---|---|
| Custom HTTP response headers | ❌ **Not supported** (no COOP/COEP/CSP) | github docs; aero deployment notes: "GitHub Pages does not allow custom response headers" |
| Repo soft limit / published site limit | recommended 1 GB; published site max 1 GB | github docs (GitHub Pages limits) |
| File size in repo | warning at 50 MiB; **hard block at 100 MiB**; recommend objects <1 MB | docs.github.com "About large files on GitHub" |
| Push size (git layer) | 2 GB hard, also enforced per-object 100 MB | repository limits doc |
| Git LFS | ❌ **cannot be used with GitHub Pages** | about-git-LFS doc |
| Releases (binary assets) | each file < 2 GiB; **no total size or bandwidth limit**; up to 1000 assets/release | about-releases doc |
| Bandwidth | soft 100 GB/month | Pages limits doc |
| Builds | soft 10/hour (exempt with Actions workflow) | Pages limits doc |
| Rate limiting | 429 possible under abusive traffic | Pages limits doc |
| HTTPS / service workers | ✅ HTTPS enforced; SW allowed | — |

**Bottom line:** ship small default model files **in-repo** (same-origin, no CORS, cacheable by SW); keep large/optional models in **GitHub Releases** or an **npm-backed JS CDN**. Do not block app startup on `crossOriginIsolated`.

---

## 3. Model hosting & caching strategy (for a ~5–15 MB Bengali traineddata file)

### Measured sizes
- `@tesseract.js-data/ben` `4.0.0_best_int/ben.traineddata.gz` on jsDelivr = **1.31 MB gzip** (verified, 2026-09-21). This is Tesseract's default integerised "best" variant used by tesseract.js.
- `tessdata_best` (non-integer LSTM) is much larger (~30–50 MB class) and is **not** published to the `@tesseract.js-data/*` npm packages — you must host it yourself.

### Options compared

| Option | CORS on Pages | Size fit | Offline after first load | Notes / verdict |
|---|---|---|---|---|
| **Commit traineddata into the Pages repo** | ✅ same-origin, zero CORS | 1.31 MB fits trivially | ✅ full offline (cache via SW) | **Recommended for the default Bengali model.** Simple, versioned, no third-party dependence |
| GitHub Releases asset (dynamic download) | ✅ GitHub release download URLs are widely used from browsers (ACAO `*` on `objects.githubusercontent.com`) — *verify at implementation* | up to 2 GiB/file | 🟡 SW-cacheable after download | Good for optional `tessdata_best`; needs a download+progress+IndexedDB path |
| npm mirrors: **jsDelivr** /**unpkg** | ✅ jsDelivr & unpkg send `Access-Control-Allow-Origin: *` (jsDelivr verified via direct fetch) | `ben.traineddata.gz` 1.31 MB | 🟡 cached by Cache API after first fetch | jsDelivr blocked in parts of China; ship in-repo fallback |
| Hugging Face Hub (transformers.js models) | ✅ HF Hub serves model files with browser CORS; transformers.js loads them by default | any | 🟡 Cache API | For an optional ONNX Bangla model via transformers.js; `env.remoteHost` is configurable |
| Raw upload to a random file host | ⚠️ depends on host | — | — | avoid |

### Recommended download & cache flow
1. **Default model: committed file, same-origin fetch.** First load checks IndexedDB → if absent, copy from bundled URL → store blob in IndexedDB.
2. **Optional better model: GitHub Release asset** fetched over HTTPS with a progress bar → verify SHA-256 → IndexedDB.
3. **Cache hierarchy:** IndexedDB (authoritative, queryable, survives cache eviction better) for model blobs; Cache API for transient CDN assets; do not rely on Cache API/HTTP cache alone — browsers evict under storage pressure (Safari ~1 GB/origin soft limit with ITP eviction).
4. **Single-flight loading** (share one in-flight promise) so two controllers never download twice (prevents double memory + double bandwidth).
5. **Service Worker:** precache the app shell + default model for true offline after first visit; GitHub Pages SW scoping for subpath (`/<repo>/`) must be set explicitly.

---

## 4. Storage strategy

### IndexedDB (primary)
- Quotas: Chrome ~60% of disk, Firefox ~50%, Safari ~1 GB origin soft cap (prompts for more). IndexedDB is the persistent, scriptable store.
- Use for: model blobs (`{key, sha256, source, version, size, downloadedAt}`), OCR results history, evaluation benchmarks, user settings, and **user-provided API keys**.
- Evictions still occur (Safari 7-day ITP-related cleanup) → keep a "re-download model" recovery path in the UI.

### Keys & credentials — the security reality
On a static site there is **no server to hold secrets**. Anything a client stores is readable by the user and by any script running on that origin (XSS), and extractable from DevTools. This is fundamental and cannot be engineered away on GitHub Pages. Therefore:

- Adopt **Bring-Your-Own-Key (BYOK)**: each user supplies *their own* provider key, stored in IndexedDB only for their own tab/origin. Theft then exposes the *user's own* account, which they already control and can revoke — this is the accepted model for client-side tools (see Anthropic BYOK discussion, Groq/Gemini `dangerouslyAllowBrowser` guidance).
- **Never** pre-load the app with a shared key; never commit keys; never serve a CORS proxy that holds keys.
- Optional defense-in-depth: encrypt the key at rest in IndexedDB with AES-256-GCM under a PBKDF2 password (as in the Mistral-OCR web sample). This stops casual clipboard theft but is *not* real security — the user's browser has to decrypt it, so the user (or an XSS payload) can still recover it. Document this honestly in the UI.
- Provider-side hardening where supported (all doable by the user in their console):
  - Gemini: **API restriction to the Generative Language API** + origin/HTTP-referer restriction to the app's Pages origin. Since 2026-06-19 unrestricted keys are rejected; **standard keys die Sept 2026** (see §5).
  - Anthropic/Groq/OpenAI/Mistral: no per-origin restrict available to free BYOK; rely on per-user key + spending limits.

### Images
- Keep uploaded images in memory only; optional Offscreen Canvas/OPFS (origin-private file system) for very large images. Do not persist scan data anywhere — the privacy selling point.

---

## 5. Provider CORS / feasibility table (direct browser calls with API key)

Legends: ✅ browser-workable (verified in sources), ❌ blocked/not supported, ⚠️ unverified or unstable. "Payload" = the vision input format. Costs are indicative 2026 figures and volatile — always re-check provider pricing pages.

| Provider (+ endpoint) | CORS verdict | Auth method | Image payload | Notes / verdict detail |
|---|---|---|---|---|
| **Google Gemini** `generativelanguage.googleapis.com/v1beta/models/...:generateContent` | ✅ **CORS enabled for `generateContent`/`streamGenerateContent`** | API key via `?key=` or `x-goog-api-key` header, or Bearer token | `parts[{inline_data:{mime_type, data:<base64>}}]` | **Best default for the API tier.** Verified: Google Forum thread ("raw fetch request works") + `googleapis/js-genai#1723` shows preflight allowlist `content-type,x-goog-api-key,x-goog-api-client,authorization`. ⚠️ **`interactions` endpoint currently breaks in browser** (SDK sends `api-revision`, preflight rejected — bug reported/being patched). ⚠️ **Crunch: since 2026-06-19 unrestricted keys rejected; on Sept 2026 standard keys rejected** → users must migrate to "auth keys" (service-account bound). Google explicitly says don't ship keys client-side in production → **Firebase AI Logic + App Check is Google's sanctioned browser path** (a Firebase project, still "serverless" but not pure Pages). Free tier: Flash-class models, tiered RPD/RPM limits by quota tier. Cost: very low/cheap (Flash-class truly cheap; verify). |
| **OpenAI Chat Completions** `api.openai.com/v1/chat/completions` | ⚠️ **unverified / unstable** — do not rely on | `Authorization: Bearer` | `[{type:"image_url", image_url:{url:"data:image/...;base64,...", detail:"high"}}]` | Two 12-h+ CORS incidents (Oct 2025 completions; Jan 2026 Responses) were rolled back as "bugs" — but a May 2026 practitioner report says browser calls are blocked by design and v1/responses responded with no ACAO. Official guidance = server-side proxy only. If you must test: Chat Completions historically more permissive than Responses, but expect flakiness. **Marked unverified — requires live testing.** Cost gpt-4o-mini ≈ $0.15/M in + $0.60/M out + image-token surcharge (85/170 per tile; gpt-5.x similar); use `detail:"low"` for cheap OCR. |
| **Azure AI Document Intelligence** `<res>.cognitiveservices.azure.com` | ❌ **blocks browser CORS calls** | `Ocp-Apim-Subscription-Key` header or Entra ID token | JSON `base64Source` (base64) or `urlSource` | **Must use a backend** (Azure Function / API Management / any proxy). Document Intelligence Studio itself 404s on OPTIONS & hits PNA/CORS failures calling endpoints; Azure SDK samples state most Azure services lack native browser CORS. On a pure GitHub Pages deployment this provider is **not feasible** without an external proxy. Cost: per-page pricing tiers (~$1–$9 per 1000 pages depending on model + add-on features; verify). |
| **Anthropic Claude** `api.anthropic.com/v1/messages` | ✅ **CORS via opt-in header** `anthropic-dangerous-direct-browser-access: true` (+ SDK `dangerouslyAllowBrowser: true`) | `x-api-key` + `anthropic-version: 2023-06-01` | `[{type:"image", source:{type:"base64", media_type, data}}]` | Verified (Simon Willison 2024-08-23 + 2026 streaming articles + org-level CORS misconfig issue resolved). Ideal for BYOK. ⚠️ `/v1/messages/batches` and `/v1/files` do **not** answer browser preflights (closed as by-design). Cost approx: Haiku ≈ $1/$5 per M in/out, Sonnet ≈ $3/$15 (2026 figures fluctuate). |
| **Mistral** `api.mistral.ai/v1/chat/completions` | ⚠️ **unverified / inconsistent** | `Authorization: Bearer` | `[{type:"image_url", image_url:{url:"data:..."}}]` (Pixtral) | 2024 maintainer ("CORS enabled, should work now") contradicts 2025/26 self-hosted projects ("proxy necessary; browsers block direct calls"). Pixtral vision exists. **Marked unverified — requires testing before offering.** |
| **Groq** `api.groq.com/openai/v1` | ✅ **CORS enabled** (OpenAI-compatible) | `Authorization: Bearer` (SDK requires `dangerouslyAllowBrowser`) | `[{type:"image_url", image_url:{url:"https://..." } or data URL}}]`; Llama-4-Scout/Maverick vision, ≤5 imgs, up to 33 MP | Verified via multiple BYOK browser apps + SDK `dangerouslyAllowBrowser` opt-in existing. Free tier with dynamic rate entitlements (usage-based, tiered; no flat "free"). Good high-accuracy vision option. **Marked verified-workable; rate limits change with demand.** |
| **Together AI** `api.together.xyz/v1` | ⚠️ **unverified** (SDK lists web browsers as supported runtime, but that is not CORS proof; no clear public confirmation found) | `Authorization: Bearer` | OpenAI-style `image_url` data URIs (`detail` ignored) | Vision via Llama-4 family etc. Some models need dedicated endpoints. **Marked unverified — requires live testing.** |

### Sending images as base64 data URLs — universal
Every entry above accepts a **base64 data URL** (`data:image/jpeg;base64,...`) or analogous `inline_data`/`base64Source`; none of them require the image to be publicly reachable, which is exactly what a fully client-side, BYOK OCR app needs. To control cost/tokens, **preprocess and downscale locally before upload** (this is what the architecture's preprocess layer is for).

---

## 6. Memory limits & practical model sizes in a browser tab

| Environment | WASM/tab memory ceiling | Behaviour on overflow | Practical guidance |
|---|---|---|---|
| Desktop Chrome/Edge | WASM can reach 4 GB (wasm32 cap); JS `ArrayBuffer` ~2 GB (`0x7fe00000`) | explicit errors, catchable | Large ONNX models fine; still keep UI responsive via Worker |
| Desktop Firefox | ~2 GB WASM ceiling | catchable | moderate models fine |
| Android Chrome | ~500–700 MB practical (32-bit address-space fragmentation) | throws errors the page can catch | keep model+heap ≪ ~200 MB |
| **iOS Safari** | **undocumented per-tab budget ≈ 256 MB WebAssembly heap on 4 GB devices; ~100 MB "cliff"**; silent kill/jetsam of the tab (no error event!) | **tab silently reloads/never returns** | the binding constraint. Total app heap (model weights + ONNX/tesseract runtime + activations + JS heap) should stay ≲ 150 MB; 60–80 MB resident heaps measurably risk kills on low-RAM iPhones (Piper-on-iOS study: 25–28 % tab-kill rate) |

### Numbers for Bangla OCR
- Tesseract Bengali `best_int` ≈ 1.31 MB gz ≈ ~13 MB decompressed **trained data** + `tesseract-core` WASM (~1–10 MB) → **comfortably inside even iOS budgets** (total < 100 MB).
- Optional `tessdata_best` (~30–50 MB) + runtime ≈ 50–90 MB resident → borderline on low-RAM iPhones; fine on desktop/Android; gate by device (use `deviceMemory`/`hardwareConcurrency`, plus a manual "large model" toggle).
- An int8-quantized ONNX Bengali recognition model (CNN/CRNN) is typically **< 20 MB** — the sweet spot for a transformers.js/onnxruntime upgrade path.

### Loading/caching & concurrency rules
- Stream/slice large files where possible (peak memory during load ≈ 1.5–2× model size unless you feed the WASM heap incrementally).
- Use **one shared in-flight load promise**; never double-load.
- On mobile run **exactly one worker** and unload between jobs; on desktop a small pool (2–4) of Web Workers is effective *with or without* WASM threads.
- Gracefully degrade if `crossOriginIsolated === false` (non-threaded wasm builds — this is the default on GitHub Pages).

---

## 7. Recommended layered architecture (maximising REAL Bangla accuracy on GitHub Pages)

```
[ Image in ] ─▶ L0 Preprocess ─▶ L1 Local OCR ─▶ L2 Bangla post-process ─▶ [ Text out ]
                      │                   │                     ▲
                      │              (optional)                │
                      └────────  L3 Optional API tier (BYOK) ──┤
                                  └── L4 Compare / evaluate  ◄──┘
```

- **L0 — Preprocessing (Web Worker, main-thread-free).** Deskew, denoise, Otsu/Sauvola binarisation, contrast/CLAHE, and **2× upscale** for Tesseract (tesseract.js docs explicitly recommend upscaling). Canvas 2D or OpenCV.js. This alone is often worth +5–10 accuracy points.
- **L1 — Local OCR.** 
  - Tier A (default, ships): **Tesseract.js** with `ben` (best_int, in-repo copy), `oem: 1` LSTM, `pSM` tuned for Bangla, `legacyCore:false`. Cores are Emscripten WASM+SIMD single-threaded builds → **needs no cross-origin isolation** → works unchanged on GitHub Pages and mobile. Parallelism via multiple Web Workers (pool) on desktop.
  - Tier B (optional download): `tessdata_best` for noticeably better accuracy on hard scans (from GitHub Release or npm-CDN, cached in IndexedDB).
  - Tier C (optional, future): a **transformers.js/onnxruntime-web** Bangla ONNX model (int8) run on WASM by default, WebGPU only if feature-detect passes and a smoke test on device succeeds (WebGPU int8 garbage risk). Threaded build only if `crossOriginIsolated` (else non-threaded).
- **L2 — Bangla post-processing.** Bengali has 11 vowels/39 consonants/50 base glyphs, ~253–270 compound characters, vowel- and consonant-modifier stacking (left/right/below), and a shared headline (matra) — segmenters familiar with Latin scripts fail here (2009 BRACU study; WACV-2024 benchmarks). Pipeline:
  1. Unicode normalisation (NFC for Bangla) + zone/matra-aware token cleaning.
  2. **Dictionary + phonetic (Levenshtein) candidate re-rank**: verified gain 84.96→87.26 F1; with **character-group confusion priors** → **90.92 F1** (SPICSCON 2024). Ship a Bengali word-frequency/word-list dict client-side.
  3. Punctuation, digit/number preservation, compound-character spell checks.
- **L3 — Optional API tier (BYOK, never auto-fires).** Send the *preprocessed* (downscaled) image; run through one or more providers:
  - **Gemini `generateContent`** — primary (CORS verified; Flash-class models cheap; must support the 2026 auth-key migration + Firebase AI Logic for production-grade apps).
  - **Groq** — verified-workable vision (Llama-4).
  - **Claude via `anthropic-dangerous-direct-browser-access: true`** — verified; great accuracy; costlier.
  - OpenAI / Mistral / Together — **hidden behind a "requires testing" flag** until live-tested on Pages (OpenAI unreliable; Mistral & Together unverified).
  - **Azure Document Intelligence — NOT offered** (CORS-blocked; only via a backend the project forbids).
- **L4 — Comparison & evaluation (differentiator).** 
  - Model comparison: run 2+ engines on the same image; **line-level alignment** + voting; UI shows per-engine output, confidence, per-line diff highlights.
  - Evaluation mode: user pastes/corrects "ground truth" → app computes **CER & WER per engine per image**, stores the benchmark locally (IndexedDB), and shows a leaderboard. This makes accuracy claims measurable per-user-document rather than anecdotal.

### What is possible today vs not
- **Possible & reliable:** whole pipeline above on GitHub Pages with zero backend; default Bengali OCR fully offline after first load; BYOK Gemini/Groq/Claude API tier; WASM+SIMD everywhere; Web Workers parallelism.
- **Possible with tradeoffs:** WASM-threaded ONNX on Pages (needs COI service-worker shim + reload + asset CORS discipline); WebGPU acceleration (feature-detected, non-default; Firefox Linux/Android, older iOS missing it).
- **Not possible today:** truly secret server-side keys on Pages; Azure Document Intelligence direct browser calls; reliable OpenAI browser calls; iOS WASM threading trust.

---

## 8. Risks & mitigations

| Risk | Likelihood | Mitigation |
|---|---|---|
| Client-stored keys extracted (DevTools/XSS) | certain (by design) | BYOK = key belongs to the user, not the app; instruct per-provider key restrictions (Gemini API restriction + origin restriction); never bundle keys; optional local encryption for convenience only |
| Static site has no CSP → XSS can read IndexedDB | medium | Strict HTML-escaping/Sanitizer in UI; de-embed untrusted URLs; consider adding meta CSP if it doesn't break workers; keep all image decoding in workers |
| GitHub Pages can't set COOP/COEP → threads off by default | certain | Non-threaded WASM core by default; optional `coi-serviceworker` shim gated behind a setting (document the one-time reload); app must never *require* COI |
| WebGPU immature (int8 garbage, fp16 OOM) | medium | default `device:'wasm'`; WebGPU only after `navigator.gpu` + on-device smoke test; force switch available |
| **iOS tab silently killed** at ~256 MB | medium-high on low-RAM iPhones | ship small default (best_int ~13 MB); optional big models gated & defaulted off on mobile; single worker; re-detect & restore state after reload |
| Gemini standard keys rejected (Sept 2026) | certain (announced) | UI must show key type + migration link; document Firebase AI Logic as the production-safe browser path |
| CDN/regional blocking (jsDelivr in China, unpkg elsewhere) | medium | default model in-repo; CDN only for optional extras |
| Storage eviction (Safari ITP; pressure) | medium | IndexedDB + SW precache; "re-download" repair path; SHA-256 integrity checks |
| Tesseract Bengali accuracy is modest (≈57–76 % on realistic docs, ≈85–92 % clean + post-processing) | certain | get the win from L0+L2; API tier for hard documents; in-app evaluation scores keep this honest |

---

## 9. Implementation choices (concrete)

- **Runtime:** existing Vite + TypeScript app, deployed by a GitHub Actions → Pages workflow (`upload-pages-artifact`; exempt from 10 builds/hr soft cap).
- **Default model:** `ben.traineddata.gz` (4.0.0_best_int, 1.31 MB) committed under `public/models/` → same-origin fetch, then IndexedDB.
- **tesseract.js v5/v6:** pin `workerPath`, `corePath` (self-host or jsDelivr), `langPath` (self-host default); `workerBlobURL:true`; `cacheMethod` read-only after cold start; 1 worker mobile / 2–4 desktop pool.
- **Feature detection:** `wasm-feature-detect` + `navigator.gpu` + `crossOriginIsolated` → pick core variant (`simd` single-threaded default, threaded only if COI).
- **Optional ONNX tier:** `onnxruntime-web` (or transformers.js if we later adopt a Hub-hosted model): `executionProviders` = `['wasm']` default, `['webgpu','wasm']` only after smoke test; int8 quantization; single-flight load.
- **Storage:** IndexedDB stores `models`, `settings`, `results`, `benchmarks`; Cache API for SW-precached shell.
- **API client:** unified provider adapter (Gemini, Groq, Claude implemented; OpenAI/Mistral/Together behind flags); each sends downscaled, preprocessed base64 images; streaming where cheap (generateContent SSE, Claude SSE).
- **Privacy UX:** "Nothing leaves your device until you opt into an API key" banner; per-provider key entry with save-to-IndexedDB; one-click key delete.

---

## 10. Alternatives

1. **Header-capable static hosts** (Cloudflare Pages / Netlify / Vercel `_headers`) → real COOP/COEP + CSP: threads and per-feature isolation out of the box, no shim/reload. Costs losing the "pure GitHub Pages" constraint.
2. **Firebase Hosting + Firebase AI Logic (App Check)** → Google's sanctioned serverless path for Gemini from the browser: keys never in the client, quotas/abuse control, still no custom backend code. This is the upgrade path Google is pushing all client-side Gemini users toward in 2026.
3. **PWA first-class offline**: service worker precache of app + default model → works with no network after first visit.
4. **Thin proxy worker** (Cloudflare Worker) → enables OpenAI/Azure DOC etc. behind the scenes; violates "no server-side secrets" premise — only if the team later relaxes that requirement.

---

## 11. Known limitations (state clearly)

- **No GPU-accelerated threading, no WebGPU, on GitHub Pages by default** — you get single-threaded (per worker) WASM SIMD, plus worker-count parallelism.
- **No secret-safe key storage** on static hosting, ever.
- **Azure Document Intelligence and (reliably) OpenAI are unavailable** without a backend/proxy.
- **iOS Safari**: lowest memory budget and unreliable threading; the hard ceiling on model size.
- **Tesseract Bengali ≠ human quality** on handwriting/typewriter/low-res input (~36–57 % on those classes per WACV-2024); compound characters and modifier segmentation remain the hard core.
- **100 MB file cap** rules out committing very large best models in-repo (use Releases/CDN).

---

## 12. Future work

- Train/fine-tune a dedicated **Bengali LSTM/CRNN → ONNX (int8)** closed-vocab recognition model starting from `tessdata_best`; measure CER/WER against tesseract on a fixed benchmark; this is the single biggest potential local-accuracy win.
- Add **mixed-script line splitting** (Bengali+San+English) with per-line script routing.
- Re-evaluate **WebGPU** correctness when browsers stabilise int8/fp16; evaluate **WebNN** (Chromium NPU path) as another optional backend.
- Expand the Bengali dictionary + phonetic confusion model with community wordlists; add BOB-style benchmark datasets for the in-app evaluation mode.
- Track `wasm memory64` availability (post-3.0) for >4 GB models (not needed at current sizes).
- If adopted: Firebase AI Logic integration for a zero-key, production-safe Gemini tier.

---

## References

1. caniuse — WebAssembly Threads & Atomics: https://caniuse.com/wasm-threads
2. caniuse — WebAssembly SIMD: https://caniuse.com/wasm-simd
3. caniuse — WebGPU: https://caniuse.com/webgpu
4. MDN — WebGPU API (availability/secure context): https://developer.mozilla.org/en-US/docs/Web/API/WebGPU_API
5. web.dev — "WebGPU is now supported in major browsers" (2025-11-25): https://web.dev/blog/webgpu-supported-major-browsers
6. gpuweb/wiki — Implementation Status (Chrome/Firefox/Safari tables): https://github.com/gpuweb/gpuweb/wiki/Implementation-Status
7. web.dev — WebAssembly feature detection: https://web.dev/articles/webassembly-feature-detection
8. GitHub Docs — GitHub Pages limits (1 GB, 100 GB/mo, 10 builds/h): https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits
9. GitHub Docs — About large files (50 MiB warn / 100 MiB block / LFS): https://docs.github.com/en/repositories/working-with-files/managing-large-files/about-large-files-on-github
10. GitHub Docs — Repository limits (10 GB, 1 MB object recommendation): https://docs.github.com/en/repositories/creating-and-managing-repositories/repository-limits
11. GitHub Docs — About releases (2 GiB/assets, no total limit): https://docs.github.com/en/repositories/releasing-projects-on-github/about-releases
12. GitHub Docs — About Git LFS ("cannot be used with GitHub Pages"): https://docs.github.com/en/repositories/working-with-files/managing-large-files/about-git-large-file-storage
13. aero docs — "Why GitHub Pages is not suitable" (no custom headers → no COI): https://github.com/wilsonzlin/aero/blob/main/docs/deployment.md
14. tomayac blog — COOP/COEP via service worker on static hosting (2025-03-08): https://blog.tomayac.com/2025/03/08/setting-coop-coep-headers-on-static-hosting-like-github-pages/
15. coi-serviceworker (gzuidhof): https://github.com/gzuidhof/coi-serviceworker
16. ONNX Runtime Web — Working with large models (2 GB ArrayBuffer, 4 GB WASM cap, external data): https://onnxruntime.ai/docs/tutorials/web/large-models.html
17. ONNX Runtime Web docs — executionProviders (wasm/webgpu): https://onnxruntime.ai/docs/execution-providers/ (and transformers.js docs below)
18. transformers.js docs — env caching (Cache API, quotas, wasmPaths, device webgpu/wasm, dtype q8/fp16): https://huggingface.co/docs/transformers.js + README
19. transformers.js PR #1471 — WASM file caching & blob/`import.meta.url` pitfalls: https://github.com/huggingface/transformers.js/pull/1471
20. Practitioner report — WASM+int8 reliable, WebGPU-int8 garbage, WebGPU-fp16 OOM, cache gotchas: https://huggingface.co/blog/stephen-standd/embedding-model-in-the-browser
21. tesseract.js — local installation / workerPath / corePath / langPath / CDN defaults: https://github.com/naptha/tesseract.js/blob/HEAD/docs/local-installation.md
22. tesseract.js FAQ — traineddata download & IndexedDB caching; upscaling tip: https://github.com/naptha/tesseract.js/blob/HEAD/docs/faq.md
23. naptha/tessdata README — 4.0.0_best_int default, npm packages `@tesseract.js-data/{lang}`, jsDelivr/unpkg URLs: https://github.com/naptha/tessdata/
24. @tesseract.js-data/ben on jsDelivr (ben.traineddata.gz = 1.31 MB): https://cdn.jsdelivr.net/npm/@tesseract.js-data/ben@1.0.0/4.0.0_best_int/
25. Google AI docs — Using Gemini API keys (restricted keys from 2026-06-19; standard keys rejected Sept 2026; never expose client-side): https://ai.google.dev/gemini-api/docs/api-key
26. Google AI forum — interactions API browser preflight (api-revision) issue & "raw fetch works": https://discuss.ai.google.dev/t/interactions-api-javascript-sdk-403-error-when-running-in-browser-but-raw-fetch-request-works/173241/
27. googleapis/js-genai #1723 — CORS preflight allowlist for `generativelanguage.googleapis.com`: https://github.com/googleapis/js-genai/issues/1723
28. Google Cloud blog — "API keys are open secrets" / key security: https://cloud.google.com/blog/topics/developers-practitioners/api-keys-are-open-secrets
29. Firebase AI Logic docs (App Check, auth-key migration): https://firebase.google.com/docs/ai-logic
30. OpenAI community — Chat Completions browser CORS incident Oct 2025 (blocked, rolled back): https://community.openai.com/t/chat-completions-api-endpoint-down-blocked-any-web-browser-request/1362527/
31. OpenAI community — Responses API CORS incident Jan 2026 (preflight 400, rolled back as bug): https://community.openai.com/t/has-the-cors-policy-changed-responses-api/1372791/
32. OpenAI vision docs (Responses/Chat, detail levels): https://developers.openai.com/api/docs/guides/images-vision
33. Simon Willison — "Claude's API now supports CORS requests" (2024-08-23): https://simonwillison.net/2024/Aug/23/anthropic-dangerous-direct-browser-access/
34. Dev.to — Browser-only Claude streaming via `anthropic-dangerous-direct-browser-access`: https://ferhatatagun.com/blog/browser-only-claude-streaming
35. anthropics/anthropic-sdk-typescript #930 — batches/files do not support browser CORS; #741 org-level CORS misconfig resolved: https://github.com/anthropics/anthropic-sdk-typescript/issues/930
36. Azure SDK for JS — "other services do not yet support CORS natively" (Key Vault/backends): https://github.com/Azure/azure-sdk-for-js/blob/main/samples/cors/ts/README.md
37. Microsoft Q&A — Document Intelligence Studio PNA/CORS failure against cognitiveservices endpoints: https://learn.microsoft.com/en-us/answers/questions/5786238/
38. @azure-rest/ai-document-intelligence README (auth/analyze/post base64Source/urlSource): https://cdn.jsdelivr.net/npm/@azure-rest/ai-document-intelligence@1.1.0/README.md
39. mistralai/client-js #21 — "CORS headers are enabled" (2024) vs #4 — "there's also a CORS issue": https://github.com/mistralai/client-js/issues/21 ; https://github.com/mistralai/client-js/issues/4
40. PetrAPConsulting/Mistral-OCR — "proxy necessary because browsers block direct calls": https://github.com/PetrAPConsulting/Mistral-OCR
41. groq-sdk README & src — `dangerouslyAllowBrowser` opt-in (browser CORS works): https://www.npmjs.com/package/groq-sdk
42. Together AI docs — OpenAI compatibility / vision / base64 data URIs: https://docs.together.ai/docs/inference/openai-compatibility
43. webassembly-wasm.com — ML in browser: peak-memory ≈ 2× model during load, quantize/stream/cache: https://www.webassembly-wasm.com/production-wasm-workloads-and-deployment/machine-learning-inference-in-the-browser/
44. quick-tts.com — Piper-on-iOS: 100 MB tab cliff, ~256 MB iOS heap, silent kills, flaky iOS threading: https://quick-tts.com/blog/piper-wasm-on-ios.html
45. WebKit Bugzilla #221530 — iOS Safari wasm memory.grow kills tab without failing: https://bugs.webkit.org/show_bug.cgi?id=221530
46. godotengine/godot #70621 — iOS Safari WASM max-memory OOM (256 MB fix): https://github.com/godotengine/godot/issues/70621
47. Hasnat, Chowdhury & Khan (2009) — Bangla script structure, compound chars, modifier segmentation: http://hdl.handle.net/10361/635
48. SPICSCON 2024 — Bangla OCR error correction: Levenshtein + character grouping 84.96→90.92 F1: https://doi.org/10.1109/spicscon64195.2024.10941489
49. WACV 2024 WVLL — Bengali OCR specialised models vs Tesseract (57.56 % avg vs 87.20 %): https://openaccess.thecvf.com/content/WACV2024W/WVLL/papers/Rabby_Enhancement_of_Bengali_OCR_by_Specialized_Models_and_Advanced_Techniques_WACVW_2024_paper.pdf
50. CompoundDenseNet 2026 — Bangla handwritten compound character recognition: https://doi.org/10.3389/frai.2026.1751148
# Testing

## Commands

```bash
npm test          # run the Vitest suite once
npm run test:watch
npm run typecheck # tsc -b (strict)
npm run lint      # eslint, --max-warnings=0
npm run build     # typecheck + production build
```

## What is unit-tested

Pure logic that must not regress (no browser needed):

| Suite | File | Covers |
|---|---|---|
| OCR metrics | `src/evaluation/cerwer.test.ts` | grapheme clustering, CER/WER/CER-bounded, evaluate fields, diff ops, substitution counts, diff rendering |
| Bangla post-processing | `src/ocr/postprocessing/bangla.test.ts` | NFC/nukta composition, whitespace/newline hygiene, empty-canonical-clear checks, orthotactic issue flags (virama/vowel-sign/nukta/punctuation), ratio detection, no-dictionary-rewriting |
| Pixel ops | `src/ocr/preprocessing/ops.test.ts` | analyze (color/noise), grayscale, contrast clamp, blur/median/sharpen geometry, Otsu threshold separation, binarize, autoEnhance applied-steps reporting, applyPreprocess identity+auto |
| File detection | `src/documents/detect.test.ts` | image/PDF/unsupported classification, extensions, humanSize, path-safe base names |
| ZIP export | `src/utils/zip.test.ts` | path traversal protection, backslash/dot normalization, entry naming, ZIP signature |
| Credentials | `src/storage/credentials.test.ts` | in-memory store round-trips, masking, no-crash with absent IndexedDB |

## Conventions

- New or changed behavior in any of the above modules requires a test that fails
  without the change and passes with it.
- Tests run in jsdom (`vitest.config.ts`); they must not hit the network.
- The `ops.ts` suite is deliberately pure (no canvas/Web Worker) so it runs fast
  and deterministic.
- CI block: `npm test && npm run lint && npm run build` must all pass before a
  deploy (see `.github/workflows/deploy.yml`).

## Manual verification checklist before shipping

- [ ] Extraction: add by drop, paste, and file picker; unsupported file rejected.
- [ ] Extraction: local OCR runs end-to-end after the traineddata loads; preview
  shows transforms; stage bar advances.
- [ ] Extraction: Cancel mid-run; retry a failed item; clear done; TXT/JSON
  download; Download all ZIP.
- [ ] Extraction: external provider path honors `confirmExternal` modal.
- [ ] Models: add/forget key, test connection with a bad and good key; local
  cache-clear button.
- [ ] Settings/Workflow/Privacy render; theme persists across reload.
- [ ] `npm run build` output served from a subpath works (GH Pages) — check
  favicon, assets, and traineddata paths.
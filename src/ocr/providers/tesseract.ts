import type { Box, OcrBlock, OcrLine, OcrPageResult, OcrWord, OCRProvider, ProviderPageInput } from '../types'

/**
 * Local (in-browser) OCR via Tesseract.js WASM with the Bengali traineddata.
 *
 * The `ben` traineddata (~1.3 MB gz) is committed to the repo under `public/lang/`
 * so same-origin loading works on GitHub Pages after the first request; the
 * tesseract.js worker + core come from the pinned CDN (mojcore/jsDelivr) which
 * is CORS-enabled. No document data ever leaves the browser for this provider.
 *
 * Model `ben-hand` is the honest "handwriting" mode: research shows Bangla
 * handwriting recognition is research-grade, so we do NOT promise parity with
 * print. We run the *best available fully-local* technique: detect line regions
 * with the real engine, re-recognize each line crop in single-line PSM mode,
 * and rebuild the page text from the refined lines. Every box and confidence
 * still comes from the engine — nothing is synthesized.
 */

const LANG = 'ben'
const LANG_PATH = import.meta.env.BASE_URL + 'lang/'
const WORKER_PATH = 'https://cdn.jsdelivr.net/npm/tesseract.js@v5.1.1/dist/worker.min.js'
const CORE_PATH = 'https://cdn.jsdelivr.net/npm/tesseract.js-core@5/tesseract-core-simd.wasm.js'

type TesseractWorker = {
  setParameters(p: Record<string, unknown>): Promise<void>
  recognize(image: HTMLCanvasElement): Promise<{ data: TesseractData }>
  terminate(): Promise<void>
}

interface TesseractData {
  text: string
  confidence: number
  blocks?: Array<{
    text: string
    confidence?: number
    bbox?: { x0: number; y0: number; x1: number; y1: number }
    paragraphs?: Array<{
      lines?: Array<{
        text: string
        confidence?: number
        bbox?: { x0: number; y0: number; x1: number; y1: number }
        words?: Array<{
          text: string
          confidence?: number
          bbox?: { x0: number; y0: number; x1: number; y1: number }
        }>
      }>
    }>
  }>
  lines?: Array<{
    text: string
    confidence?: number
    bbox?: { x0: number; y0: number; x1: number; y1: number }
    words?: Array<{
      text: string
      confidence?: number
      bbox?: { x0: number; y0: number; x1: number; y1: number }
    }>
  }>
}

function boxOf(b?: { x0: number; y0: number; x1: number; y1: number }) {
  if (!b) return undefined
  return { x: b.x0, y: b.y0, w: b.x1 - b.x0, h: b.y1 - b.y0 }
}

let workerPromise: Promise<TesseractWorker> | null = null

async function getWorker(): Promise<TesseractWorker> {
  if (workerPromise) return workerPromise
  const { createWorker, PSM } = await import('tesseract.js')
  workerPromise = (async () => {
    const worker = await createWorker(LANG, 1, {
      langPath: LANG_PATH,
      workerPath: WORKER_PATH,
      corePath: CORE_PATH,
    })
    await worker.setParameters({
      tessedit_pageseg_mode: PSM.AUTO,
      preserve_interword_spaces: '1',
    })
    return worker as unknown as TesseractWorker
  })()
  workerPromise.catch(() => {
    workerPromise = null
  })
  return workerPromise
}

/**
 * Tesseract.js workers are single-flight: psm settings and in-flight jobs are
 * mutated by every call. Serialize all recognitions through a module-level
 * lock so a batch OCR run never corrupts the shared worker state.
 */
let workerLock: Promise<unknown> = Promise.resolve()

function withWorkerLock<T>(fn: () => Promise<T>): Promise<T> {
  const next = workerLock.then(fn, fn)
  workerLock = next.catch(() => {})
  return next
}

function toLines(data: TesseractData): OcrLine[] {
  const src = data.lines && data.lines.length ? data.lines : extractLinesFromBlocks(data)
  return src.map((l) => ({
    text: l.text,
    confidence: typeof l.confidence === 'number' ? l.confidence : undefined,
    bbox: boxOf(l.bbox),
    words: l.words?.map(
      (w): OcrWord => ({
        text: w.text,
        confidence: typeof w.confidence === 'number' ? w.confidence : undefined,
        bbox: boxOf(w.bbox),
      }),
    ),
  }))
}

function extractLinesFromBlocks(data: TesseractData): NonNullable<TesseractData['lines']> {
  const lines: NonNullable<TesseractData['lines']> = []
  for (const block of data.blocks ?? []) {
    if (block.paragraphs) {
      for (const p of block.paragraphs) {
        for (const l of p.lines ?? []) lines.push(l)
      }
    } else if (block.text) {
      lines.push({ text: block.text, confidence: block.confidence, bbox: block.bbox })
    }
  }
  return lines
}

function toBlocks(data: TesseractData): OcrBlock[] {
  return (data.blocks ?? []).map((b, i) => ({
    text: b.text,
    lineIndex: i,
    bbox: boxOf(b.bbox),
  }))
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(Math.max(v, min), max)
}

export interface LineRefinementPlan {
  lineIndex: number
  crop?: { sx: number; sy: number; sw: number; sh: number }
  reason: 'ok' | 'no-bbox' | 'too-large' | 'too-small' | 'max-lines'
}

/**
 * Decides, purely, which engine lines are cheap and safe to re-recognize as
 * single-line crops. A line whose box spans >50% of the page is almost always
 * a broken layout detection, so we skip it rather than burn time on a
 * whole-page re-run. Returns crop rectangles padded around each line.
 */
export function planLineRefinement(
  canvasW: number,
  canvasH: number,
  lines: Array<{ text: string; bbox?: Box }>,
  maxLines = 80,
): LineRefinementPlan[] {
  const totalArea = canvasW * canvasH
  return lines.map((l, i): LineRefinementPlan => {
    if (i >= maxLines) return { lineIndex: i, reason: 'max-lines' }
    const b = l.bbox
    if (!b || b.w <= 0 || b.h <= 0) return { lineIndex: i, reason: 'no-bbox' }
    if (b.w * b.h > 0.5 * totalArea) return { lineIndex: i, reason: 'too-large' }
    const padX = Math.max(2, Math.round(b.h * 0.08))
    const padY = Math.max(2, Math.round(b.h * 0.18))
    let sw = b.w + padX * 2
    let sh = b.h + padY * 2
    const sx = clamp(Math.round(b.x) - padX, 0, Math.max(0, canvasW - 1))
    const sy = clamp(Math.round(b.y) - padY, 0, Math.max(0, canvasH - 1))
    sw = Math.min(sx + sw, canvasW) - sx
    sh = Math.min(sy + sh, canvasH) - sy
    if (sw < 8 || sh < 8) return { lineIndex: i, reason: 'too-small' }
    return { lineIndex: i, reason: 'ok', crop: { sx, sy, sw, sh } }
  })
}

export interface RefinedLine {
  text: string
  confidence?: number
}

/**
 * Rebuilds page-level text/geometry from the per-line refinement results. When
 * a line was successfully re-recognized, its words are dropped (re-split words
 * would be fabricated); the refined text + engine confidence replace the first
 * pass values. Boxes always stay engine-real.
 */
export function assembleRefinedLines(
  lines: OcrLine[],
  refined: Array<RefinedLine | undefined>,
): { text: string; lines: OcrLine[]; confidences: number[] } {
  const confidences: number[] = []
  const out: OcrLine[] = lines.map((l, i) => {
    const r = refined[i]
    if (r) {
      if (typeof r.confidence === 'number') confidences.push(r.confidence)
      return { text: r.text, confidence: r.confidence, bbox: l.bbox }
    }
    if (typeof l.confidence === 'number') confidences.push(l.confidence)
    return l
  })
  return { text: out.map((l) => l.text).join('\n'), lines: out, confidences }
}

async function recognizeWithPsm(
  worker: TesseractWorker,
  canvas: HTMLCanvasElement,
  psm: number,
): Promise<TesseractData> {
  await worker.setParameters({ tessedit_pageseg_mode: psm })
  const { data } = await worker.recognize(canvas)
  return data
}

async function processPageWithWorker(
  worker: TesseractWorker,
  input: ProviderPageInput,
): Promise<OcrPageResult> {
  const { PSM } = await import('tesseract.js')
  const t0 = performance.now()
  const data = await recognizeWithPsm(worker, input.canvas, PSM.AUTO as unknown as number)
  const elapsed = Math.round(performance.now() - t0)
  const lines = toLines(data)
  const useHandwriting = input.model === 'ben-hand'

  if (!useHandwriting) {
    return {
      pageIndex: input.pageIndex,
      text: data.text,
      confidence: data.confidence,
      lines,
      blocks: toBlocks(data),
      meta: {
        engine: 'tesseract.js',
        language: 'ben',
        processingMs: elapsed,
      },
    }
  }

  const plan = planLineRefinement(input.canvas.width, input.canvas.height, lines)
  const refined: Array<RefinedLine | undefined> = []
  let refinedCount = 0

  for (const p of plan) {
    if (input.signal?.aborted) throw new DOMException('aborted', 'AbortError')
    if (!p.crop) continue
    const { sx, sy, sw, sh } = p.crop
    const crop = document.createElement('canvas')
    crop.width = sw
    crop.height = sh
    const ctx = crop.getContext('2d')
    if (!ctx) continue
    ctx.drawImage(input.canvas, sx, sy, sw, sh, 0, 0, sw, sh)
    let d: TesseractData
    try {
      d = await recognizeWithPsm(worker, crop, PSM.SINGLE_LINE as unknown as number)
    } catch {
      continue
    }
    refined[p.lineIndex] = {
      text: (d.text ?? '').trim(),
      confidence: typeof d.confidence === 'number' ? d.confidence : undefined,
    }
    refinedCount++
  }

  try {
    await worker.setParameters({ tessedit_pageseg_mode: PSM.AUTO })
  } catch {
    /* the next operation resets psm anyway */
  }

  if (refinedCount === 0) {
    return {
      pageIndex: input.pageIndex,
      text: data.text,
      confidence: data.confidence,
      lines,
      blocks: toBlocks(data),
      meta: {
        engine: 'tesseract.js',
        language: 'ben',
        mode: 'handwriting',
        refinedLines: 0,
        processingMs: Math.round(performance.now() - t0),
      },
    }
  }

  const built = assembleRefinedLines(lines, refined)
  const pageConfidence = built.confidences.length
    ? built.confidences.reduce((a, b) => a + b, 0) / built.confidences.length
    : data.confidence

  return {
    pageIndex: input.pageIndex,
    text: built.text,
    confidence: pageConfidence,
    lines: built.lines,
    blocks: toBlocks(data),
    meta: {
      engine: 'tesseract.js',
      language: 'ben',
      mode: 'handwriting',
      refinedLines: refinedCount,
      processingMs: Math.round(performance.now() - t0),
    },
  }
}

export const tesseractProvider: OCRProvider = {
  id: 'tesseract',
  name: 'Tesseract (local)',
  type: 'local',
  description:
    'Open-source Tesseract OCR compiled to WebAssembly, running entirely in this browser with the Bengali traineddata. Private by default — your documents never leave the device.',
  capabilities: {
    supportsConfidence: true,
    supportsLineBoxes: true,
    supportsWordBoxes: true,
    inputImages: true,
    nativePdf: false,
    requiresNetwork: false,
    languages: ['ben', 'eng', 'ben+eng'],
  },
  languages: ['ben'],
  models: [
    {
      id: 'ben',
      label: 'Bengali print (tessdata_best_int)',
      description: 'Tesseract Bengali traineddata, integer mode — best for printed text.',
      sizeInfo: '≈1.31 MB gz · hosted in-repo',
    },
    {
      id: 'ben-hand',
      label: 'Bengali handwriting (experimental)',
      description:
        'Line-by-line re-recognition of the same local engine. Research-grade: expect far lower accuracy than print, and verify results.',
      sizeInfo: '≈1.31 MB gz · hosted in-repo',
    },
  ],
  defaultModel: 'ben',

  async isConfigured() {
    return true
  },

  processPage(input: ProviderPageInput): Promise<OcrPageResult> {
    return withWorkerLock(async () => {
      const worker = await getWorker()
      if (input.signal?.aborted) throw new DOMException('aborted', 'AbortError')
      return processPageWithWorker(worker, input)
    })
  },
}

export async function terminateTesseractWorker(): Promise<void> {
  if (workerPromise) {
    const w = await workerPromise
    workerPromise = null
    try {
      await w.terminate()
    } catch {
      /* best effort */
    }
  }
}

/**
 * Drops the worker and any cached downloaded traineddata so a model can be
 * re-downloaded or to free disk space. Returns the names of removed stores.
 */
export async function clearTesseractCache(): Promise<string[]> {
  await terminateTesseractWorker()
  const removed: string[] = []
  for (const name of ['tesseract.js', 'tesseract.js-cache']) {
    try {
      indexedDB.deleteDatabase(name)
      removed.push(name)
    } catch {
      /* ignore */
    }
  }
  if (typeof caches !== 'undefined') {
    try {
      for (const key of await caches.keys()) {
        if (/^tesseract\.js/i.test(key)) {
          await caches.delete(key)
          removed.push(key)
        }
      }
    } catch {
      /* ignore */
    }
  }
  return removed
}
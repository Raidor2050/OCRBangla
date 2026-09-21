import type { OcrBlock, OcrLine, OcrPageResult, OcrWord, OCRProvider, ProviderPageInput } from '../types'

/**
 * Local (in-browser) OCR via Tesseract.js WASM with the Bengali traineddata.
 *
 * The `ben` traineddata (~1.3 MB gz) is committed to the repo under `public/lang/`
 * so same-origin loading works on GitHub Pages after the first request; the
 * tesseract.js worker + core come from the pinned CDN (mojcore/jsDelivr) which
 * is CORS-enabled. No document data ever leaves the browser for this provider.
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
      label: 'Bengali (tessdata_best_int)',
      description: 'Tesseract Bengali traineddata, integer mode.',
      sizeInfo: '≈1.31 MB gz · hosted in-repo',
    },
  ],
  defaultModel: 'ben',

  async isConfigured() {
    return true
  },

  async processPage(input: ProviderPageInput): Promise<OcrPageResult> {
    const worker = await getWorker()
    if (input.signal?.aborted) throw new DOMException('aborted', 'AbortError')
    const t0 = performance.now()
    const { data } = await worker.recognize(input.canvas)
    const elapsed = Math.round(performance.now() - t0)
    return {
      pageIndex: input.pageIndex,
      text: data.text,
      confidence: data.confidence,
      lines: toLines(data),
      blocks: toBlocks(data),
      meta: {
        engine: 'tesseract.js',
        language: 'ben',
        processingMs: elapsed,
      },
    }
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
import type { OCRDocumentResult, OCRProvider, OcrPageResult, PipelineStage, PreprocessOptions } from './types'
import { PIPELINE_ORDER } from './types'
import { detectFileKind, FileKind } from '../documents/detect'
import { loadImageToCanvas, type RenderedPage } from '../documents/image'
import { renderPdf } from '../documents/pdf'
import { preprocessCanvas } from './preprocessing/client'
import { postprocessBangla, type BanglaIssue } from './postprocessing/bangla'

export interface PipelineCallbacks {
  onStage?: (stage: PipelineStage) => void
  onPage?: (pageIndex: number, status: PageStatus, detail?: string) => void
  /** Called after each page is rendered (for preview). */
  onRenderedPage?: (page: RenderedPage, index: number) => void
  /** Called after preprocessing so the UI can preview the cleaned image. */
  onPreprocessedPage?: (canvas: HTMLCanvasElement, index: number, applied: string[]) => void
}

export type PageStatus = 'rendering' | 'preprocessing' | 'ocr' | 'requesting-remote' | 'normalizing' | 'done' | 'error'

export interface PageOutcome {
  ocr: OcrPageResult
  rawText: string
  preprocessApplied: string[]
}

export type DocumentOutcome = OCRDocumentResult & {
  pageOutcomes: PageOutcome[]
  issues: BanglaIssue[]
}

export interface RunOptions {
  file: File
  provider: OCRProvider
  model?: string
  preprocess: PreprocessOptions
  postprocess: boolean
  callbacks?: PipelineCallbacks
  signal?: AbortSignal
  /** Render PDFs at this scale hint (longest side, px). */
  pdfMaxDim?: number
}

export interface PipelineIssues {
  issues: BanglaIssue[]
}

function joinPages(pages: string[]): string {
  return pages.map((p) => p.trimEnd()).join('\n\n').replace(/\n{3,}/g, '\n\n')
}

/**
 * Runs the documented pipeline for one document:
 * upload → render → preprocess → layout → ocr → normalize → done.
 * Every stage the pipeline actually reaches is recorded truthfully in `stages`.
 */
export async function runDocumentOcr(opts: RunOptions): Promise<OCRDocumentResult & { pageOutcomes: PageOutcome[]; issues: BanglaIssue[] }> {
  const { file, provider, model, preprocess, postprocess } = opts
  const cb = opts.callbacks
  const signal = opts.signal
  const startedAt = Date.now()
  const stages: PipelineStage[] = []

  const emit = (s: PipelineStage) => {
    stages.push(s)
    cb?.onStage?.(s)
  }

  const throwIfAborted = () => {
    if (signal?.aborted) throw new DOMException('aborted', 'AbortError')
  }

  const kind: FileKind = detectFileKind(file)
  if (kind === 'unsupported') {
    throw new Error(`Unsupported file type "${file.name}". Supported: PNG, JPG, JPEG, WEBP, PDF.`)
  }

  emit('upload')
  emit('render')

  // Render phase
  const rendered: RenderedPage[] =
    kind === 'pdf'
      ? await renderPdf(await file.arrayBuffer(), {
          maxDim: opts.pdfMaxDim ?? 1600,
          signal,
          onProgress: (done, total) => cb?.onPage?.(done - 1, 'rendering', `page ${done}/${total}`),
        })
      : [await loadImageToCanvas(file)]

  throwIfAborted()

  const outcomes: PageOutcome[] = []
  const issues: BanglaIssue[] = []
  const rawPages: string[] = []

  for (let i = 0; i < rendered.length; i++) {
    throwIfAborted()
    const page = rendered[i]
    cb?.onRenderedPage?.(page, i)
    cb?.onPage?.(i, 'preprocessing')

    emit('preprocess')
    let working = page.canvas
    let preprocessApplied: string[] = []
    try {
      const r = await preprocessCanvas(page.canvas, { ...preprocess, targetMinDim: 1200 })
      working = r.canvas
      preprocessApplied = r.applied
      cb?.onPreprocessedPage?.(r.canvas, i, r.applied)
    } catch (err) {
      // Preprocessing is best-effort; never fail OCR because of it.
      if (err instanceof Error && err.message.includes('Unsupported')) throw err
      preprocessApplied = ['preprocess skipped (error)']
    }

    emit('layout')
    cb?.onPage?.(i, provider.type === 'api' ? 'requesting-remote' : 'ocr')

    let ocr: OcrPageResult
    try {
      ocr = await provider.processPage({ canvas: working, pageIndex: i, model, signal })
    } catch (err) {
      cb?.onPage?.(i, 'error', err instanceof Error ? err.message : 'OCR failed')
      throw err
    }

    emit('normalize')
    let pageText = ocr.text
    const pageRaw = ocr.text
    if (postprocess) {
      const result = postprocessBangla(pageText)
      pageText = result.text
      ocr.processedText = pageText
      issues.push(...result.issues)
    }

    outcomes.push({ ocr: { ...ocr, text: pageText }, rawText: pageRaw, preprocessApplied })
    rawPages.push(pageRaw)
    cb?.onPage?.(i, 'done')
  }

  emit('done')

  return {
    id: crypto.randomUUID?.() ?? Math.random().toString(36).slice(2),
    fileName: file.name,
    providerId: provider.id,
    model,
    rawText: joinPages(rawPages),
    text: joinPages(outcomes.map((o) => o.ocr.text)),
    pages: outcomes.map((o) => o.ocr),
    pageOutcomes: outcomes,
    issues,
    startedAt,
    finishedAt: Date.now(),
    processingMs: Date.now() - startedAt,
    stages,
  }
}

export function pipelineStageIndex(stage: PipelineStage): number {
  return PIPELINE_ORDER.indexOf(stage)
}

export function averageConfidence(pages: OcrPageResult[]): number | undefined {
  const confs = pages.map((p) => p.confidence).filter((c): c is number => typeof c === 'number')
  if (confs.length === 0) return undefined
  return confs.reduce((a, b) => a + b, 0) / confs.length
}

export function orderedStages(ran: PipelineStage[]): PipelineStage[] {
  const active = new Set(ran)
  return PIPELINE_ORDER.filter((s) => active.has(s) || s === 'done')
}
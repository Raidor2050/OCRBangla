/**
 * Core OCR contracts for Ordinary Chobi Reader.
 *
 * Design rules:
 * - A provider only exposes fields it can *actually* supply. Never fabricate
 *   confidence, bounding boxes, or accuracy figures.
 * - The pipeline consumes RenderedPage canvases and produces a structured
 *   OCRResult that can later grow richer (reading order, semantic regions)
 *   without breaking existing consumers.
 */

export type ProviderType = 'local' | 'api'

export interface ModelInfo {
  id: string
  label: string
  description?: string
  /** Where known: e.g. '≈1.31 MB gz (Bengali traineddata)'. Free text, not fabricated numbers. */
  sizeInfo?: string
}

export interface ProviderCapabilities {
  /** Engine produces a calibrated-ish per-result confidence number. */
  supportsConfidence: boolean
  /** Engine returns per-line bounding boxes. */
  supportsLineBoxes: boolean
  /** Engine returns per-word bounding boxes. */
  supportsWordBoxes: boolean
  /** Processes image data directly (all local and the documented APIs). */
  inputImages: boolean
  /** Engine can accept a multi-page document concept natively (none implemented today). */
  nativePdf: boolean
  /** True when the provider sends the document bytes to a third party. */
  requiresNetwork: boolean
  /** Representative languages, ISO 639-3 style tags. */
  languages: string[]
}

export interface OcrWord {
  text: string
  confidence?: number
  bbox?: Box
}

export interface OcrLine {
  text: string
  confidence?: number
  bbox?: Box
  words?: OcrWord[]
}

export interface Box {
  x: number
  y: number
  w: number
  h: number
}

export interface OcrBlock {
  text: string
  lineIndex: number
  bbox?: Box
}

export interface OcrPageResult {
  pageIndex: number
  text: string
  /** Wholly trusted engine confidence (undefined if engine doesn't provide it). */
  confidence?: number
  lines?: OcrLine[]
  blocks?: OcrBlock[]
  /** Provider-reported metadata (engine, model, timing). */
  meta?: Record<string, string | number>
  /** Text after Bangla post-processing (when the pipeline applied it). */
  processedText?: string
}

export interface OCRProvider {
  id: string
  name: string
  type: ProviderType
  description: string
  capabilities: ProviderCapabilities
  languages: string[]
  models: ModelInfo[]
  defaultModel?: string

  /** True when required credentials/model are available right now. */
  isConfigured: () => boolean | Promise<boolean>

  processPage(input: ProviderPageInput): Promise<OcrPageResult>
}

export interface ProviderPageInput {
  /** The (preprocessed) page image to recognize. */
  canvas: HTMLCanvasElement
  pageIndex: number
  model?: string
  signal?: AbortSignal
}

export interface OCRDocumentResult {
  id: string
  fileName: string
  providerId: string
  model?: string
  pages: OcrPageResult[]
  /** Fully assembled plain text (per-page joined, post-processed by the caller). */
  text: string
  /** Raw OCR text before Bangla post-processing (when the pipeline applied it). */
  rawText?: string
  startedAt: number
  finishedAt: number
  processingMs: number
  /** Pipeline stages actually run, for the stage indicator + JSON export. */
  stages?: string[]
}

export type PipelineStage =
  | 'upload'
  | 'render'
  | 'preprocess'
  | 'layout'
  | 'ocr'
  | 'normalize'
  | 'done'

export const PIPELINE_ORDER: PipelineStage[] = [
  'upload',
  'render',
  'preprocess',
  'layout',
  'ocr',
  'normalize',
  'done',
]

export interface PreprocessOptions {
  auto?: boolean
  grayscale?: boolean
  contrast?: number
  sharpen?: boolean
  denoise?: boolean
  threshold?: 'none' | 'otsu' | 'sauvola' | 'adaptive'
  deskew?: boolean
  rotate?: number
  scale?: number
  /** Target DPI hint (we translate to a target short-side pixel count). */
  targetMinDim?: number
}

export const DEFAULT_PREPROCESS: PreprocessOptions = {
  auto: true,
  grayscale: false,
  contrast: 1,
  sharpen: false,
  denoise: false,
  threshold: 'none',
  deskew: false,
  rotate: 0,
  scale: 1,
}
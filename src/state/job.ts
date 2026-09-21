import type { FileKind } from '../documents/detect'
import type { PipelineStage } from '../ocr/types'
import type { DocumentOutcome } from '../ocr/pipeline'

export type JobStatus = 'queued' | 'running' | 'complete' | 'failed' | 'cancelled'

export interface JobItem {
  id: string
  file: File
  kind: FileKind
  status: JobStatus
  stage: PipelineStage | null
  detail?: string
  pagesTotal?: number
  pagesDone?: number
  error?: string
  /** Original (or processed) page canvases for preview, indexed by page. */
  previews: Array<HTMLCanvasElement | null>
  result?: DocumentOutcome
  controller?: AbortController
}

export function isDoneStatus(status: JobStatus): boolean {
  return status === 'complete' || status === 'failed' || status === 'cancelled'
}

export function friendlyJobError(err: unknown): string {
  if (err instanceof DOMException && err.name === 'AbortError') return 'Cancelled.'
  if (err instanceof Error) {
    if (err.message.includes('Unsupported file')) return err.message
    if (/abort/i.test(err.name || '') || /aborted/i.test(err.message)) return 'Cancelled.'
    return err.message
  }
  return 'An unexpected error occurred.'
}
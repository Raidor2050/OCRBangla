/// <reference lib="webworker" />

import { PixImage, ThresholdMethod, applyPreprocess } from './ops'

export interface PreprocessRequest {
  id: number
  width: number
  height: number
  data: Uint8ClampedArray
  opts: WorkerPreprocessOptions
}

export interface PreprocessResponse {
  id: number
  width: number
  height: number
  data: Uint8ClampedArray
  applied: string[]
  skewAngle?: number
  error?: string
}

export type WorkerPreprocessOptions = {
  auto?: boolean
  grayscale?: boolean
  contrast?: number
  sharpen?: boolean
  denoise?: boolean
  threshold?: ThresholdMethod
  deskew?: boolean
}

const ctx = self as unknown as DedicatedWorkerGlobalScope

ctx.onmessage = (ev: MessageEvent<PreprocessRequest>) => {
  const req = ev.data
  try {
    const img: PixImage = { width: req.width, height: req.height, data: req.data }
    const result = applyPreprocess(img, req.opts)
    const resp: PreprocessResponse = {
      id: req.id,
      width: result.image.width,
      height: result.image.height,
      data: result.image.data,
      applied: result.applied,
      skewAngle: result.skewAngle,
    }
    ctx.postMessage(resp, [resp.data.buffer])
  } catch (err) {
    ctx.postMessage({
      id: req.id,
      width: req.width,
      height: req.height,
      data: req.data,
      applied: [],
      error: err instanceof Error ? err.message : 'preprocess worker error',
    } as PreprocessResponse)
  }
}
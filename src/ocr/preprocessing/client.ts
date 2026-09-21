import { PixImage, applyPreprocess } from './ops'
import type { PreprocessRequest, PreprocessResponse } from './preprocess.worker'
import type { PreprocessOptions } from '../types'

export interface PreprocessedCanvas {
  canvas: HTMLCanvasElement
  applied: string[]
  skewAngle?: number
}

class PreprocessClient {
  private worker: Worker | null = null
  private nextId = 1
  private pending = new Map<number, { resolve: (r: PreprocessResponse) => void; reject: (e: Error) => void }>()

  private ensureWorker(): Worker | null {
    if (this.worker) return this.worker
    try {
      const w = new Worker(new URL('./preprocess.worker.ts', import.meta.url), { type: 'module' })
      w.onmessage = (ev: MessageEvent<PreprocessResponse>) => {
        const p = this.pending.get(ev.data.id)
        if (!p) return
        this.pending.delete(ev.data.id)
        if (ev.data.error) p.reject(new Error(ev.data.error))
        else p.resolve(ev.data)
      }
      w.onerror = () => {
        // Worker failure: fall back to main-thread path on the next call.
        this.worker?.terminate()
        this.worker = null
      }
      this.worker = w
    } catch {
      this.worker = null
    }
    return this.worker
  }

  private runOnWorker(img: PixImage, opts: PreprocessRequest['opts']): Promise<PreprocessResponse> {
    return new Promise((resolve, reject) => {
      const w = this.ensureWorker()
      if (!w) {
        reject(new Error('worker unavailable'))
        return
      }
      const id = this.nextId++
      this.pending.set(id, { resolve, reject })
      const msg: PreprocessRequest = {
        id,
        width: img.width,
        height: img.height,
        data: img.data,
        opts,
      }
      w.postMessage(msg, [msg.data.buffer])
    })
  }

  private async runOnMain(img: PixImage, opts: PreprocessRequest['opts']): Promise<PreprocessResponse> {
    const result = applyPreprocess(img, opts)
    return {
      id: 0,
      width: result.image.width,
      height: result.image.height,
      data: result.image.data,
      applied: result.applied,
      skewAngle: result.skewAngle,
    }
  }
}

export const preprocessClient = new PreprocessClient()

function canvasToImage(canvas: HTMLCanvasElement): PixImage {
  const c = canvas.getContext('2d', { willReadFrequently: true })
  if (!c) throw new Error('canvas 2d context unavailable')
  const imageData = c.getImageData(0, 0, canvas.width, canvas.height)
  return { width: canvas.width, height: canvas.height, data: imageData.data }
}

function imageToCanvas(img: PixImage): HTMLCanvasElement {
  const out = document.createElement('canvas')
  out.width = img.width
  out.height = img.height
  const c = out.getContext('2d')
  if (!c) throw new Error('canvas 2d context unavailable')
  c.putImageData(new ImageData(img.data, img.width, img.height), 0, 0)
  return out
}

function scaleCanvas(canvas: HTMLCanvasElement, scale: number): HTMLCanvasElement {
  if (scale === 1) return canvas
  const out = document.createElement('canvas')
  out.width = Math.max(1, Math.round(canvas.width * scale))
  out.height = Math.max(1, Math.round(canvas.height * scale))
  const c = out.getContext('2d')
  if (!c) throw new Error('canvas 2d context unavailable')
  c.imageSmoothingEnabled = true
  c.imageSmoothingQuality = 'high'
  c.drawImage(canvas, 0, 0, out.width, out.height)
  return out
}

function rotateCanvas(canvas: HTMLCanvasElement, degrees: number): HTMLCanvasElement {
  if (degrees === 0) return canvas
  const rad = (degrees * Math.PI) / 180
  const out = document.createElement('canvas')
  out.width = canvas.width
  out.height = canvas.height
  const c = out.getContext('2d')
  if (!c) throw new Error('canvas 2d context unavailable')
  c.translate(out.width / 2, out.height / 2)
  c.rotate(rad)
  c.drawImage(canvas, -canvas.width / 2, -canvas.height / 2)
  return out
}

/**
 * Main entry: preprocess a page canvas and return the cleaned canvas plus a
 * truthful list of what was applied. Rotation/rescaling are done with native
 * canvas transforms; heavy pixel ops run in a Web Worker when available.
 */
export async function preprocessCanvas(
  canvas: HTMLCanvasElement,
  opts: PreprocessOptions,
): Promise<PreprocessedCanvas> {
  let current = canvas

  // Order matters for Bangla: upscale BEFORE binarizing (research default).
  if (opts.rotate && opts.rotate !== 0) current = rotateCanvas(current, opts.rotate)

  const targetMinDim = opts.targetMinDim ?? 1200
  const auto = opts.auto
  let scale = opts.scale && opts.scale > 0 ? opts.scale : 1
  if (auto) {
    const minDim = Math.min(current.width, current.height)
    if (minDim < targetMinDim) scale = Math.min(2, targetMinDim / minDim)
    else scale = 1
  }
  if (scale !== 1) current = scaleCanvas(current, scale)

  const img = canvasToImage(current)
  const workerOpts = {
    auto: auto ?? false,
    grayscale: opts.grayscale ?? false,
    contrast: opts.contrast ?? 1,
    sharpen: opts.sharpen ?? false,
    denoise: opts.denoise ?? false,
    threshold: opts.threshold ?? ('none' as const),
    deskew: opts.deskew ?? false,
  }

  let result: PreprocessResponse
  try {
    result = await preprocessClient['runOnWorker'](img, workerOpts)
  } catch {
    result = await preprocessClient['runOnMain'](img, workerOpts)
  }

  let out = imageToCanvas({ width: result.width, height: result.height, data: result.data })

  // Auto mode applies the estimated scale with native quality in the worker
  // savings path only if it did not already upscale; otherwise our initial scale
  // already ran. If auto requested scale and it changed nothing above (e.g.,
  // scale computed already applied) nothing extra is needed.
  if (result.skewAngle && opts.deskew && Math.abs(result.skewAngle) > 0.15) {
    out = rotateCanvas(out, result.skewAngle)
    result.applied.push(`deskew ${result.skewAngle.toFixed(2)}°`)
  }

  return { canvas: out, applied: result.applied, skewAngle: result.skewAngle }
}

/**
 * Main-thread, synchronously-safe variant used by tests and fallback paths.
 * Does not use the worker; still deterministic.
 */
export function applyPixelOnly(img: PixImage, opts: PreprocessOptions) {
  return applyPreprocess(img, {
    auto: opts.auto ?? false,
    grayscale: opts.grayscale ?? false,
    contrast: opts.contrast ?? 1,
    sharpen: opts.sharpen ?? false,
    denoise: opts.denoise ?? false,
    threshold: opts.threshold ?? 'none',
    deskew: opts.deskew ?? false,
  })
}
import { MAX_IMAGE_DIM } from './detect'

export interface RenderedPage {
  index: number
  canvas: HTMLCanvasElement
  width: number
  height: number
}

/**
 * Load an image file into a canvas, capping dimensions to protect memory.
 * Uses createImageBitmap when available (faster decode, no <img> round-trip).
 */
export async function loadImageToCanvas(file: File): Promise<RenderedPage> {
  const bitmap = await createImageBitmap(file)
  try {
    return bitmapToPage(bitmap, 0)
  } finally {
    bitmap.close()
  }
}

export function bitmapToPage(bitmap: ImageBitmap | HTMLImageElement, index: number): RenderedPage {
  const scale = Math.min(1, MAX_IMAGE_DIM / Math.max(bitmap.width, bitmap.height))
  const w = Math.max(1, Math.round(bitmap.width * scale))
  const h = Math.max(1, Math.round(bitmap.height * scale))
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('canvas 2d context unavailable')
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(bitmap, 0, 0, w, h)
  return { index, canvas, width: w, height: h }
}

export function canvasToDataUrl(
  canvas: HTMLCanvasElement,
  mime: 'image/jpeg' | 'image/png' = 'image/jpeg',
  quality = 0.85,
  maxDim = 1568,
): string {
  if (Math.max(canvas.width, canvas.height) <= maxDim) {
    return canvas.toDataURL(mime, quality)
  }
  const scale = maxDim / Math.max(canvas.width, canvas.height)
  const out = document.createElement('canvas')
  out.width = Math.max(1, Math.round(canvas.width * scale))
  out.height = Math.max(1, Math.round(canvas.height * scale))
  const ctx = out.getContext('2d')
  if (!ctx) throw new Error('canvas 2d context unavailable')
  ctx.drawImage(canvas, 0, 0, out.width, out.height)
  return out.toDataURL(mime, quality)
}

export async function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob)
      else reject(new Error('canvas toBlob failed'))
    }, 'image/png')
  })
}

/**
 * Composite-aware: produce an image element or data URL for the preview pane
 * keeping the original canvas untouched (the pipeline draws on copies).
 */
export function canvasToObjectURL(canvas: HTMLCanvasElement): string {
  return canvas.toDataURL('image/png')
}
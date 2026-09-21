import type { RenderedPage } from './image'

/**
 * PDF rendering via pdfjs-dist. Lazy-imported so the heavy library only loads
 * when a PDF is actually opened. Pages are rendered to canvases page-by-page
 * so big files do not freeze the main thread for minutes at once.
 */

export interface RenderPdfOptions {
  /** Longest page side in output pixels. Default 1600 (≈200 DPI at A4 letterbox). */
  maxDim?: number
  onProgress?: (done: number, total: number) => void
  signal?: AbortSignal
}

export async function renderPdf(
  file: ArrayBuffer,
  options: RenderPdfOptions = {},
): Promise<RenderedPage[]> {
  const { maxDim = 1600, onProgress, signal } = options
  const pdfjs = await import('pdfjs-dist')
  const workerUrl = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url,
  ).toString()
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl

  const doc = await pdfjs.getDocument({
    data: new Uint8Array(file),
    isEvalSupported: false,
    useSystemFonts: true,
    disableFontFace: false,
  }).promise

  const total = doc.numPages
  const pages: RenderedPage[] = []
  try {
    for (let i = 1; i <= total; i++) {
      if (signal?.aborted) throw new DOMException('aborted', 'AbortError')
      const page = await doc.getPage(i)
      const base = page.getViewport({ scale: 1 })
      const scale = Math.min(4, maxDim / Math.max(base.width, base.height))
      const viewport = page.getViewport({ scale })
      const canvas = document.createElement('canvas')
      canvas.width = Math.floor(viewport.width)
      canvas.height = Math.floor(viewport.height)
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('canvas 2d context unavailable')
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      await page.render({ canvasContext: ctx, viewport }).promise
      pages.push({ index: i - 1, canvas, width: canvas.width, height: canvas.height })
      try {
        page.cleanup()
      } catch {
        /* best effort */
      }
      onProgress?.(i, total)
    }
  } finally {
    try {
      await doc.destroy()
    } catch {
      /* best effort */
    }
  }
  return pages
}
import { useCallback, useEffect, useRef, useState } from 'react'
import type { OcrLine, PipelineStage } from '../ocr/types'
import { humanSize } from '../documents/detect'

export interface DocPaneProps {
  canvas?: HTMLCanvasElement | null
  lines?: OcrLine[]
  busy: boolean
  stage?: PipelineStage | null
  fileName: string
  pageLabel?: string
  detail?: string
  showOverlay: boolean
  stackBelow?: boolean
}

export function DocPane({ canvas, lines, busy, stage, fileName, pageLabel, detail, showOverlay }: DocPaneProps) {
  const [zoom, setZoom] = useState(1)
  const [measured, setMeasured] = useState({ w: 0, h: 0 })
  const wrapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!canvas || !canvasRef.current) return
    canvasRef.current.width = canvas.width
    canvasRef.current.height = canvas.height
    const ctx = canvasRef.current.getContext('2d')
    if (ctx) ctx.drawImage(canvas, 0, 0)
  }, [canvas])

  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const update = () => {
      const rect = el.getBoundingClientRect()
      setMeasured({ w: rect.width, h: rect.height })
    }
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const scaleBox = useCallback(
    (b: { x: number; y: number; w: number; h: number }): React.CSSProperties => {
      if (!canvas || measured.w === 0) return { visibility: 'hidden' }
      const s = measured.w / (zoom * canvas.width)
      return {
        left: b.x * s,
        top: b.y * s,
        width: b.w * s,
        height: b.h * s,
      }
    },
    [canvas, measured.w, zoom],
  )

  const zoomLabel = pageLabel ?? (canvas ? `${canvas.width}×${canvas.height}` : '')

  return (
    <div className="doc-pane" style={{ display: 'flex', flexDirection: 'column', minHeight: 0, flex: 1 }}>
      <div className="panel-head" style={{ flexShrink: 0 }}>
        <span className="panel-title" style={{ textTransform: 'none' }} title={fileName}>
          {fileName.length > 34 ? fileName.slice(0, 34) + '…' : fileName}
          {zoomLabel && <span className="muted" style={{ marginLeft: 8 }}>{zoomLabel}</span>}
        </span>
        <div style={{ display: 'flex', gap: 'var(--sp-2)', alignItems: 'center' }}>
          <button
            type="button"
            className="btn btn-sm btn-ghost"
            aria-label="Zoom out"
            onClick={() => setZoom((z) => Math.max(0.25, +(z - 0.25).toFixed(2)))}
          >
            −
          </button>
          <span className="mono-number subtle" style={{ minWidth: 40, textAlign: 'center' }}>
            {Math.round(zoom * 100)}%
          </span>
          <button
            type="button"
            className="btn btn-sm btn-ghost"
            aria-label="Zoom in"
            onClick={() => setZoom((z) => Math.min(3, +(z + 0.25).toFixed(2)))}
          >
            +
          </button>
        </div>
      </div>
      <div className="doc-stage">
        {canvas ? (
          <div
            ref={wrapRef}
            className="doc-canvas-wrap"
            style={{
              transform: `scale(${zoom})`,
              transformOrigin: 'top center',
              backgroundColor: 'var(--paper)',
            }}
          >
            <canvas ref={canvasRef} style={{ display: 'block', maxWidth: '100%', height: 'auto', background: 'var(--paper)' }} />
            {showOverlay && lines && lines.length > 0 && (
              <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
                {lines.map((l, i) =>
                  l.bbox ? (
                    <div key={i} className="overlay-box" style={scaleBox(l.bbox)} aria-hidden="true" />
                  ) : null,
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="empty-state" style={{ flex: 1 }}>
            <span className="glyph">▣</span>
            <h3>No document selected</h3>
            <p className="small muted">Add a PNG, JPG, WEBP or PDF above, then run OCR.</p>
          </div>
        )}
        {busy && (
          <div className="scan-stage" role="presentation">
            <div className="scan-beam active" />
          </div>
        )}
        {busy && stage && (
          <div className="doc-status" role="status" aria-live="polite">
            <span>{stage.charAt(0).toUpperCase() + stage.slice(1)}</span>
            {detail && <span className="muted">{detail}</span>}
          </div>
        )}
      </div>
    </div>
  )
}

export function smallFileLabel(bytes: number): string {
  return humanSize(bytes)
}
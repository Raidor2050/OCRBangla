import { useMemo, useRef } from 'react'
import { Link } from 'react-router-dom'
import type { OCRProvider } from '../ocr/types'
import type { JobItem } from '../state/job'
import { isDoneStatus } from '../state/job'
import { TextPane } from './TextPane'
import { ProviderSetup } from './ProviderSetup'
import { PipelineBar } from './PipelineBar'

export type WizardStep = 1 | 2 | 3

export interface WizardModalProps {
  step: WizardStep
  items: JobItem[]
  activeId?: string
  onSelect: (id: string) => void
  provider: OCRProvider
  configured: boolean
  model?: string
  modelOptions: Array<{ id: string; label: string }>
  onModelChange: (model: string) => void
  onAddFiles: (files: File[]) => void
  onPickProvider: (id: string) => void
  onRun: () => void
  onCancelRun: () => void
  onSaveZip: () => void
  onBack: () => void
  onNext: () => void
  onClose: () => void
}

const STEPS: Array<{ n: WizardStep; label: string }> = [
  { n: 1, label: 'Add files' },
  { n: 2, label: 'Choose a reader' },
  { n: 3, label: 'Scan & read' },
]

const CHOICE_TILES: Array<{ id: string; title: string; sub: string; badge?: string }> = [
  {
    id: 'tesseract',
    title: 'Built-in local model',
    sub: 'Reads in this browser — free, private, no key',
    badge: 'Recommended',
  },
  { id: 'gemini', title: 'Google AI (Gemini)', sub: 'Sends images to Google · needs an API key' },
  { id: 'openai', title: 'Another AI service', sub: 'OpenAI · Groq · OpenRouter · needs an API key' },
]

export function WizardModal(props: WizardModalProps) {
  const { step, items, activeId, provider, configured, model, modelOptions, onModelChange } = props
  const inputRef = useRef<HTMLInputElement>(null)

  const runningCount = items.filter((i) => i.status === 'running').length
  const doneCount = items.filter((i) => i.status === 'complete').length
  const busy = runningCount > 0

  const active =
    items.find((i) => i.status === 'running') ?? items.find((i) => i.id === activeId) ?? items[items.length - 1]
  const activeCanvas = active?.previews[0]
  const previewUrl = useMemo(() => activeCanvas?.toDataURL('image/png'), [activeCanvas])
  const isApi = provider.type === 'api'
  const canRun = items.length > 0 && !busy && (!isApi || configured)

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    if (e.dataTransfer.files?.length) props.onAddFiles(Array.from(e.dataTransfer.files))
  }

  return (
    <div className="wizard-backdrop" onDragOver={(e) => e.preventDefault()} onDrop={handleDrop}>
      <div className="wizard" role="dialog" aria-modal="true" aria-label="Batch OCR">
        <div className="wizard-head">
          <div>
            <span className="wizard-title">Batch OCR</span>
            <p className="small muted" style={{ margin: 0 }}>
              A few quick steps to read your documents.
            </p>
          </div>
          <div className="wizard-steps" aria-label="Steps">
            {STEPS.map((s) => {
              const state = s.n < step ? 'done' : s.n === step ? 'active' : ''
              return (
                <div key={s.n} className={'wizard-step ' + state}>
                  <span className="wizard-step-num">{s.n < step ? '✓' : s.n}</span>
                  <span className="wizard-step-label">{s.label}</span>
                </div>
              )
            })}
          </div>
          <button
            type="button"
            className="btn btn-sm btn-ghost"
            aria-label="Close"
            disabled={busy}
            onClick={props.onClose}
            title={busy ? 'Wait for scanning to finish' : 'Close'}
          >
            ✕
          </button>
        </div>

        <div className="wizard-body">
          {step === 1 && (
            <div className="wizard-content">
              <div
                className="wizard-dropzone"
                role="button"
                tabIndex={0}
                onClick={() => inputRef.current?.click()}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click()
                }}
              >
                <input
                  ref={inputRef}
                  type="file"
                  accept=".png,.jpg,.jpeg,.webp,.pdf,image/png,image/jpeg,image/webp,application/pdf"
                  multiple
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    if (e.target.files) props.onAddFiles(Array.from(e.target.files))
                    e.target.value = ''
                  }}
                />
                <span className="glyph" style={{ fontSize: 'var(--fs-2xl)' }}>
                  ⤓
                </span>
                <p style={{ fontWeight: 600, margin: 0 }}>Drop images or PDFs here, or click to browse</p>
                <p className="small muted" style={{ margin: 0 }}>
                  Pick several at once — JPG, PNG, WebP or PDF. You can also paste from your clipboard.
                </p>
              </div>

              {items.length > 0 && (
                <div className="wizard-files">
                  <span className="step-label">
                    Added ({items.length})
                  </span>
                  <div className="wizard-file-row">
                    {items.map((it) => (
                      <span
                        key={it.id}
                        className={'chip ' + (it.status === 'failed' ? 'chip-error' : isDoneStatus(it.status) ? 'chip-ok' : 'chip-static')}
                        title={it.file.name}
                      >
                        {it.file.name.length > 28 ? it.file.name.slice(0, 28) + '…' : it.file.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="wizard-content">
              <div className="setup-tiles">
                {CHOICE_TILES.map((t) => {
                  const selected = provider.id === t.id
                  return (
                    <div
                      key={t.id}
                      role="radio"
                      aria-checked={selected}
                      tabIndex={0}
                      className={'setup-tile' + (selected ? ' active' : '')}
                      onClick={() => props.onPickProvider(t.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') props.onPickProvider(t.id)
                      }}
                    >
                      <span className="setup-tile-title">
                        {t.title}
                        {t.badge && (
                          <span className="chip chip-ok" style={{ marginLeft: 6 }}>
                            {t.badge}
                          </span>
                        )}
                      </span>
                      <span className="small muted">{t.sub}</span>
                    </div>
                  )
                })}
              </div>

              {provider.type === 'local' && (
                <div className="row" style={{ gap: 'var(--sp-2)', flexWrap: 'wrap' }}>
                  <span className="chip chip-ok">The Bengali model is built into this app</span>
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 'var(--fs-sm)' }}>
                    Language / mode
                    <select className="select" value={model ?? 'ben'} onChange={(e) => onModelChange(e.target.value)} aria-label="Tesseract model mode">
                      {modelOptions.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  {items.length > 0 && (
                    <span className="subtle small">
                      No key needed — your images never leave this device.
                    </span>
                  )}
                </div>
              )}

              {provider.type === 'local' && model === 'ben-hand' && (
                <div className="callout callout-warn">
                  <strong>Experimental — verify results.</strong>{' '}
                  Bangla handwriting recognition is research-grade: ~94% character accuracy on clean single words,
                  ~70–74% on full handwritten lines, and much lower on photos or unusual handwriting. Runs fully on
                  this device.
                </div>
              )}

              {isApi && configured && (
                <div className="row" style={{ gap: 'var(--sp-2)', flexWrap: 'wrap' }}>
                  <span className="chip chip-accent">Key saved on this device</span>
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 'var(--fs-sm)' }}>
                    Model
                    <select className="select" value={model ?? ''} onChange={(e) => onModelChange(e.target.value)} aria-label="API model">
                      {modelOptions.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <Link to="/models" className="link small">
                    Change key
                  </Link>
                </div>
              )}

              {isApi && !configured && (
                <ProviderSetup
                  provider={provider}
                  model={model}
                  onModelChange={onModelChange}
                  onSaved={() => props.onNext()}
                />
              )}

              {isApi && !configured && (
                <p className="small muted" style={{ marginTop: 'var(--sp-2)' }}>
                  No key? Use the{' '}
                  <button type="button" className="link" onClick={() => props.onPickProvider('tesseract')}>
                    built-in local model
                  </button>{' '}
                  instead — it reads Bengali right in your browser.
                </p>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="wizard-content" style={{ padding: 0 }}>
              <div className="wizard-scan-grid">
                <div className="scan-frame">
                  {previewUrl ? (
                    <img src={previewUrl} alt="Document being scanned" className="scan-image" />
                  ) : (
                    <div className="scan-placeholder">
                      <span className="glyph">◫</span>
                      <p className="small muted">Waiting for the first image…</p>
                    </div>
                  )}
                  {busy && <div className="scan-line" aria-hidden="true" />}
                  {busy && (
                    <span className="chip chip-accent scan-badge">Scanning…</span>
                  )}
                  {!busy && doneCount > 0 && (
                    <span className="chip chip-ok scan-badge">Read</span>
                  )}
                </div>
                <div className="wizard-text">
                  <div className="panel-head">
                    <span className="panel-title">Text</span>
                    {active?.status === 'running' && <span className="chip chip-accent">reading…</span>}
                  </div>
                  <TextPane result={active?.result} />
                </div>
              </div>

              <div className="wizard-scan-list" style={{ padding: 'var(--sp-3) var(--sp-4)' }}>
                {items.map((it) => (
                  <div key={it.id} className="wizard-scan-item">
                    <span className="wizard-scan-name" title={it.file.name}>
                      {it.file.name.length > 40 ? it.file.name.slice(0, 40) + '…' : it.file.name}
                    </span>
                    <span
                      className={'chip ' + (it.status === 'running' ? 'chip-accent' : it.status === 'complete' ? 'chip-ok' : it.status === 'failed' ? 'chip-error' : 'chip-static')}
                    >
                      {it.status === 'running'
                        ? it.stage ? it.stage.charAt(0).toUpperCase() + it.stage.slice(1) + '…' : 'Reading…'
                        : it.status === 'complete'
                          ? 'Read ✓'
                          : it.status === 'failed'
                            ? 'Failed'
                            : it.status === 'cancelled'
                              ? 'Stopped'
                              : 'Waiting'}
                    </span>
                  </div>
                ))}
              </div>

              {doneCount > 0 && doneCount === items.length && (
                <div className="callout callout-ok wizard-summary" style={{ margin: 'var(--sp-3) var(--sp-4)' }}>
                  <span>
                    All {items.length} document{items.length === 1 ? '' : 's'} read. Save them as one ZIP, or open the
                    full workspace.
                  </span>
                </div>
              )}
              {items.length > 0 && (items.some((i) => i.status === 'failed' || i.status === 'cancelled')) && (
                <div className="callout callout-warn wizard-summary" style={{ margin: 'var(--sp-3) var(--sp-4)' }}>
                  Some documents weren't read — open the workspace to retry them.
                </div>
              )}
            </div>
          )}
        </div>

        <div className="wizard-foot">
          <PipelineBar stages={active?.stage ? [active.stage] : []} />
          <div style={{ display: 'flex', gap: 'var(--sp-2)', alignItems: 'center' }}>
            {step > 1 && (
              <button type="button" className="btn" onClick={props.onBack} disabled={busy}>
                ← Back
              </button>
            )}
            {step === 1 && (
              <button type="button" className="btn btn-primary" disabled={items.length === 0} onClick={props.onNext}>
                Next: choose a reader →
              </button>
            )}
            {step === 2 && (
              <>
                {isApi && !configured && (
                  <button type="button" className="btn" onClick={() => props.onPickProvider('tesseract')}>
                    Use built-in local model
                  </button>
                )}
                <button type="button" className="btn btn-primary" disabled={!canRun} onClick={props.onNext}>
                  Next: scan & read →
                </button>
              </>
            )}
            {step === 3 && !busy && doneCount === items.length && (
              <>
                <button type="button" className="btn btn-secondary" onClick={props.onSaveZip}>
                  Save everything (ZIP)
                </button>
                <button type="button" className="btn btn-primary" onClick={props.onClose}>
                  Open documents
                </button>
              </>
            )}
            {step === 3 && !busy && doneCount !== items.length && (
              <button type="button" className="btn btn-primary" onClick={props.onRun} disabled={!canRun}>
                {items.length === 1 ? 'Read my image' : `Read all ${items.length} images`}
              </button>
            )}
            {step === 3 && busy && (
              <button type="button" className="btn btn-ghost" onClick={props.onCancelRun}>
                Stop
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
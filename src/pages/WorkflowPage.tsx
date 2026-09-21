import { useCallback, useMemo, useRef, useState } from 'react'
import { getProvider, PROVIDERS } from '../ocr/registry'
import { runDocumentOcr } from '../ocr/pipeline'
import { useApp } from '../state/AppContext'
import { evaluate, diffText, renderDiffText, substitutionCounts } from '../evaluation/cerwer'
import { postprocessBangla, detectBanglaRatio } from '../ocr/postprocessing/bangla'
import { PIPELINE_ORDER } from '../ocr/types'

export function WorkflowPage() {
  const { settings, statuses, pushToast } = useApp()
  const [file, setFile] = useState<File>()
  const [providerId, setProviderId] = useState('tesseract')
  const [model, setModel] = useState<string | undefined>('ben')
  const [groundTruth, setGroundTruth] = useState('')
  const [phase, setPhase] = useState('')
  const [result, setResult] = useState<ExperimentResult>()
  const [running, setRunning] = useState(false)
  const controllerRef = useRef<AbortController | null>(null)

  const configured = useMemo(() => {
    const p = getProvider(providerId)
    if (!p) return false
    return p.type === 'local' || (statuses.find((s) => s.provider.id === p.id)?.configured ?? false)
  }, [providerId, statuses])

  const isExternal = getProvider(providerId)?.type === 'api'

  const runLab = useCallback(async () => {
    if (!file) {
      pushToast('Upload a document image first.', 'error')
      return
    }
    const provider = getProvider(providerId)
    if (!provider) return
    if (provider.type === 'api' && !configured) {
      pushToast(`${provider.name} is not configured. See Models.`, 'error')
      return
    }
    const controller = new AbortController()
    controllerRef.current = controller
    setRunning(true)
    setPhase('recognizing…')
    try {
      const res = await runDocumentOcr({
        file,
        provider,
        model,
        preprocess: settings.preprocess,
        postprocess: settings.postprocess,
        signal: controller.signal,
      })
      const stats = groundTruth.trim() ? evaluate(groundTruth, res.text) : undefined
      const subs = groundTruth.trim() ? substitutionCounts(groundTruth, res.text) : []
      const diff = groundTruth.trim() ? renderDiffText(diffText(groundTruth, res.text)) : ''
      const ratio = detectBanglaRatio(res.text)
      const post = postprocessBangla(res.text)
      setResult({
        text: res.text,
        processingMs: res.processingMs,
        providerId: provider.id,
        model: res.model,
        stats,
        subs,
        diff,
        banglaRatio: ratio.total > 0 ? ratio.banglaChars / ratio.total : 0,
        issues: post.issues.length,
        pages: res.pages.length,
      })
    } catch (err) {
      if (controller.signal.aborted) {
        pushToast('Experiment cancelled.', 'info')
      } else {
        pushToast(`Run failed: ${err instanceof Error ? err.message : String(err)}`, 'error')
      }
    } finally {
      setRunning(false)
      setPhase('')
    }
  }, [file, providerId, model, settings.preprocess, settings.postprocess, groundTruth, configured, pushToast])

  return (
    <div className="page">
      <h1>Workflow &amp; how OCR sees Bangla</h1>
      <p className="lead">
        Understand the pipeline, meet the shapes that make Bengali handwriting and print hard for machines, and run
        diagnostic experiments with your own documents.
      </p>

      <PipelineExplain />

      <h2 style={{ marginTop: 'var(--sp-6)' }}>Why Bengali is hard for OCR</h2>
      <BanglaPrimer />

      <h2 style={{ marginTop: 'var(--sp-6)' }}>Experiment lab</h2>
      <div className="panel" style={{ padding: 'var(--sp-4)' }}>
        <p className="small muted">
          Recognize one document locally or remotely and measure it honestly against ground truth you provide. CER/WER are
          {` `}relative to <em>your</em> reference text — not a universal accuracy score.
        </p>

        <div style={{ display: 'flex', gap: 'var(--sp-3)', flexWrap: 'wrap', alignItems: 'center' }}>
          <div className="field" style={{ gap: 4 }}>
            <span className="field-label">Model</span>
            <select
              className="select"
              value={providerId}
              onChange={(e) => {
                const id = e.target.value
                setProviderId(id)
                setModel(getProvider(id)?.defaultModel)
              }}
            >
              {PROVIDERS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                  {p.type === 'api' && !(statuses.find((s) => s.provider.id === p.id)?.configured ?? false) ? ' (not configured)' : ''}
                </option>
              ))}
            </select>
          </div>
          {getProvider(providerId)?.models.length ? (
            <div className="field" style={{ gap: 4 }}>
              <span className="field-label">Variant</span>
              <select className="select" value={model ?? ''} onChange={(e) => setModel(e.target.value)}>
                {getProvider(providerId)?.models.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
          <div className="field" style={{ gap: 4 }}>
            <span className="field-label">Sample file</span>
            <input
              type="file"
              accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp"
              onChange={(e) => setFile(e.target.files?.[0])}
            />
          </div>
        </div>

        <div className="field" style={{ marginTop: 'var(--sp-2)' }}>
          <span className="field-label">
            Ground truth <span className="muted small">(optional — needed for CER/WER)</span>
          </span>
          <textarea
            rows={3}
            value={groundTruth}
            onChange={(e) => setGroundTruth(e.target.value)}
            placeholder="The correct text of the sample image, in Bengali…"
            lang="bn"
            spellCheck={false}
          />
        </div>

        {isExternal && (
          <div className="callout callout-warn">
            <strong>External model selected:</strong> your sample image will be sent to {getProvider(providerId)?.name}'s
            servers when you run it. Local Tesseract stays on-device.
          </div>
        )}

        <div style={{ display: 'flex', gap: 'var(--sp-2)', alignItems: 'center', marginTop: 'var(--sp-3)' }}>
          <button type="button" className="btn btn-primary" onClick={runLab} disabled={running}>
            {running ? 'Running…' : 'Run experiment'}
          </button>
          {running && (
            <button type="button" className="btn btn-ghost" onClick={() => controllerRef.current?.abort()}>
              Cancel
            </button>
          )}
          {phase && <span className="chip chip-accent">{phase}</span>}
        </div>

        {result && (
          <div style={{ marginTop: 'var(--sp-4)' }}>
            <div style={{ display: 'flex', gap: 'var(--sp-4)', flexWrap: 'wrap' }}>
              <Stat label="Processing" value={`${(result.processingMs / 1000).toFixed(1)}s`} />
              <Stat label="Pages" value={String(result.pages)} />
              <Stat label="Bangla share" value={`${(result.banglaRatio * 100).toFixed(0)}%`} />
              <Stat label="Bangla issues" value={String(result.issues)} />
            </div>
            {result.stats && (
              <div style={{ display: 'flex', gap: 'var(--sp-5)', flexWrap: 'wrap', marginTop: 'var(--sp-3)' }}>
                <Stat label="CER" value={(result.stats.cer * 100).toFixed(1) + '%'} strong />
                <Stat label="CER (bounded)" value={(result.stats.cerN * 100).toFixed(1) + '%'} />
                <Stat label="WER" value={(result.stats.wer * 100).toFixed(1) + '%'} />
                <Stat label="Word accuracy" value={(result.stats.wordAccuracy * 100).toFixed(1) + '%'} />
                <Stat label="Edits" value={String(result.stats.edits)} />
              </div>
            )}
            <div className="editor" style={{ marginTop: 'var(--sp-3)', maxHeight: 280, overflowY: 'auto' }}>
              <textarea readOnly value={result.text} lang="bn" spellCheck={false} aria-label="Experiment output text" />
            </div>
            {result.diff && (
              <div className="panel" style={{ marginTop: 'var(--sp-3)', maxHeight: 260, overflowY: 'auto' }}>
                <div className="panel-head">
                  <span className="panel-title small">Grapheme diff vs ground truth</span>
                  <span className="subtle small">
                    ⟨gt→hyp⟩ substitution · [gt] deletion · +hyp+ insertion
                  </span>
                </div>
                <pre className="diff-pre small" style={{ whiteSpace: 'pre-wrap', margin: 0 }}>
                  {result.diff}
                </pre>
              </div>
            )}
            {result.subs.length > 0 && (
              <div className="panel" style={{ marginTop: 'var(--sp-3)', maxHeight: 240, overflowY: 'auto' }}>
                <div className="panel-head">
                  <span className="panel-title small">Most confused substitutions</span>
                </div>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Ground truth</th>
                      <th>Read as</th>
                      <th>Count</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.subs.slice(0, 20).map(([a, b, n]) => (
                      <tr key={a + b}>
                        <td style={{ fontFamily: 'var(--font-bangla)', fontSize: 'var(--fs-lg)' }}>{a}</td>
                        <td style={{ fontFamily: 'var(--font-bangla)', fontSize: 'var(--fs-lg)' }}>{b}</td>
                        <td className="mono-number">{n}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

interface ExperimentResult {
  text: string
  processingMs: number
  providerId: string
  model?: string
  stats?: ReturnType<typeof evaluate>
  subs: Array<[string, string, number]>
  diff: string
  banglaRatio: number
  issues: number
  pages: number
}

function Stat({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <span className="subtle small">{label}</span>
      <span className={'mono' + (strong ? ' mono-strong' : '')}>{value}</span>
    </div>
  )
}

const STAGE_COPY: Record<(typeof PIPELINE_ORDER)[number], { label: string; where: string; what: string }> = {
  upload: { label: 'Upload', where: 'Your device', what: 'Files are read locally and listed in the queue.' },
  render: { label: 'Render', where: 'Your device', what: 'Each PDF page or image is drawn to a canvas at a working resolution.' },
  preprocess: { label: 'Enhance', where: 'Your device', what: 'Contrast, size, threshold, and deskew run in a Web Worker to help the engine.' },
  layout: { label: 'Layout', where: 'Engine', what: 'The engine detects lines and regions (shown as boxes, never invented by the UI).' },
  ocr: { label: 'Recognize', where: 'Engine', what: 'Glyph recognition. For local Tesseract this happens in-browser; for API models it is sent out.' },
  normalize: { label: 'Normalize', where: 'Your device', what: 'Bangla Unicode normalization + orthotactic issue flags. No dictionary rewriting.' },
  done: { label: 'Done', where: 'Your device', what: 'Text assembled, ready to copy, download, or export to ZIP.' },
}

function PipelineExplain() {
  return (
    <div className="panel" style={{ padding: 'var(--sp-4)' }}>
      <div className="panel-head" style={{ padding: 0, marginBottom: 'var(--sp-3)' }}>
        <span className="panel-title">The pipeline</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 'var(--sp-2)' }}>
        {PIPELINE_ORDER.map((stage) => {
          const copy = STAGE_COPY[stage]
          const remote = copy.where.startsWith('Engine') && stage === 'ocr'
          return (
            <div key={stage} className="panel" style={{ margin: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span className="field-label">{copy.label}</span>
                <span className={'chip chip-' + (remote ? 'warn' : 'ok')}>{copy.where}</span>
              </div>
              <p className="small muted" style={{ margin: 0 }}>
                {copy.what}
              </p>
            </div>
          )
        })}
      </div>
      <p className="small muted" style={{ marginTop: 'var(--sp-3)' }}>
        Stages in green happen entirely in your browser. 'Recognize' is the only stage that may send your document to an
        external service — and only when you choose an API model and confirm.
      </p>
    </div>
  )
}

function BanglaPrimer() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'var(--sp-3)' }}>
      <PrimerCard title="Joined shapes (conjuncts)">
        <p className="small muted">
          Bengali carries consonants leftward into clusters. The same first consonant often joins as a reduced shape
          (ফলা lipped letters, ক-ফলা, র-ফলা). Machines must separate a cluster like{' '}
          <span lang="bn">ক্ষ</span> (ক+ষ+ণ fused) from <span lang="bn">ক্ম</span> and{' '}
          <span lang="bn">ক্য</span>.
        </p>
        <div className="glyph-row">
          <GlyphShow mono>ক</GlyphShow>
          <GlyphArrow />
          <GlyphShow mono>ক্‌ + ষ = ষ্ (ফলা)</GlyphShow>
        </div>
        <div className="glyph-row">
          <GlyphShow mono>ক্ষ</GlyphShow>
          <GlyphShow mono>ক্র</GlyphShow>
          <GlyphShow mono>ক্য</GlyphShow>
          <GlyphShow mono>গ্ধ</GlyphShow>
        </div>
      </PrimerCard>

      <PrimerCard title="Cursive-marker harkat body">
        <p className="small muted">
          The খণ্ড-ত (॒) full-shape and the dotted reph (রেফ) travel above the line. Charts that look clear to a human
          are ambiguous at one pixel: <span lang="bn">ি</span> vs <span lang="bn">ী</span> differ by a single stroke.
        </p>
        <div className="glyph-row">
          <GlyphShow mono>তে</GlyphShow>
          <GlyphShow mono>তে‌</GlyphShow>
          <GlyphShow mono>েদে</GlyphShow>
        </div>
        <p className="small muted" style={{ marginTop: 'var(--sp-2)' }}>
          Three-way: স-ফলা, র-ফলা, and সনি-ইকার all modify the vowel sign position.
        </p>
      </PrimerCard>

      <PrimerCard title="Why preprocessing helps here">
        <p className="small muted">
          Low contrast and heavy scan noise inflate split/grapheme errors. The app's auto-enhance raises size, evens
          contrast, and binarizes before recognition. You can disable or tune it on the Extraction page and compare in{' '}
          <em>Models → Experiment</em>.
        </p>
        <div className="glyph-row">
          <GlyphShow mono>বাংলা</GlyphShow>
          <span className="small muted">→</span>
          <GlyphShow mono>বষাংলা?</GlyphShow>
          <span className="subtle small">(typical confusion: ফ/ষ, ট/ঠ, ক/খ)</span>
        </div>
      </PrimerCard>
    </div>
  )
}

function PrimerCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="panel" style={{ padding: 'var(--sp-4)' }}>
      <span className="field-label">{title}</span>
      <div style={{ marginTop: 'var(--sp-2)' }}>{children}</div>
    </div>
  )
}

function GlyphShow({ mono, children }: { mono?: boolean; children: React.ReactNode }) {
  return (
    <span
      className={mono ? 'glyph-label mono' : 'glyph-label'}
      style={{ fontFamily: 'var(--font-bangla)', fontSize: 'var(--fs-xl)', lineHeight: 1.4 }}
    >
      {children}
    </span>
  )
}

function GlyphArrow() {
  return <span className="small muted">→</span>
}
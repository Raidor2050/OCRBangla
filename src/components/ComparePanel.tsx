import { useCallback, useRef, useState } from 'react'
import { PROVIDERS as ALL_PROVIDERS, getProvider } from '../ocr/registry'
import { runDocumentOcr } from '../ocr/pipeline'
import { useApp } from '../state/AppContext'
import { evaluate, diffText, renderDiffText } from '../evaluation/cerwer'

interface CompareResult {
  providerId: string
  model?: string
  text: string
  processingMs: number
  charCount: number
  cer?: number
  wer?: number
  wordAccuracy?: number
  issueCount: number
}

interface Selection {
  providerId: string
  model?: string
}

function usableProviders(): Array<{ id: string; label: string; models: { id: string; label: string }[]; type: string }> {
  return ALL_PROVIDERS.map((p) => ({
    id: p.id,
    label: p.name,
    models: p.models.map((m) => ({ id: m.id, label: m.label })),
    type: p.type,
  }))
}

export function ComparePanel() {
  const { settings, statuses, pushToast } = useApp()
  const [providers] = useState(() => usableProviders())
  const [a, setA] = useState<Selection>({ providerId: 'tesseract', model: 'ben' })
  const [b, setB] = useState<Selection>({ providerId: 'tesseract', model: 'ben' })
  const [file, setFile] = useState<File>()
  const [groundTruth, setGroundTruth] = useState('')
  const [running, setRunning] = useState(false)
  const [results, setResults] = useState<(CompareResult | null)[]>([null, null])
  const [phase, setPhase] = useState('')
  const [diff, setDiff] = useState<string>()
  const controllerRef = useRef<AbortController | null>(null)

  const configuredFor = useCallback(
    (providerId: string) => {
      const p = getProvider(providerId)
      if (!p) return false
      return p.type === 'local' || (statuses.find((s) => s.provider.id === p.id)?.configured ?? false)
    },
    [statuses],
  )

  const runOne = async (sel: Selection, i: number, signal: AbortSignal): Promise<void> => {
    const provider = getProvider(sel.providerId)
    if (!provider) return
    setResults((prev) => {
      const next = prev.slice()
      next[i] = null
      return next
    })
    setPhase(`${provider.name}${sel.model ? ' / ' + sel.model : ''}…`)
    try {
      const res = await runDocumentOcr({
        file: file!,
        provider,
        model: sel.model,
        preprocess: settings.preprocess,
        postprocess: settings.postprocess,
        signal,
      })
      const gt = groundTruth.trim()
      const r: CompareResult = {
        providerId: provider.id,
        model: sel.model,
        text: res.text,
        processingMs: res.processingMs,
        charCount: res.text.length,
        issueCount: res.issues?.length ?? 0,
      }
      if (gt) {
        const ev = evaluate(gt, r.text)
        r.cer = ev.cer
        r.wer = ev.wer
        r.wordAccuracy = ev.wordAccuracy
        setDiff(renderDiffText(diffText(gt, r.text)))
      }
      setResults((prev) => {
        const next = prev.slice()
        next[i] = r
        return next
      })
    } catch (err) {
      if (signal.aborted) {
        pushToast('Comparison cancelled.', 'info')
        return
      }
      pushToast(`Run failed (${provider.name}): ${err instanceof Error ? err.message : String(err)}`, 'error')
      setResults((prev) => {
        const next = prev.slice()
        next[i] = null
        return next
      })
    }
  }

  const runCompare = async () => {
    if (!file) {
      pushToast('Upload a sample image to compare.', 'error')
      return
    }
    if (a.providerId === b.providerId && a.model === b.model) {
      pushToast('Choose two different model configurations to compare.', 'error')
      return
    }
    for (const sel of [a, b]) {
      const p = getProvider(sel.providerId)
      if (p?.type === 'api' && !configuredFor(sel.providerId)) {
        pushToast(`${p.name} is not configured. Add a key on this page first.`, 'error')
        return
      }
    }
    const controller = new AbortController()
    controllerRef.current = controller
    setRunning(true)
    setDiff(undefined)
    setResults([null, null])
    setPhase('starting…')
    try {
      await runOne(a, 0, controller.signal)
      if (!controller.signal.aborted) await runOne(b, 1, controller.signal)
    } finally {
      setRunning(false)
      setPhase('')
    }
  }

  const externalInUse = [a.providerId, b.providerId].some((id) => getProvider(id)?.type === 'api')

  return (
    <div className="panel" style={{ padding: 'var(--sp-4)', marginTop: 'var(--sp-3)' }}>
      <div className="panel-head" style={{ padding: 0, marginBottom: 'var(--sp-3)' }}>
        <span className="panel-title">Experiment: compare models</span>
        <span className="subtle small">Run the same document through two configurations and compare honestly.</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 'var(--sp-3)' }}>
        <CompareSelect label="Configuration A" value={a} onChange={setA} providers={providers} configuredFor={configuredFor} />
        <CompareSelect label="Configuration B" value={b} onChange={setB} providers={providers} configuredFor={configuredFor} />
      </div>

      <div className="field" style={{ marginTop: 'var(--sp-3)' }}>
        <span className="field-label">Sample file</span>
        <input
          type="file"
          accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp"
          onChange={(e) => setFile(e.target.files?.[0])}
        />
        {file && (
          <span className="subtle small" style={{ marginInlineStart: 8 }}>
            {file.name} · {(file.size / 1024).toFixed(0)} KB
          </span>
        )}
      </div>

      <div className="field" style={{ marginTop: 'var(--sp-2)' }}>
        <span className="field-label">
          Ground truth <span className="muted small">(optional — enables CER/WER)</span>
        </span>
        <textarea
          rows={3}
          value={groundTruth}
          onChange={(e) => setGroundTruth(e.target.value)}
          placeholder="Paste the correct Bangla text here…"
          lang="bn"
          spellCheck={false}
        />
      </div>

      {externalInUse && (
        <div className="callout" style={{ marginTop: 'var(--sp-2)' }}>
          <strong>Privacy notice:</strong> one or both configurations are external API providers. Your sample image will be
          sent to that provider's servers. Local Tesseract runs fully in your browser.
        </div>
      )}

      <div style={{ display: 'flex', gap: 'var(--sp-2)', alignItems: 'center', marginTop: 'var(--sp-3)' }}>
        <button type="button" className="btn btn-primary" onClick={runCompare} disabled={running}>
          {running ? 'Running…' : 'Run comparison'}
        </button>
        {running && (
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => controllerRef.current?.abort()}
          >
            Cancel
          </button>
        )}
        {phase && <span className="chip chip-accent">{phase}</span>}
      </div>

      {results[0] || results[1] ? (
        <div className="compare-grid" style={{ marginTop: 'var(--sp-4)' }}>
          <ResultCard result={results[0]} label="A" />
          <ResultCard result={results[1]} label="B" />
        </div>
      ) : null}

      {diff && diff.length > 0 && (
        <div className="panel" style={{ marginTop: 'var(--sp-3)', maxHeight: 260, overflowY: 'auto' }}>
          <div className="panel-head">
            <span className="panel-title small">Edit distance (last ground-truth run)</span>
          </div>
          <pre className="diff-pre small" style={{ whiteSpace: 'pre-wrap', margin: 0, fontSize: 'var(--fs-sm)' }}>
            {diff}
          </pre>
        </div>
      )}
    </div>
  )
}

function CompareSelect({
  label,
  value,
  onChange,
  providers,
  configuredFor,
}: {
  label: string
  value: Selection
  onChange: (v: Selection) => void
  providers: ReturnType<typeof usableProviders>
  configuredFor: (id: string) => boolean
}) {
  const prov = providers.find((p) => p.id === value.providerId) ?? providers[0]
  return (
    <div className="field" style={{ gap: 4 }}>
      <span className="field-label">
        {label}{' '}
        {prov.type === 'api' && !configuredFor(prov.id) && <span className="chip chip-warn">not configured</span>}
      </span>
      <div style={{ display: 'flex', gap: 8 }}>
        <select
          className="select"
          value={value.providerId}
          onChange={(e) => onChange({ providerId: e.target.value })}
        >
          {providers.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
        <select
          className="select"
          value={value.model ?? ''}
          onChange={(e) => onChange({ providerId: value.providerId, model: e.target.value })}
        >
          {prov.models.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}

function ResultCard({ result, label }: { result: CompareResult | null; label: string }) {
  if (!result) return <div className="panel" style={{ minHeight: 120 }} />
  const getDisplayName = (id: string) => ALL_PROVIDERS.find((p) => p.id === id)?.name ?? id
  return (
    <div className="panel" style={{ minWidth: 0 }}>
      <div className="panel-head">
        <span className="panel-title">
          {label} · {getDisplayName(result.providerId)}
          {result.model ? ` / ${result.model}` : ''}
        </span>
        <span className="subtle small">{(result.processingMs / 1000).toFixed(1)}s</span>
      </div>
      <div style={{ display: 'flex', gap: 'var(--sp-3)', flexWrap: 'wrap', padding: 'var(--sp-2) 0' }}>
        <Stat label="CER" value={result.cer !== undefined ? (result.cer * 100).toFixed(1) + '%' : '—'} />
        <Stat label="WER" value={result.wer !== undefined ? (result.wer * 100).toFixed(1) + '%' : '—'} />
        <Stat label="Word acc." value={result.wordAccuracy !== undefined ? (result.wordAccuracy * 100).toFixed(1) + '%' : '—'} />
        <Stat label="Chars" value={String(result.charCount)} />
        <Stat label="Issues" value={String(result.issueCount)} />
      </div>
      <div className="editor" style={{ maxHeight: 260, overflowY: 'auto' }}>
        <textarea readOnly value={result.text} lang="bn" spellCheck={false} aria-label={`${label} output text`} />
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <span className="subtle small">{label}</span>
      <span className="mono">{value}</span>
    </div>
  )
}
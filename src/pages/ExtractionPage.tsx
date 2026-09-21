import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { getProvider, defaultModelFor } from '../ocr/registry'
import { runDocumentOcr } from '../ocr/pipeline'
import type { PipelineStage } from '../ocr/types'
import { detectFileKind, SUPPORTED_FORMATS } from '../documents/detect'
import { useApp } from '../state/AppContext'
import type { JobItem } from '../state/job'
import { friendlyJobError, isDoneStatus } from '../state/job'
import { PipelineBar } from '../components/PipelineBar'
import { QueueList } from '../components/QueueList'
import { DocPane } from '../components/DocPane'
import { TextPane } from '../components/TextPane'
import { ProcessingControls } from '../components/ProcessingControls'
import { ConfirmModal } from '../components/ConfirmModal'
import { ProviderSetup } from '../components/ProviderSetup'
import { WizardModal, type WizardStep } from '../components/WizardModal'
import { buildZip, zipEntriesForDocument, downloadZip } from '../utils/zip'
import { buildDocumentJson } from '../utils/exportjson'

let itemSeq = 0

const RECOMMENDED_PROVIDER = 'tesseract'

const PROVIDER_TILES: Array<{ id: string; title: string; sub: string }> = [
  { id: 'tesseract', title: 'On this device', sub: 'Free and private — runs in your browser' },
  { id: 'gemini', title: 'Google AI (Gemini)', sub: 'Sends images to Google · needs an API key' },
  { id: 'openai', title: 'Another AI service', sub: 'OpenAI · Groq · OpenRouter · needs an API key' },
]

export function ExtractionPage() {
  const { settings, setSettings, statuses, pushToast } = useApp()
  const [items, setItems] = useState<JobItem[]>([])
  const [activeId, setActiveId] = useState<string>()
  const [pageIndex, setPageIndex] = useState(0)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [showOverlay, setShowOverlay] = useState(true)
  const [confirm, setConfirm] = useState<{ itemIds: string[]; providerId: string; model?: string } | null>(null)
  const [wizardOpen, setWizardOpen] = useState(true)
  const [wizardStep, setWizardStep] = useState<WizardStep>(1)
  const [runnableProviderId, setRunnableProviderId] = useState<string>(() => {
    const p = settings.defaultProviderId
    return p || RECOMMENDED_PROVIDER
  })
  const inputRef = useRef<HTMLInputElement>(null)

  const provider = useMemo(() => getProvider(runnableProviderId) ?? getProvider(RECOMMENDED_PROVIDER)!, [runnableProviderId])
  const configured = useMemo(
    () => statuses.find((s) => s.provider.id === provider.id)?.configured ?? provider.type === 'local',
    [statuses, provider],
  )

  const modelOptions = useMemo(() => {
    if (provider.id === 'tesseract') return [{ id: 'ben', label: 'Bengali (tessdata_best_int)' }]
    return provider.models
  }, [provider])

  const [model, setModel] = useState<string | undefined>(() => defaultModelFor(settings.defaultProviderId))

  useEffect(() => {
    if (!modelOptions.some((m) => m.id === model)) {
      setModel(modelOptions[0]?.id)
    }
  }, [modelOptions, model])

  const active = items.find((i) => i.id === activeId)
  const runningCount = items.filter((i) => i.status === 'running').length
  const pendingCount = items.filter((i) => !isDoneStatus(i.status)).length
  const completed = items.filter((i) => i.status === 'complete')

  const upsertItem = useCallback((id: string, patch: Partial<JobItem>) => {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)))
  }, [])

  const addFiles = useCallback(
    (files: File[]) => {
      const added: string[] = []
      for (const file of files) {
        const kind = detectFileKind(file)
        if (kind === 'unsupported') {
          pushToast(`Unsupported file: ${file.name} — ${SUPPORTED_FORMATS} only.`, 'error')
          continue
        }
        const id = `job-${Date.now().toString(36)}-${itemSeq++}`
        added.push(id)
        const item: JobItem = { id, file, kind, status: 'queued', stage: null, previews: [], controller: undefined }
        setItems((prev) => [...prev, item])
      }
      if (added.length > 0 && !activeId) setActiveId(added[0])
    },
    [activeId, pushToast],
  )

  const processItem = useCallback(
    async (id: string) => {
      const item = items.find((i) => i.id === id)
      if (!item) return
      const controller = new AbortController()
      upsertItem(id, { status: 'running', stage: 'upload', error: undefined, controller, detail: undefined })

      const prep: typeof settings.preprocess = { ...settings.preprocess }
      try {
        const result = await runDocumentOcr({
          file: item.file,
          provider,
          model,
          preprocess: prep,
          postprocess: settings.postprocess,
          pdfMaxDim: 1600,
          signal: controller.signal,
          callbacks: {
            onStage: (s: PipelineStage) => upsertItem(id, { stage: s }),
            onPage: (i, status, detail) => {
              upsertItem(id, {
                pagesDone: i + 1,
                detail: status === 'requesting-remote' ? 'sending to external service…' : detail,
              })
            },
            onRenderedPage: (page, i) => {
              upsertItem(id, {
                pagesTotal: item.kind === 'pdf' ? page.index + 1 : 1,
                pagesDone: i + 1,
              })
              setItems((prev) =>
                prev.map((it) => {
                  if (it.id !== id) return it
                  const previews = it.previews.slice()
                  previews[i] = page.canvas
                  return { ...it, previews }
                }),
              )
            },
            onPreprocessedPage: (canvas, i) => {
              setItems((prev) =>
                prev.map((it) => {
                  if (it.id !== id) return it
                  const previews = it.previews.slice()
                  previews[i] = canvas
                  return { ...it, previews }
                }),
              )
            },
          },
        })
        upsertItem(id, { status: 'complete', stage: 'done', result, controller: undefined })
        setActiveId((cur) => cur ?? id)
      } catch (err) {
        if (controller.signal.aborted) {
          upsertItem(id, { status: 'cancelled', stage: null, error: undefined, controller: undefined })
        } else {
          upsertItem(id, { status: 'failed', error: friendlyJobError(err), controller: undefined })
        }
      }
    },
    [items, provider, model, settings.postprocess, upsertItem],
  )

  const runItems = useCallback(
    async (ids: string[]) => {
      if (ids.length === 0) return
      setActiveId(ids[0])
      setPageIndex(0)
      for (const id of ids) {
        const item = items.find((i) => i.id === id)
        if (!item || isDoneStatus(item.status)) continue
        await processItem(id)
      }
    },
    [items, processItem],
  )

  const requestRun = useCallback(
    (ids: string[]) => {
      const pending = ids.filter((id) => {
        const it = items.find((i) => i.id === id)
        return it && !isDoneStatus(it.status)
      })
      if (pending.length === 0) return
      if (provider.type === 'api') {
        if (!configured) {
          pushToast(`${provider.name} is not set up yet. Add your API key below and save it first.`, 'error')
          return
        }
        if (settings.confirmExternal) {
          setConfirm({ itemIds: pending, providerId: provider.id, model })
          return
        }
      }
      void runItems(pending)
    },
    [items, provider, configured, settings.confirmExternal, model, pushToast, runItems],
  )

  const runAll = useCallback(() => {
    const ids = items.map((i) => i.id)
    requestRun(ids)
  }, [items, requestRun])

  const onConfirmSend = useCallback(() => {
    if (confirm) void runItems(confirm.itemIds)
    setConfirm(null)
  }, [confirm, runItems])

  const onCancelAll = useCallback(() => {
    setItems((prev) =>
      prev.map((it) => {
        if (it.status === 'running') {
          it.controller?.abort()
          return { ...it }
        }
        if (it.status === 'queued') {
          return { ...it, status: 'cancelled', stage: null, controller: undefined }
        }
        return it
      }),
    )
  }, [])

  const openWizard = useCallback(() => {
    setWizardStep(1)
    setWizardOpen(true)
  }, [])

  const nextWizardStep = useCallback(() => setWizardStep((s) => (s < 3 ? ((s + 1) as WizardStep) : s)), [])
  const backWizardStep = useCallback(() => setWizardStep((s) => (s > 1 ? ((s - 1) as WizardStep) : s)), [])

  const closeWizard = useCallback(() => {
    setWizardOpen(false)
  }, [])

  const onRemove = useCallback(
    (id: string) => {
      const it = items.find((i) => i.id === id)
      if (it?.status === 'running') it.controller?.abort()
      setItems((prev) => prev.filter((i) => i.id !== id))
      if (activeId === id) setActiveId(undefined)
    },
    [items, activeId],
  )

  const onRetry = useCallback(
    async (id: string) => {
      const it = items.find((i) => i.id === id)
      if (!it) return
      upsertItem(id, { status: 'queued', stage: null, error: undefined, previews: [], result: undefined })
      await processItem(id)
    },
    [items, upsertItem, processItem],
  )

  const onClear = useCallback(() => {
    setItems((prev) => prev.filter((i) => !isDoneStatus(i.status)))
  }, [])

  const onRemoveAll = useCallback(() => {
    setItems((prev) => {
      prev.forEach((it) => {
        if (it.status === 'running') it.controller?.abort()
      })
      return []
    })
    setActiveId(undefined)
  }, [])

  const downloadAllZip = useCallback(() => {
    const done = items.filter((i) => i.status === 'complete' && i.result)
    if (done.length === 0) {
      pushToast('No completed documents to export yet. Read your images first.', 'error')
      return
    }
    const entries = done.flatMap((it) =>
      zipEntriesForDocument(it.result!.fileName, it.result!.text, buildDocumentJson(it.result!)),
    )
    const bytes = buildZip(entries)
    downloadZip(bytes, `ordinary-chobi-reader-${new Date().toISOString().slice(0, 10)}.zip`)
    pushToast(`Saved ${done.length} document${done.length === 1 ? '' : 's'} as a ZIP file.`, 'success')
  }, [items, pushToast])

  const activePageCanvas = active?.previews[pageIndex] ?? active?.previews[0] ?? null
  const activeLines = active?.result?.pages[pageIndex]?.lines

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      if (e.dataTransfer.files?.length) addFiles(Array.from(e.dataTransfer.files))
    },
    [addFiles],
  )

  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const files = Array.from(e.clipboardData?.files ?? []).filter((f) => f.type.startsWith('image/'))
      if (files.length) {
        e.preventDefault()
        addFiles(files)
      }
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [addFiles])

  const pickProvider = useCallback(
    (id: string) => {
      if (id === runnableProviderId) return
      setRunnableProviderId(id)
      setModel(defaultModelFor(id))
    },
    [runnableProviderId],
  )

  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      {/* Batch OCR deck */}
      <div style={{ borderBottom: '1px solid var(--line)', padding: 'var(--sp-4)', display: 'grid', gap: 'var(--sp-4)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--sp-2)' }}>
          <span className="deck-title">Batch OCR</span>
          <button type="button" className="btn btn-sm btn-ghost" onClick={openWizard}>
            Open guided flow
          </button>
        </div>

        {/* Step 1 — import */}
        <div className="step-line" style={{ alignItems: 'flex-start' }}>
          <span className="step-num">1</span>
          <div style={{ flex: 1, display: 'grid', gap: 'var(--sp-2)' }}>
            <span className="step-label">Import your images or PDFs</span>
            <div style={{ display: 'flex', gap: 'var(--sp-2)', flexWrap: 'wrap', alignItems: 'center' }}>
              <input
                ref={inputRef}
                type="file"
                accept=".png,.jpg,.jpeg,.webp,.pdf,image/png,image/jpeg,image/webp,application/pdf"
                multiple
                style={{ display: 'none' }}
                onChange={(e) => {
                  if (e.target.files) addFiles(Array.from(e.target.files))
                  e.target.value = ''
                }}
              />
              <button type="button" className="btn btn-accent" onClick={() => inputRef.current?.click()}>
                + Add images or PDFs
              </button>
              <span className="subtle small">
                You can pick several at once — or drag them onto this page, or paste from clipboard.
              </span>
              {items.length > 0 && (
                <span className="chip chip-accent">{items.length} in queue</span>
              )}
            </div>
          </div>
        </div>

        {/* Step 2 — choose reader */}
        <div className="step-line" style={{ alignItems: 'flex-start' }}>
          <span className="step-num">2</span>
          <div style={{ flex: 1, display: 'grid', gap: 'var(--sp-2)' }}>
            <span className="step-label">Choose how your documents are read</span>
            <div className="setup-tiles" role="radiogroup" aria-label="OCR provider">
              {PROVIDER_TILES.map((t) => {
                const selected = provider.id === t.id
                return (
                  <div
                    key={t.id}
                    role="radio"
                    aria-checked={selected}
                    tabIndex={0}
                    className={'setup-tile' + (selected ? ' active' : '')}
                    onClick={() => pickProvider(t.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') pickProvider(t.id)
                    }}
                  >
                    <span className="setup-tile-title">
                      {t.title}
                      {t.id === RECOMMENDED_PROVIDER && <span className="chip chip-ok" style={{ marginLeft: 6 }}>Recommended</span>}
                    </span>
                    <span className="small muted">{t.sub}</span>
                  </div>
                )
              })}
            </div>

            {provider.type === 'local' && (
              <div className="row" style={{ gap: 'var(--sp-2)', flexWrap: 'wrap' }}>
                <span className="chip chip-ok">Private · works offline · no key needed</span>
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 'var(--fs-sm)' }}>
                  Language
                  <select
                    className="select"
                    value={model ?? 'ben'}
                    onChange={(e) => setModel(e.target.value)}
                    aria-label="Tesseract language"
                  >
                    {modelOptions.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            )}

            {provider.type === 'api' && configured && (
              <div className="row" style={{ gap: 'var(--sp-2)', flexWrap: 'wrap' }}>
                <span className="chip chip-accent">Key saved on this device</span>
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 'var(--fs-sm)' }}>
                  Model
                  <select className="select" value={model ?? ''} onChange={(e) => setModel(e.target.value)} aria-label="API model">
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

            {provider.type === 'api' && !configured && (
              <ProviderSetup provider={provider} model={model} onModelChange={setModel} onSaved={() => {}} />
            )}
          </div>
        </div>

        {/* Step 3 — run & save */}
        <div className="step-line" style={{ alignItems: 'flex-start' }}>
          <span className="step-num">3</span>
          <div style={{ flex: 1, display: 'grid', gap: 'var(--sp-2)' }}>
            <span className="step-label">Read them all, then save</span>
            <div style={{ display: 'flex', gap: 'var(--sp-2)', flexWrap: 'wrap', alignItems: 'center' }}>
              {runningCount > 0 ? (
                <button type="button" className="btn btn-ghost" onClick={onCancelAll}>
                  Stop
                </button>
              ) : (
                <button type="button" className="btn btn-primary" onClick={runAll} disabled={items.length === 0}>
                  Read my {items.length === 1 ? 'image' : `${items.length} images`}
                </button>
              )}
              <button type="button" className="btn btn-secondary" onClick={downloadAllZip} disabled={completed.length === 0} title="Save every completed document as a ZIP">
                Save everything (ZIP)
                {completed.length > 0 && <span className="chip chip-ok" style={{ marginLeft: 8 }}>{completed.length}</span>}
              </button>
              {pendingCount > 0 && completed.length > 0 && (
                <span className="subtle small">
                  {completed.length} of {items.length} ready to save — reading the rest…
                </span>
              )}
            </div>
            <div style={{ display: 'flex', gap: 'var(--sp-2)', flexWrap: 'wrap', alignItems: 'center' }}>
              <button type="button" className="btn btn-sm btn-ghost" onClick={() => setShowAdvanced((v) => !v)} aria-expanded={showAdvanced}>
                Advanced options {showAdvanced ? '▾' : '▸'}
              </button>
              <PipelineBar stages={active?.stage ? [active.stage] : []} />
            </div>
          </div>
        </div>

        {showAdvanced && (
          <div className="panel" style={{ padding: 'var(--sp-4)', marginTop: 'var(--sp-1)' }}>
            <ProcessingControls
              preprocess={settings.preprocess}
              onChange={(patch) => setSettings({ preprocess: { ...settings.preprocess, ...patch } })}
              postprocess={settings.postprocess}
              onPostprocess={(v) => setSettings({ postprocess: v })}
            />
          </div>
        )}
      </div>

      {/* Queue */}
      <div style={{ padding: 'var(--sp-4) var(--sp-4) 0' }}>
        <QueueList
          items={items}
          activeId={activeId}
          onSelect={(id) => {
            setActiveId(id)
            setPageIndex(0)
          }}
          onRemove={onRemove}
          onRetry={onRetry}
          onCancel={(id) => items.find((i) => i.id === id)?.controller?.abort()}
          onClear={onClear}
          onRemoveAll={onRemoveAll}
          onDownloadTxt={() => {}}
          onDownloadJson={() => {}}
        />
        {items.length > 0 && active?.result && (() => {
          const r = active.result
          return (
            <div style={{ display: 'flex', gap: 'var(--sp-2)', marginTop: 'var(--sp-2)', alignItems: 'center', flexWrap: 'wrap' }}>
              {r.pages.length > 1 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <button
                    type="button"
                    className="btn btn-sm btn-ghost"
                    disabled={pageIndex <= 0}
                    onClick={() => setPageIndex((p) => Math.max(0, p - 1))}
                  >
                    ←
                  </button>
                  <span className="mono-number">
                    Page {pageIndex + 1} / {r.pages.length}
                  </span>
                  <button
                    type="button"
                    className="btn btn-sm btn-ghost"
                    disabled={pageIndex >= r.pages.length - 1}
                    onClick={() => setPageIndex((p) => Math.min(r.pages.length - 1, p + 1))}
                  >
                    →
                  </button>
                </div>
              )}
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 'var(--fs-sm)', cursor: 'pointer' }}>
                <input type="checkbox" checked={showOverlay} onChange={(e) => setShowOverlay(e.target.checked)} />
                Show detected line regions
              </label>
              <span className="subtle small">Regions come from the OCR engine itself — never synthesized.</span>
              {active?.status === 'running' && active.detail && (
                <span className="chip chip-accent">{active.detail}</span>
              )}
            </div>
          )
        })()}
      </div>

      {/* Workspace */}
      <div
        className="workspace"
        onDragOver={(e) => {
          e.preventDefault()
        }}
        onDrop={onDrop}
        role="region"
        aria-label="Document and text workspace"
      >
        <div className="pane pane-doc">
          <DocPane
            canvas={activePageCanvas}
            lines={showOverlay ? activeLines : undefined}
            busy={active?.status === 'running'}
            stage={active?.stage}
            fileName={active?.file.name ?? ''}
            pageLabel={active?.kind === 'pdf' && active.result ? `page ${pageIndex + 1}` : undefined}
            detail={active?.detail}
            showOverlay={showOverlay}
          />
        </div>
        <div className="pane-divider" aria-hidden="true" />
        <div className="pane pane-text">
          <TextPane result={active?.result} />
        </div>
      </div>

      {wizardOpen && (
        <WizardModal
          step={wizardStep}
          items={items}
          activeId={activeId}
          onSelect={(id) => {
            setActiveId(id)
            setPageIndex(0)
          }}
          provider={provider}
          configured={configured}
          model={model}
          modelOptions={modelOptions}
          onModelChange={setModel}
          onAddFiles={addFiles}
          onPickProvider={(id) => {
            setRunnableProviderId(id)
            setModel(defaultModelFor(id))
          }}
          onRun={() => requestRun(items.map((i) => i.id))}
          onCancelRun={onCancelAll}
          onSaveZip={downloadAllZip}
          onBack={backWizardStep}
          onNext={nextWizardStep}
          onClose={closeWizard}
        />
      )}

      {confirm && (
        <ConfirmModal
          title="Send document to an external service?"
          body={
            <>
              <p className="small">
                You are about to send your document image to{' '}
                <strong>
                  {getProvider(confirm.providerId)?.name ?? confirm.providerId}
                </strong>
                {confirm.model ? ` (${confirm.model})` : ''} so that the service can transcribe it.
              </p>
              <p className="small muted" style={{ marginTop: 'var(--sp-2)' }}>
                Local OCR never sends your files anywhere. This external model will process{' '}
                <strong>{confirm.itemIds.length}</strong> document
                {confirm.itemIds.length === 1 ? '' : 's'} on the provider's servers.
              </p>
            </>
          }
          confirmLabel="Send"
          onConfirm={onConfirmSend}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  )
}
import { useCallback, useEffect, useState } from 'react'
import { getProvider } from '../ocr/registry'
import { useApp } from '../state/AppContext'
import { testProviderConnection } from '../ocr/providers/test'
import { clearTesseractCache } from '../ocr/providers/tesseract'
import { GEMINI_MODELS, getGeminiConfig, saveGeminiModel, clearGeminiConfig } from '../ocr/providers/gemini'
import {
  OPENAI_PRESETS,
  getOpenAiConfig,
  saveOpenAiConfig,
  clearOpenAiConfig,
} from '../ocr/providers/openai'
import { ComparePanel } from '../components/ComparePanel'

interface TestOutcome {
  providerId: string
  ok: boolean
  message: string
}

export function ModelsPage() {
  const { credentialMap, saveKey, forgetKey, forgetAllKeys, pushToast, statuses, refreshStatuses } = useApp()

  const [geminiModel, setGeminiModel] = useState<string>(GEMINI_MODELS[0])
  const [openaiPreset, setOpenaiPreset] = useState<string>(OPENAI_PRESETS[0].id)
  const [openaiCustomUrl, setOpenaiCustomUrl] = useState('')
  const [openaiModel, setOpenaiModel] = useState(OPENAI_PRESETS[0].models[0])
  const [geminiKey, setGeminiKey] = useState('')
  const [openaiKey, setOpenaiKey] = useState('')
  const [busy, setBusy] = useState<string>()
  const [testing, setTesting] = useState<string>()
  const [testOutcome, setTestOutcome] = useState<TestOutcome>()
  const [cleared, setCleared] = useState(false)

  const geminiConfigured = (credentialMap['gemini'] ?? '').length > 0
  const openaiConfigured = (credentialMap['openai'] ?? '').length > 0

  useEffect(() => {
    void (async () => {
      const gc = await getGeminiConfig()
      if (gc) setGeminiModel(gc.model)
      const oc = await getOpenAiConfig()
      if (oc) {
        const preset = OPENAI_PRESETS.find((p) => p.baseUrl === oc.baseUrl)
        if (preset) {
          setOpenaiPreset(preset.id)
          if (preset.models.includes(oc.model)) setOpenaiModel(oc.model)
        } else {
          setOpenaiPreset('custom')
          setOpenaiCustomUrl(oc.baseUrl)
          setOpenaiModel(oc.model)
        }
      }
    })()
  }, [])

  const onSaveKey = useCallback(
    async (providerId: string, body: { key: string } & Record<string, string>) => {
      setBusy(providerId)
      try {
        if (providerId === 'gemini') {
          await saveKey('gemini', body.key)
          saveGeminiModel(geminiModel)
        } else {
          const baseUrl =
            openaiPreset === 'custom' ? openaiCustomUrl.trim() : OPENAI_PRESETS.find((p) => p.id === openaiPreset)!.baseUrl
          saveOpenAiConfig({ baseUrl, model: openaiModel.trim() })
          await saveKey('openai', body.key)
        }
        pushToast(`${getProvider(providerId)?.name ?? providerId} key saved to this browser only (IndexedDB).`, 'success')
        setGeminiKey('')
        setOpenaiKey('')
      } catch (err) {
        pushToast(`Could not save key: ${err instanceof Error ? err.message : String(err)}`, 'error')
      } finally {
        setBusy(undefined)
      }
    },
    [saveKey, pushToast, geminiModel, openaiPreset, openaiCustomUrl, openaiModel],
  )

  const onSaveGemini = useCallback(() => {
    if (!geminiKey.trim()) {
      saveGeminiModel(geminiModel)
      pushToast('Gemini model preference saved.', 'success')
      return
    }
    void onSaveKey('gemini', { key: geminiKey })
  }, [geminiKey, geminiModel, onSaveKey, pushToast])

  const onSaveOpenAi = useCallback(() => {
    if (!openaiKey.trim()) {
      const baseUrl =
        openaiPreset === 'custom' ? openaiCustomUrl.trim() : OPENAI_PRESETS.find((p) => p.id === openaiPreset)!.baseUrl
      saveOpenAiConfig({ baseUrl, model: openaiModel.trim() })
      pushToast('Endpoint + model saved.', 'success')
      return
    }
    void onSaveKey('openai', { key: openaiKey })
  }, [openaiKey, openaiPreset, openaiCustomUrl, openaiModel, onSaveKey, pushToast])

  const onTest = useCallback(
    async (providerId: string) => {
      setTesting(providerId)
      setTestOutcome(undefined)
      try {
        const res = await testProviderConnection(providerId)
        setTestOutcome(res)
      } catch (err) {
        setTestOutcome({
          providerId,
          ok: false,
          message: err instanceof Error ? err.message : 'Connection test failed.',
        })
      } finally {
        setTesting(undefined)
      }
    },
    [],
  )

  const onForget = useCallback(
    async (providerId: string) => {
      await forgetKey(providerId)
      if (providerId === 'gemini') clearGeminiConfig()
      else clearOpenAiConfig()
      pushToast(`${getProvider(providerId)?.name ?? providerId} key removed.`, 'info')
    },
    [forgetKey, pushToast],
  )

  const localStatus = statuses.find((s) => s.provider.id === 'tesseract')

  return (
    <div className="page">
      <h1>Models</h1>
      <p className="lead">Choose how your documents are recognized. Local OCR keeps files on your device.</p>

      {/* Local model */}
      <div className="panel">
        <div className="panel-head">
          <span className="panel-title">Tesseract · in-browser Bengali</span>
          <span className="chip chip-ok">local · private</span>
        </div>
        <p className="small muted" style={{ maxWidth: 720 }}>
          Tesseract.js compiles the open-source Tesseract engine to WebAssembly. The Bengali model (~1.31 MB) ships with
          the app and runs on this device — no network, no uploads, no API key. Quality is modest on hard documents, so
          preprocessing helps; this app applies it automatically by default.
        </p>
        {localStatus?.provider.description && (
          <p className="small muted" style={{ marginTop: 0 }}>
            {localStatus.provider.description}
          </p>
        )}
        <div style={{ display: 'flex', gap: 'var(--sp-2)', alignItems: 'center', flexWrap: 'wrap' }}>
          <InputShell label="Model">
            <code>ben — Bengali (tessdata)</code>
          </InputShell>
          <button
            type="button"
            className="btn btn-ghost"
            disabled={busy === 'tesseract'}
            onClick={async () => {
              setBusy('tesseract')
              setCleared(false)
              try {
                const removed = await clearTesseractCache()
                setCleared(true)
                await refreshStatuses()
                pushToast(`Cleared cached model data (${removed.length} store${removed.length === 1 ? '' : 's'}). Next OCR re-downloads the model.`, 'success')
              } catch (err) {
                pushToast(`Could not clear cache: ${err instanceof Error ? err.message : String(err)}`, 'error')
              } finally {
                setBusy(undefined)
              }
            }}
          >
            {busy === 'tesseract' ? 'Clearing…' : 'Clear cached model data'}
          </button>
        </div>
        {cleared && (
          <p className="small muted" style={{ marginTop: 'var(--sp-2)' }}>
            Cached model removed. The next local OCR run will fetch the bundled model again from this site.
          </p>
        )}
      </div>

      {/* External models */}
      <h2 style={{ marginTop: 'var(--sp-5)' }}>External models</h2>
      <div className="callout">
        <strong>Bring-your-own-key.</strong> Keys are stored only in this browser (IndexedDB), never on any server, and
        never included in exports or logs. Your document images are sent to the external provider{' '}
        <em>only when you run them</em>, at the endpoint you choose. Costs are billed to your own provider account.
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: 'var(--sp-3)', marginTop: 'var(--sp-3)' }}>
        {/* Gemini */}
        <div className="panel">
          <div className="panel-head">
            <span className="panel-title">Google Gemini</span>
            {geminiConfigured ? <span className="chip chip-accent">configured</span> : <span className="chip chip-warn">no key</span>}
          </div>
          <p className="small muted">Vision models with strong document transcription. CORS-friendly from browsers.</p>

          <div className="field">
            <span className="field-label">Model</span>
            <select className="select" value={geminiModel} onChange={(e) => setGeminiModel(e.target.value)}>
              {GEMINI_MODELS.map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
          </div>

          <KeyInput
            label="API key (AI Studio)"
            value={geminiKey}
            onChange={setGeminiKey}
            configured={geminiConfigured}
            redacted={credentialMap['gemini']}
          />

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 'var(--sp-3)' }}>
            <button type="button" className="btn btn-primary" disabled={busy === 'gemini'} onClick={onSaveGemini}>
              {busy === 'gemini' ? 'Saving…' : geminiKey.trim() ? 'Save key' : 'Save model'}
            </button>
            <button type="button" className="btn btn-ghost" disabled={testing === 'gemini'} onClick={() => onTest('gemini')}>
              {testing === 'gemini' ? 'Testing…' : 'Test connection'}
            </button>
            <button type="button" className="btn btn-ghost danger-text" disabled={!geminiConfigured} onClick={() => onForget('gemini')}>
              Forget key
            </button>
          </div>
        </div>

        {/* OpenAI-compatible */}
        <div className="panel">
          <div className="panel-head">
            <span className="panel-title">OpenAI-compatible API</span>
            {openaiConfigured ? <span className="chip chip-accent">configured</span> : <span className="chip chip-warn">no key</span>}
          </div>
          <p className="small muted">
            One provider for OpenAI, Groq, OpenRouter, and custom endpoints. Some endpoints (e.g. Groq, OpenRouter) are
            browser-friendly; others may block browser requests.
          </p>

          <div className="field">
            <span className="field-label">Endpoint</span>
            <select
              className="select"
              value={openaiPreset}
              onChange={(e) => {
                const preset = OPENAI_PRESETS.find((p) => p.id === e.target.value)!
                setOpenaiPreset(preset.id)
                setOpenaiCustomUrl('')
                if (preset.models[0]) setOpenaiModel(preset.models[0])
              }}
            >
              {OPENAI_PRESETS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          {openaiPreset === 'custom' && (
            <div className="field">
              <span className="field-label">Base URL (must end in /v1)</span>
              <input type="text" className="text-input" value={openaiCustomUrl} onChange={(e) => setOpenaiCustomUrl(e.target.value)} placeholder="https://your-host.example/v1" />
            </div>
          )}

          <div className="field">
            <span className="field-label">Model</span>
            <input
              type="text"
              className="text-input"
              value={openaiModel}
              onChange={(e) => setOpenaiModel(e.target.value)}
              placeholder="gpt-4o-mini"
            />
            {openaiPreset !== 'custom' && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
                {(OPENAI_PRESETS.find((p) => p.id === openaiPreset)?.models ?? []).map((m) => (
                  <button key={m} type="button" className="chip chip-static" style={{ border: 0, cursor: 'pointer' }} onClick={() => setOpenaiModel(m)}>
                    {m}
                  </button>
                ))}
              </div>
            )}
          </div>

          <KeyInput
            label="API key"
            value={openaiKey}
            onChange={setOpenaiKey}
            configured={openaiConfigured}
            redacted={credentialMap['openai']}
          />

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 'var(--sp-3)' }}>
            <button type="button" className="btn btn-primary" disabled={busy === 'openai'} onClick={onSaveOpenAi}>
              {busy === 'openai' ? 'Saving…' : openaiKey.trim() ? 'Save key' : 'Save endpoint'}
            </button>
            <button type="button" className="btn btn-ghost" disabled={testing === 'openai'} onClick={() => onTest('openai')}>
              {testing === 'openai' ? 'Testing…' : 'Test connection'}
            </button>
            <button type="button" className="btn btn-ghost danger-text" disabled={!openaiConfigured} onClick={() => onForget('openai')}>
              Forget key
            </button>
          </div>
        </div>
      </div>

      {testOutcome && (
        <div className={'callout ' + (testOutcome.ok ? 'callout-ok' : 'callout-warn')} style={{ marginTop: 'var(--sp-3)' }}>
          <strong>{testOutcome.ok ? 'Connected:' : 'No connection:'}</strong> {testOutcome.message}
        </div>
      )}

      {Object.keys(credentialMap).length > 0 && (
        <div style={{ marginTop: 'var(--sp-3)', display: 'flex', gap: 'var(--sp-2)', alignItems: 'center', flexWrap: 'wrap' }}>
          <span className="subtle small">Keys stored in this browser:</span>
          {Object.entries(credentialMap).map(([id, masked]) => (
            <span key={id} className="chip chip-static">
              {id} · {masked}
            </span>
          ))}
          <button type="button" className="btn btn-ghost danger-text" onClick={() => void forgetAllKeys().then(() => pushToast('All keys removed.', 'info'))}>
            Forget all keys
          </button>
        </div>
      )}

      <ComparePanel />
    </div>
  )
}

function KeyInput({
  label,
  value,
  onChange,
  configured,
  redacted,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  configured: boolean
  redacted?: string
}) {
  return (
    <div className="field">
      <span className="field-label">
        {label}
        {configured && <span className="subtle small" style={{ marginLeft: 8 }}>stored key: <code>{redacted ?? '••••'}</code></span>}
      </span>
      <input
        type="password"
        className="text-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={configured ? 'Enter a new key to replace…' : 'Paste your key…'}
        aria-label={label}
      />
    </div>
  )
}

function InputShell({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="field" style={{ gap: 4, minWidth: 220 }}>
      <span className="field-label">{label}</span>
      <div>{children}</div>
    </div>
  )
}
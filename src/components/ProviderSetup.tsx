import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { OCRProvider } from '../ocr/types'
import { GEMINI_MODELS, saveGeminiModel } from '../ocr/providers/gemini'
import { OPENAI_PRESETS, saveOpenAiConfig } from '../ocr/providers/openai'
import { useApp } from '../state/AppContext'

export interface ProviderSetupProps {
  provider: OCRProvider
  model?: string
  onModelChange: (model: string) => void
  onSaved: () => void
}

export function ProviderSetup({ provider, model, onModelChange, onSaved }: ProviderSetupProps) {
  const { saveKey, pushToast } = useApp()
  const [key, setKey] = useState('')
  const [saving, setSaving] = useState(false)
  const [presetId, setPresetId] = useState(OPENAI_PRESETS[0].id)
  const [customUrl, setCustomUrl] = useState('')

  const isGemini = provider.id === 'gemini'
  const preset = OPENAI_PRESETS.find((p) => p.id === presetId) ?? OPENAI_PRESETS[0]

  const handleSave = async () => {
    const trimmed = key.trim()
    if (!trimmed) {
      pushToast('Please paste your API key first.', 'error')
      return
    }
    setSaving(true)
    try {
      if (isGemini) {
        const chosen = model && GEMINI_MODELS.includes(model) ? model : GEMINI_MODELS[0]
        saveGeminiModel(chosen)
        await saveKey('gemini', trimmed)
        onModelChange(chosen)
      } else {
        const baseUrl = presetId === 'custom' ? customUrl.trim() : preset.baseUrl
        if (presetId === 'custom' && !customUrl.trim()) {
          pushToast('Enter the endpoint URL (ends in /v1).', 'error')
          setSaving(false)
          return
        }
        const chosen = (model?.trim() || preset.models[0] || 'gpt-4o-mini').trim()
        saveOpenAiConfig({ baseUrl, model: chosen })
        await saveKey('openai', trimmed)
        onModelChange(chosen)
      }
      setKey('')
      pushToast('Key saved on this device. You can now read documents with the selected AI model.', 'success')
      onSaved()
    } catch (err) {
      pushToast(`Could not save the key: ${err instanceof Error ? err.message : String(err)}`, 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="panel setup-box" style={{ padding: 'var(--sp-4)', maxWidth: 560 }}>
      <span className="field-label">
        Use <strong>{provider.name}</strong>
      </span>
      <p className="small muted" style={{ margin: 'var(--sp-1) 0 var(--sp-3)' }}>
        AI models are external services. To use one you need{' '}
        <Link to="/models" className="link">
          your own API key
        </Link>{' '}
        — it stays in this browser only.
      </p>

      <div className="field">
        <span className="field-label">Your API key</span>
        <input
          type="password"
          className="text-input"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder="Paste your key here"
          autoComplete="off"
          spellCheck={false}
        />
      </div>

      {isGemini ? (
        <div className="field">
          <span className="field-label">Gemini model</span>
          <select
            className="select"
            value={model && GEMINI_MODELS.includes(model) ? model : GEMINI_MODELS[0]}
            onChange={(e) => onModelChange(e.target.value)}
          >
            {GEMINI_MODELS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <>
          <div className="field">
            <span className="field-label">Which service?</span>
            <select className="select" value={presetId} onChange={(e) => setPresetId(e.target.value)}>
              {OPENAI_PRESETS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
          {presetId === 'custom' && (
            <div className="field">
              <span className="field-label">Endpoint URL (ends in /v1)</span>
              <input
                type="text"
                className="text-input"
                value={customUrl}
                onChange={(e) => setCustomUrl(e.target.value)}
                placeholder="https://your-service.example/v1"
                spellCheck={false}
              />
            </div>
          )}
          <div className="field">
            <span className="field-label">Model</span>
            <input
              type="text"
              className="text-input"
              value={model ?? ''}
              onChange={(e) => onModelChange(e.target.value)}
              placeholder={preset.models[0] ?? 'gpt-4o-mini'}
              aria-label="Model name"
              spellCheck={false}
            />
            {preset.models.length > 0 && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                {preset.models.map((m) => (
                  <button key={m} type="button" className="chip chip-btn" onClick={() => onModelChange(m)}>
                    {m}
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      <div className="row" style={{ marginTop: 'var(--sp-3)', justifyContent: 'space-between' }}>
        <button type="button" className="btn btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : 'Save key & use this model'}
        </button>
        <Link to="/models" className="link small">
          Advanced settings
        </Link>
      </div>
    </div>
  )
}
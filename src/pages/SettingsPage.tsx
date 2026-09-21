import { useApp } from '../state/AppContext'
import { getProvider } from '../ocr/registry'
import type { Theme } from '../storage/settings'

export function SettingsPage() {
  const { settings, setSettings, credentialMap, forgetAllKeys, pushToast } = useApp()

  const setProvider = (id: string) => {
    setSettings({ defaultProviderId: id, defaultModel: undefined })
  }

  return (
    <div className="page">
      <h1>Settings</h1>
      <p className="lead">Appearance, defaults, and processing behavior. Everything is stored locally in your browser.</p>

      <div className="panel">
        <div className="panel-head">
          <span className="panel-title">Appearance</span>
        </div>
        <div className="field">
          <span className="field-label">Theme</span>
          <select
            className="select"
            value={settings.theme}
            onChange={(e) => setSettings({ theme: e.target.value as Theme })}
          >
            <option value="system">Follow system</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head">
          <span className="panel-title">Default OCR model</span>
        </div>
        <div className="field">
          <span className="field-label">Provider used for the Extraction page</span>
          <select
            className="select"
            value={settings.defaultProviderId}
            onChange={(e) => setProvider(e.target.value)}
          >
            {['tesseract', 'gemini', 'openai'].map((id) => {
              const p = getProvider(id)
              const configured = (credentialMap[id] ?? '').length > 0
              return (
                <option key={id} value={id}>
                  {p?.name ?? id}
                  {configured ? ' · configured' : id !== 'tesseract' ? ' · not configured' : ''}
                </option>
              )
            })}
          </select>
        </div>
        <div className="field">
          <span className="field-label">Target DPI (upscaling hint)</span>
          <input
            type="number"
            className="text-input"
            style={{ width: 180 }}
            min={150}
            max={600}
            step={50}
            value={settings.targetDpi}
            onChange={(e) => setSettings({ targetDpi: Number(e.target.value) || 300 })}
          />
          <span className="subtle small">Higher values upscale small scans before OCR (run in your browser).</span>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head">
          <span className="panel-title">Processing defaults</span>
        </div>
        <Toggle
          label="Auto-enhance before OCR"
          hint="Analyze each page and apply contrast, size, and threshold improvements automatically."
          checked={settings.preprocess.auto ?? true}
          onChange={(v) => setSettings({ preprocess: { ...settings.preprocess, auto: v } })}
        />
        <Toggle
          label="Apply Bangla post-processing"
          hint="Normalize Unicode variants and flag suspicious character sequences (orthotactic issues). Never rewrites words using a dictionary."
          checked={settings.postprocess}
          onChange={(v) => setSettings({ postprocess: v })}
        />
        <Toggle
          label="Confirm before external API calls"
          hint="Show a confirmation dialog before a job sends your document to an external provider."
          checked={settings.confirmExternal}
          onChange={(v) => setSettings({ confirmExternal: v })}
        />
      </div>

      <div className="panel">
        <div className="panel-head">
          <span className="panel-title">Stored API keys</span>
        </div>
        {Object.keys(credentialMap).length === 0 ? (
          <p className="small muted">No API keys are stored. Add keys on the Models page when you want external providers.</p>
        ) : (
          <>
            <ul style={{ margin: 0, paddingLeft: 'var(--sp-5)', display: 'flex', flexDirection: 'column', gap: 6, fontSize: 'var(--fs-sm)' }}>
              {Object.entries(credentialMap).map(([id, masked]) => (
                <li key={id}>
                  <span className="chip chip-static" style={{ marginRight: 8 }}>
                    {getProvider(id)?.name ?? id}
                  </span>
                  <code>{masked}</code>
                </li>
              ))}
            </ul>
            <button
              type="button"
              className="btn btn-ghost danger-text"
              style={{ marginTop: 'var(--sp-3)' }}
              onClick={() => void forgetAllKeys().then(() => pushToast('All API keys removed from this browser.', 'success'))}
            >
              Forget all keys
            </button>
          </>
        )}
      </div>
    </div>
  )
}

function Toggle({ label, hint, checked, onChange }: { label: string; hint: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label style={{ display: 'flex', gap: 'var(--sp-3)', alignItems: 'flex-start', padding: 'var(--sp-2) 0', cursor: 'pointer' }}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} style={{ marginTop: 3 }} />
      <span>
        <span className="field-label" style={{ display: 'block' }}>
          {label}
        </span>
        <span className="subtle small">{hint}</span>
      </span>
    </label>
  )
}
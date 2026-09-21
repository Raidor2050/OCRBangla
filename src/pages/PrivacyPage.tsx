import { Link } from 'react-router-dom'
import { useApp } from '../state/AppContext'

export function PrivacyPage() {
  const { credentialMap, forgetKey, forgetAllKeys, pushToast } = useApp()
  const keyCount = Object.keys(credentialMap).length

  return (
    <div className="page">
      <h1>Privacy</h1>
      <p className="lead">Ordinary Chobi Reader is designed so your documents and keys stay under your control.</p>

      <div className="panel">
        <div className="panel-head">
          <span className="panel-title">Where your files go</span>
        </div>
        <ul className="privacy-list">
          <li>
            <strong>Local OCR (Tesseract):</strong> documents are processed entirely in your browser. Nothing is uploaded
            and no network request is made for document content.
          </li>
          <li>
            <strong>External models (Gemini, OpenAI-compatible):</strong> document images are sent to the provider you
            configured <em>only when you run a job with that model</em>. You are always asked to confirm the first time,
            and each provider requires your own key.
          </li>
          <li>
            <strong>No account, no server, no telemetry.</strong> This is a static site. There is no backend. We do not
            collect analytics.
          </li>
        </ul>
      </div>

      <div className="panel">
        <div className="panel-head">
          <span className="panel-title">API keys</span>
        </div>
        <ul className="privacy-list">
          <li>
            Keys are stored in <strong>IndexedDB in this browser only</strong> (the same storage your site uses for other
            cached data).
          </li>
          <li>
            Keys are never written to exports, ZIP files, uploaded anywhere, or logged. Text and JSON exports contain
            document text and engine metadata — never keys.
          </li>
          <li>Clearing the key is one click (below), and opening this app in another browser or device needs its own key.</li>
        </ul>
        {keyCount > 0 ? (
          <div style={{ display: 'flex', gap: 'var(--sp-2)', alignItems: 'center', flexWrap: 'wrap', marginTop: 'var(--sp-2)' }}>
            {Object.keys(credentialMap).map((id) => (
              <button
                key={id}
                type="button"
                className="btn btn-ghost"
                onClick={() => void forgetKey(id).then(() => pushToast('Key removed.', 'success'))}
              >
                Forget {id} key
              </button>
            ))}
            <button
              type="button"
              className="btn btn-ghost danger-text"
              onClick={() => void forgetAllKeys().then(() => pushToast('All keys removed.', 'success'))}
            >
              Forget all keys
            </button>
          </div>
        ) : (
          <p className="small muted" style={{ marginTop: 'var(--sp-2)' }}>
            No API keys are currently stored in this browser.
          </p>
        )}
      </div>

      <div className="panel">
        <div className="panel-head">
          <span className="panel-title">Stored documents and settings</span>
        </div>
        <ul className="privacy-list">
          <li>
            <strong>Nothing is permanently stored.</strong> Queue files and results live in page memory and are gone when
            you close the tab. Nothing is written to disk unless you choose to download it.
          </li>
          <li>
            <strong>Settings</strong> (theme, defaults, preprocessing) are stored in <code>localStorage</code> on your
            device so your preferences survive reloads.
          </li>
          <li>
            The only network traffic for <em>local</em> OCR is fetching the app itself (and the bundled Bengraali model,
            which is hosted with the app). When offline, the installed copy still performs local OCR if workers load.
          </li>
        </ul>
      </div>

      <div className="panel">
        <div className="panel-head">
          <span className="panel-title">Knowing what OCR really did</span>
        </div>
        <p className="small">
          The app never fabricates accuracy. Detected line regions come from the OCR engine. Confidence values for local
          Tesseract come from the engine; API providers generally do not return per-character confidence, so those boxes
          are labeled honestly. CER/WER numbers in <Link to="/workflow">Workflow</Link> and{' '}
          <Link to="/models">Models → Experiment</Link> are comparisons against <em>your own</em> ground truth, not
          benchmark claims.
        </p>
      </div>

      <p className="small muted" style={{ marginTop: 'var(--sp-5)' }}>
        This page mirrors <code>docs/PRIVACY.md</code> in the source repository.
      </p>
    </div>
  )
}
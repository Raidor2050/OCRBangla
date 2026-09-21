import type { PreprocessOptions } from '../ocr/types'

export interface ProcessingControlsProps {
  preprocess: PreprocessOptions
  onChange: (patch: Partial<PreprocessOptions>) => void
  postprocess: boolean
  onPostprocess: (v: boolean) => void
}

export function ProcessingControls({ preprocess, onChange, postprocess, onPostprocess }: ProcessingControlsProps) {
  const auto = preprocess.auto ?? false
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
      <div style={{ display: 'flex', gap: 'var(--sp-2)', flexWrap: 'wrap', alignItems: 'center' }}>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 'var(--fs-sm)', cursor: 'pointer' }}>
          <input type="checkbox" checked={auto} onChange={(e) => onChange({ auto: e.target.checked })} />
          Auto enhance
        </label>
        <span className="subtle small" style={{ flex: 1 }}>— scale → grayscale → contrast → denoise → binarize (deterministic)

</span>
      </div>

      {!auto && (
        <div className="grid-2" style={{ gap: 'var(--sp-2)', marginTop: 2 }}>
          <label className="field">
            <span className="field-label">Grayscale</span>
            <select
              className="select"
              value={preprocess.grayscale ? 'on' : 'off'}
              onChange={(e) => onChange({ grayscale: e.target.value === 'on' })}
            >
              <option value="off">Off</option>
              <option value="on">On</option>
            </select>
          </label>
          <label className="field">
            <span className="field-label">Contrast</span>
            <input
              className="input"
              type="number"
              min={0.4}
              max={2.5}
              step={0.1}
              value={preprocess.contrast ?? 1}
              onChange={(e) => onChange({ contrast: Number(e.target.value) })}
            />
          </label>
          <label className="field">
            <span className="field-label">Denoise</span>
            <select
              className="select"
              value={preprocess.denoise ? 'on' : 'off'}
              onChange={(e) => onChange({ denoise: e.target.value === 'on' })}
            >
              <option value="off">Off</option>
              <option value="on">On (median 3)</option>
            </select>
          </label>
          <label className="field">
            <span className="field-label">Sharpen</span>
            <select
              className="select"
              value={preprocess.sharpen ? 'on' : 'off'}
              onChange={(e) => onChange({ sharpen: e.target.value === 'on' })}
            >
              <option value="off">Off</option>
              <option value="on">On (unsharp)</option>
            </select>
          </label>
          <label className="field">
            <span className="field-label">Threshold</span>
            <select
              className="select"
              value={preprocess.threshold ?? 'none'}
              onChange={(e) => onChange({ threshold: e.target.value as PreprocessOptions['threshold'] })}
            >
              <option value="none">None</option>
              <option value="otsu">Otsu</option>
              <option value="adaptive">Adaptive (Bradley)</option>
              <option value="sauvola">Sauvola</option>
            </select>
          </label>
          <label className="field">
            <span className="field-label">Deskew</span>
            <select
              className="select"
              value={preprocess.deskew ? 'on' : 'off'}
              onChange={(e) => onChange({ deskew: e.target.value === 'on' })}
            >
              <option value="off">Off</option>
              <option value="on">Auto (−3°…+3°)</option>
            </select>
          </label>
        </div>
      )}

      <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 'var(--fs-sm)', cursor: 'pointer' }}>
        <input type="checkbox" checked={postprocess} onChange={(e) => onPostprocess(e.target.checked)} />
        Bangla normalization + cleanup
      </label>
    </div>
  )
}
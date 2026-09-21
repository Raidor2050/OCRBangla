import { PIPELINE_ORDER, type PipelineStage } from '../ocr/types'

export interface PipelineBarProps {
  stages: PipelineStage[]
}

const STAGE_LABELS: Record<PipelineStage, string> = {
  upload: 'Upload',
  render: 'Render',
  preprocess: 'Preprocess',
  layout: 'Layout',
  ocr: 'OCR',
  normalize: 'Normalize',
  done: 'Done',
}

export function PipelineBar({ stages }: PipelineBarProps) {
  const activeIndex = stages.length > 0 ? PIPELINE_ORDER.indexOf(stages[stages.length - 1]) : -1
  const isDone = stages[stages.length - 1] === 'done'

  const items = PIPELINE_ORDER.filter((s) => s !== 'done' || isDone)

  return (
    <div className="pipeline" role="status" aria-live="polite">
      {items.map((stage, i) => {
        const idx = PIPELINE_ORDER.indexOf(stage)
        const done = idx < activeIndex || (stage === 'done' && isDone)
        const active = idx === activeIndex && !isDone
        return (
          <span key={stage} className="pipeline-group">
            {i > 0 && <span className="sep" aria-hidden="true">→</span>}
            <span className={'stage' + (done ? ' done' : '') + (active ? ' active' : '')}>
              <span className="check" aria-hidden="true">✓</span>
              {STAGE_LABELS[stage]}
            </span>
          </span>
        )
      })}
    </div>
  )
}
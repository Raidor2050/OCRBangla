import type { JobItem } from '../state/job'
import { isDoneStatus } from '../state/job'
import { humanSize } from '../documents/detect'
import { downloadText, downloadJson } from '../utils/zip'
import { averageConfidence } from '../ocr/pipeline'
import { buildDocumentJson } from '../utils/exportjson'

export interface QueueListProps {
  items: JobItem[]
  activeId?: string
  runningId?: string
  onSelect: (id: string) => void
  onRemove: (id: string) => void
  onRetry: (id: string) => void
  onCancel: (id: string) => void
  onClear: () => void
  onRemoveAll?: () => void
  onDownloadTxt: (id: string) => void
  onDownloadJson: (id: string) => void
}

const STATUS_LABEL: Record<JobItem['status'], string> = {
  queued: 'Waiting',
  running: 'Processing',
  complete: 'Complete',
  failed: 'Failed',
  cancelled: 'Cancelled',
}

function progressOf(item: JobItem): string {
  if (item.stage && item.stage === 'render') {
    if (item.pagesTotal) return `${item.pagesDone ?? 0}/${item.pagesTotal} pages`
    return 'rendering…'
  }
  if (item.stage) return item.stage.charAt(0).toUpperCase() + item.stage.slice(1)
  return '—'
}

export function QueueList(props: QueueListProps) {
  const { items, activeId, onSelect, onRemove, onRetry, onCancel } = props
  const anyComplete = items.some((i) => i.status === 'complete')
  const running = items.some((i) => i.status === 'running')

  return (
    <div className="panel" style={{ overflow: 'hidden' }}>
      <div className="panel-head">
        <span className="panel-title">Queue</span>
        <div style={{ display: 'flex', gap: 'var(--sp-1)' }}>
          {anyComplete && (
            <button type="button" className="btn btn-sm btn-ghost" onClick={props.onClear}>
              Clear done
            </button>
          )}
          {items.length > 0 && props.onRemoveAll && (
            <button type="button" className="btn btn-sm btn-ghost" onClick={props.onRemoveAll}>
              Remove all
            </button>
          )}
          <span className="subtle small" style={{ alignSelf: 'center' }}>
            {items.length} file{items.length === 1 ? '' : 's'}
          </span>
        </div>
      </div>
      {items.length === 0 ? (
        <div className="empty-state" style={{ paddingBlock: 'var(--sp-6)' }}>
          <span className="glyph">▤</span>
          <p className="small muted">Uploaded documents appear here.</p>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="table">
            <thead>
              <tr>
                <th>File</th>
                <th>Pages</th>
                <th>Status</th>
                <th>Progress</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const isActive = activeId === item.id
                return (
                  <tr
                    key={item.id}
                    onClick={() => onSelect(item.id)}
                    style={{ cursor: 'pointer', ...(isActive ? { background: 'var(--accent-soft)' } : {}) }}
                  >
                    <td>
                      <span style={{ fontWeight: 500 }} title={item.file.name}>
                        {item.file.name.length > 30 ? item.file.name.slice(0, 30) + '…' : item.file.name}
                      </span>
                      <span className="subtle small" style={{ marginLeft: 8 }}>
                        {humanSize(item.file.size)}
                      </span>
                    </td>
                    <td className="mono-number">
                      {item.kind === 'pdf' ? (item.result?.pages.length ?? item.pagesTotal ?? '—') : 1}
                    </td>
                    <td>
                      <StatusChip status={item.status} conf={item.result ? averageConfidence(item.result.pages) : undefined} />
                    </td>
                    <td className="small muted" style={{ maxWidth: 160 }}>
                      {item.status === 'running' ? progressOf(item) : item.error ? (
                        <span className="small" style={{ color: 'var(--error)', display: 'block', maxWidth: 220 }} title={item.error}>
                          {item.error.length > 48 ? item.error.slice(0, 48) + '…' : item.error}
                        </span>
                      ) : item.stage && !isDoneStatus(item.status) ? progressOf(item) : (
                        <span>
                          {item.result ? `${item.result.pages.length} page${item.result.pages.length === 1 ? '' : 's'} · ${(item.result.processingMs / 1000).toFixed(1)}s` : '—'}
                        </span>
                      )}
                    </td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <RowActions item={item} onRetry={onRetry} onCancel={onCancel} onRemove={onRemove} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {running && (
            <div style={{ padding: 'var(--sp-2) var(--sp-3)' }}>
              <div className="indeterminate" aria-hidden="true" />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function StatusChip({ status, conf }: { status: JobItem['status']; conf?: number }) {
  const cls =
    status === 'complete' ? 'chip-ok' : status === 'failed' ? 'chip-error' : status === 'running' ? 'chip-accent' : 'static'
  return (
    <span className={'chip ' + cls}>
      <span className="dot" aria-hidden="true" />
      {STATUS_LABEL[status]}
      {typeof conf === 'number' && status === 'complete' && (
        <span className="mono" title="Engine confidence (Tesseract only)">
          {conf.toFixed(0)}%
        </span>
      )}
    </span>
  )
}

function RowActions({ item, onRetry, onCancel, onRemove }: Pick<QueueListProps, 'onRetry' | 'onCancel' | 'onRemove'> & { item: JobItem }) {
  return (
    <span style={{ display: 'inline-flex', gap: 2 }}>
      {item.status === 'failed' && (
        <button type="button" className="btn btn-sm btn-ghost" aria-label="Retry" onClick={() => onRetry(item.id)}>
          ↻
        </button>
      )}
      {item.status === 'running' && (
        <button type="button" className="btn btn-sm btn-ghost" aria-label="Cancel" onClick={() => onCancel(item.id)}>
          ✕
        </button>
      )}
      {item.status === 'complete' && (
        <>
          <button
            type="button"
            className="btn btn-sm btn-ghost"
            aria-label="Download TXT"
            onClick={() => downloadText(item.result!.text, item.result!.fileName.replace(/\.(png|jpe?g|webp|pdf)$/i, '') + '.txt')}
          >
            TXT
          </button>
          <button
            type="button"
            className="btn btn-sm btn-ghost"
            aria-label="Download JSON"
            onClick={() => downloadJson(buildDocumentJson(item.result!), item.result!.fileName.replace(/\.(png|jpe?g|webp|pdf)$/i, '') + '.json')}
          >
            JSON
          </button>
        </>
      )}
      <button type="button" className="btn btn-sm btn-ghost" aria-label="Remove" onClick={() => onRemove(item.id)}>
        ×
      </button>
    </span>
  )
}
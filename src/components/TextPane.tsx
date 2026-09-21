import { useEffect, useMemo, useState } from 'react'
import type { DocumentOutcome } from '../ocr/pipeline'
import { downloadText } from '../utils/zip'

export interface TextPaneProps {
  result?: DocumentOutcome
}

export function TextPane({ result }: TextPaneProps) {
  const [buffer, setBuffer] = useState('')
  const [view, setView] = useState<'processed' | 'raw'>('processed')
  const [pageMode, setPageMode] = useState<'all' | number>('all')
  const [showIssues, setShowIssues] = useState(false)

  const page = result?.pages[pageMode === 'all' ? 0 : pageMode]

  useEffect(() => {
    if (!result) {
      setBuffer('')
      return
    }
    setBuffer(view === 'processed' ? currentPageText(result, pageMode) : rawFor(result, pageMode))
  }, [result, view, pageMode])

  const displayedText = useMemo(() => {
    if (!result) return ''
    if (view === 'processed') return pageMode === 'all' ? result.text : (page?.text ?? '')
    return pageMode === 'all' ? (result.rawText ?? result.text) : rawFor(result, pageMode)
  }, [result, view, pageMode, page])

  if (!result) {
    return (
      <div className="text-pane" style={{ display: 'flex', flexDirection: 'column', minHeight: 0, flex: 1 }}>
        <div className="panel-head">
          <span className="panel-title">Extracted Text</span>
        </div>
        <div className="empty-state" style={{ flex: 1 }}>
          <span className="glyph">¶</span>
          <h3>No text yet</h3>
          <p className="small muted">Run OCR on a document to see extracted Bangla text here.</p>
        </div>
      </div>
    )
  }

  const issues = result.issues ?? []
  const pageCount = result.pages.length

  const copy = async () => {
    const text = buffer
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = displayedText
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      ta.remove()
    }
  }

  return (
    <div className="text-pane" style={{ display: 'flex', flexDirection: 'column', minHeight: 0, flex: 1 }}>
      <div className="panel-head" style={{ gap: 'var(--sp-2)' }}>
        <span className="panel-title">Extracted Text</span>
        <div style={{ display: 'flex', gap: 'var(--sp-1)', alignItems: 'center', marginLeft: 'auto' }}>
          <div className="tabs" role="tablist" aria-label="Page selector">
            <button
              className="tab"
              role="tab"
              aria-selected={pageMode === 'all'}
              onClick={() => setPageMode('all')}
            >
              All
            </button>
            {pageCount > 1 &&
              Array.from({ length: Math.min(pageCount, 12) }, (_, i) => (
                <button
                  key={i}
                  className="tab"
                  role="tab"
                  aria-selected={pageMode === i}
                  onClick={() => setPageMode(i)}
                >
                  {i + 1}
                </button>
              ))}
          </div>
          <select
            className="select"
            style={{ height: 28, width: 'auto' }}
            value={view}
            onChange={(e) => setView(e.target.value as 'processed' | 'raw')}
            aria-label="Text view"
          >
            <option value="processed">Processed</option>
            <option value="raw">Raw OCR</option>
          </select>
        </div>
      </div>

      <div className="editor">
        <textarea
          aria-label="Extracted text (editable)"
          lang="bn"
          value={buffer}
          spellCheck={false}
          onChange={(e) => setBuffer(e.target.value)}
        />
      </div>

      <div className="panel-head" style={{ borderTop: '1px solid var(--line)', borderBottom: 'none', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 'var(--sp-2)', alignItems: 'center', flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-sm" onClick={copy}>
            Copy
          </button>
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => downloadText(buffer, result.fileName.replace(/\.(png|jpe?g|webp|pdf)$/i, '') + '.txt')}
          >
            Download TXT
          </button>
          <button
            type="button"
            className="btn btn-sm btn-ghost"
            aria-expanded={showIssues}
            onClick={() => setShowIssues((v) => !v)}
          >
            Bangla issues {issues.length > 0 ? `(${issues.length})` : ''}
          </button>
        </div>
        <span className="subtle small">
          {result.pages.length} page{result.pages.length === 1 ? '' : 's'} ·{' '}
          {(result.processingMs / 1000).toFixed(1)}s · {result.providerId}
          {result.model ? ` · ${result.model}` : ''}
        </span>
      </div>

      {showIssues && (
        <div style={{ maxHeight: 180, overflowY: 'auto', borderTop: '1px solid var(--line)', padding: 'var(--sp-3) var(--sp-4)' }}>
          {issues.length === 0 ? (
            <p className="small muted">No suspicious Bangla sequences detected by the orthotactic checker.</p>
          ) : (
            <ul style={{ margin: 0, paddingLeft: 'var(--sp-4)', fontSize: 'var(--fs-sm)', display: 'flex', flexDirection: 'column', gap: 4 }}>
              {issues.slice(0, 40).map((issue, i) => (
                <li key={i}>
                  <span className={'chip chip-' + (issue.severity === 'high' ? 'warn' : 'static')} style={{ marginRight: 8 }}>
                    {issue.code}
                  </span>
                  <span className="muted">{issue.message}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

function currentPageText(result: DocumentOutcome, pageMode: 'all' | number): string {
  if (pageMode === 'all') return result.text
  return result.pages[pageMode]?.text ?? ''
}

function rawFor(result: DocumentOutcome, pageMode: 'all' | number): string {
  if (pageMode === 'all') return result.rawText ?? result.text
  return result.pageOutcomes[pageMode]?.rawText ?? result.pages[pageMode]?.text ?? ''
}
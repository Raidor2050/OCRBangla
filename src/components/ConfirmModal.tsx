import type { ReactNode } from 'react'

export interface ConfirmModalProps {
  title: string
  body: ReactNode
  confirmLabel: string
  destructive?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmModal({ title, body, confirmLabel, destructive, onConfirm, onCancel }: ConfirmModalProps) {
  return (
    <div className="modal-backdrop" role="presentation" onClick={onCancel}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-head">
          <h2 id="confirm-title" style={{ fontSize: 'var(--fs-lg)' }}>{title}</h2>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onCancel} aria-label="Close dialog">
            ✕
          </button>
        </div>
        <div className="modal-body">{body}</div>
        <div className="modal-foot">
          <button type="button" className="btn" onClick={onCancel}>
            Cancel
          </button>
          <button
            type="button"
            className={'btn ' + (destructive ? 'btn-primary' : 'btn-accent')}
            autoFocus
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
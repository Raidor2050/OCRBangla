import { useApp } from '../state/AppContext'

export function ToastRegion() {
  const { toasts, dismissToast } = useApp()
  if (toasts.length === 0) return null
  return (
    <div className="toast-region" role="region" aria-live="polite" aria-label="Notifications">
      {toasts.map((t) => (
        <div key={t.id} className={'toast' + (t.kind === 'error' ? ' toast-error' : '')}>
          <span style={{ flex: 1 }}>{t.message}</span>
          <button
            type="button"
            className="btn-ghost btn-sm"
            aria-label="Dismiss notification"
            onClick={() => dismissToast(t.id)}
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  )
}
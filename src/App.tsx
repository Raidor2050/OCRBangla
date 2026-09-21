import { NavLink, Navigate, Route, Routes } from 'react-router-dom'
import { useApp } from './state/AppContext'
import { ExtractionPage } from './pages/ExtractionPage'
import { ModelsPage } from './pages/ModelsPage'
import { WorkflowPage } from './pages/WorkflowPage'
import { SettingsPage } from './pages/SettingsPage'
import { PrivacyPage } from './pages/PrivacyPage'
import { ToastRegion } from './components/ToastRegion'

function TopNav() {
  const { setSettings, theme, statuses } = useApp()
  const configuredCount = statuses.filter((s) => s.configured).length

  const cycleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light'
    setSettings({ theme: next })
  }

  return (
    <header className="topbar">
      <NavLink to="/extraction" className="brand" aria-label="Ordinary Chobi Reader home">
        <img src={import.meta.env.BASE_URL + 'favicon.svg'} alt="" className="brand-mark" />
        <span className="brand-name">Ordinary Chobi Reader</span>
        <span className="brand-badge">BANGLA OCR</span>
      </NavLink>
      <nav className="nav" aria-label="Primary">
        <NavLink
          to="/extraction"
          className={({ isActive }) => 'nav-btn' + (isActive ? ' active' : '')}
        >
          Extraction
        </NavLink>
        <NavLink
          to="/workflow"
          className={({ isActive }) => 'nav-btn' + (isActive ? ' active' : '')}
        >
          Workflow
        </NavLink>
        <NavLink
          to="/models"
          className={({ isActive }) => 'nav-btn' + (isActive ? ' active' : '')}
        >
          Models
          {configuredCount > 0 && <span className="nav-badge">·</span>}
        </NavLink>
      </nav>
      <div className="topbar-right">
        <NavLink
          to="/settings"
          className={({ isActive }) => 'nav-btn' + (isActive ? ' active' : '')}
          aria-label="Settings"
        >
          Settings
        </NavLink>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={cycleTheme}
          aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
        >
          {theme === 'light' ? '☾' : '☀'}
        </button>
      </div>
    </header>
  )
}

export function App() {
  return (
    <div className="app">
      <TopNav />
      <main style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <Routes>
          <Route path="/" element={<Navigate to="/extraction" replace />} />
          <Route path="/extraction" element={<ExtractionPage />} />
          <Route path="/workflow" element={<WorkflowPage />} />
          <Route path="/models" element={<ModelsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="*" element={<Navigate to="/extraction" replace />} />
        </Routes>
      </main>
      <footer className="footer">
        <span className="subtle small">
          Ordinary Chobi Reader — docs &amp; research in the repo: <code>docs/</code>
        </span>
        <NavLink to="/privacy" className="nav-btn" aria-label="Privacy">
          Privacy
        </NavLink>
      </footer>
      <ToastRegion />
    </div>
  )
}
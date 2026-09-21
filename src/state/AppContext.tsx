import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { loadSettings, saveSettings, resolveTheme, type AppSettings } from '../storage/settings'
import {
  credentialStore,
  maskSecret,
  type CredentialMap,
} from '../storage/credentials'
import { PROVIDERS, providerStatuses, type ProviderStatus } from '../ocr/registry'

export interface Toast {
  id: number
  message: string
  kind: 'info' | 'error' | 'success'
}

interface AppContextValue {
  settings: AppSettings
  setSettings: (patch: Partial<AppSettings>) => void
  theme: 'light' | 'dark'
  toasts: Toast[]
  pushToast: (message: string, kind?: Toast['kind']) => void
  dismissToast: (id: number) => void
  credentialMap: CredentialMap
  refreshCredentials: () => Promise<void>
  saveKey: (providerId: string, value: string) => Promise<void>
  forgetKey: (providerId: string) => Promise<void>
  forgetAllKeys: () => Promise<void>
  statuses: ProviderStatus[]
  refreshStatuses: () => Promise<void>
}

const AppContext = createContext<AppContextValue | null>(null)

let toastId = 1

export function AppProvider({ children }: { children: ReactNode }) {
  const [settings, setSettingsState] = useState<AppSettings>(() => loadSettings())
  const [statuses, setStatuses] = useState<ProviderStatus[]>([])
  const [credentialMap, setCredentialMap] = useState<CredentialMap>({})
  const [toasts, setToasts] = useState<Toast[]>([])

  const theme = useMemo(() => resolveTheme(settings.theme), [settings.theme])

  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  const refreshCredentials = useCallback(async () => {
    const all = await credentialStore.all()
    setCredentialMap(all)
  }, [])

  const refreshStatuses = useCallback(async () => {
    const s = await providerStatuses()
    setStatuses(s)
  }, [])

  useEffect(() => {
    void refreshCredentials()
    void refreshStatuses()
  }, [refreshCredentials, refreshStatuses])

  const setSettings = useCallback((patch: Partial<AppSettings>) => {
    setSettingsState((prev) => {
      const next = { ...prev, ...patch }
      saveSettings(next)
      return next
    })
  }, [])

  const pushToast = useCallback((message: string, kind: Toast['kind'] = 'info') => {
    const id = toastId++
    setToasts((prev) => [...prev.slice(-3), { id, message, kind }])
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 6000)
  }, [])

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const saveKey = useCallback(
    async (providerId: string, value: string) => {
      await credentialStore.set(providerId, value.trim())
      await refreshCredentials()
      await refreshStatuses()
    },
    [refreshCredentials, refreshStatuses],
  )

  const forgetKey = useCallback(
    async (providerId: string) => {
      await credentialStore.delete(providerId)
      await refreshCredentials()
      await refreshStatuses()
    },
    [refreshCredentials, refreshStatuses],
  )

  const forgetAllKeys = useCallback(async () => {
    await credentialStore.clearAll()
    await refreshCredentials()
    await refreshStatuses()
  }, [refreshCredentials, refreshStatuses])

  const value: AppContextValue = {
    settings,
    setSettings,
    theme,
    toasts,
    pushToast,
    dismissToast,
    credentialMap,
    refreshCredentials,
    saveKey,
    forgetKey,
    forgetAllKeys,
    statuses,
    refreshStatuses,
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}

export { maskSecret, PROVIDERS as ALL_PROVIDERS }

export function useHasKey(providerId: string): boolean {
  const { credentialMap } = useApp()
  return (credentialMap[providerId] ?? '').length > 0
}
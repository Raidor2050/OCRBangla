import type { PreprocessOptions } from '../ocr/types'

export type Theme = 'light' | 'dark' | 'system'

export interface AppSettings {
  theme: Theme
  defaultProviderId: string
  defaultModel?: string
  preprocess: PreprocessOptions
  /** Keep the processed (normalized) text as the working copy after OCR. */
  postprocess: boolean
  /** Ask before sending documents to an external provider. */
  confirmExternal: boolean
  /** DPI-equivalent target for upscaling. */
  targetDpi: number
}

const KEY = 'ocrb.settings.v1'

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'system',
  defaultProviderId: 'tesseract',
  defaultModel: undefined,
  preprocess: {
    auto: true,
    grayscale: false,
    contrast: 1,
    sharpen: false,
    denoise: false,
    threshold: 'none',
    deskew: false,
    rotate: 0,
    scale: 1,
    targetMinDim: 1200,
  },
  postprocess: true,
  confirmExternal: true,
  targetDpi: 300,
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null
}

export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { ...DEFAULT_SETTINGS }
    const parsed: unknown = JSON.parse(raw)
    if (!isRecord(parsed)) return { ...DEFAULT_SETTINGS }
    const pre: PreprocessOptions = { ...DEFAULT_SETTINGS.preprocess }
    if (isRecord(parsed.preprocess)) {
      Object.assign(pre, parsed.preprocess)
    }
    return {
      theme: (parsed.theme as Theme) ?? DEFAULT_SETTINGS.theme,
      defaultProviderId:
        typeof parsed.defaultProviderId === 'string'
          ? parsed.defaultProviderId
          : DEFAULT_SETTINGS.defaultProviderId,
      defaultModel:
        typeof parsed.defaultModel === 'string' ? parsed.defaultModel : undefined,
      preprocess: pre,
      postprocess: typeof parsed.postprocess === 'boolean' ? parsed.postprocess : true,
      confirmExternal: typeof parsed.confirmExternal === 'boolean' ? parsed.confirmExternal : true,
      targetDpi: typeof parsed.targetDpi === 'number' ? parsed.targetDpi : 300,
    }
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

export function saveSettings(settings: AppSettings): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(settings))
  } catch {
    /* storage unavailable (private mode) — non-fatal */
  }
}

export function resolveTheme(theme: Theme): 'light' | 'dark' {
  if (theme === 'system') {
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  return theme
}
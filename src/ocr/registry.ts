import type { OCRProvider } from './types'
import { tesseractProvider } from './providers/tesseract'
import { geminiProvider, GEMINI_MODELS } from './providers/gemini'
import { openAiCompatibleProvider, OPENAI_PRESETS } from './providers/openai'

export const PROVIDERS: OCRProvider[] = [tesseractProvider, geminiProvider, openAiCompatibleProvider]

export function getProvider(id: string): OCRProvider | undefined {
  return PROVIDERS.find((p) => p.id === id)
}

export interface ProviderStatus {
  provider: OCRProvider
  configured: boolean
}

export async function providerStatuses(): Promise<ProviderStatus[]> {
  const statuses: ProviderStatus[] = []
  for (const p of PROVIDERS) {
    try {
      const configured = await p.isConfigured()
      statuses.push({ provider: p, configured })
    } catch {
      statuses.push({ provider: p, configured: false })
    }
  }
  return statuses
}

export function isExternal(p: OCRProvider): boolean {
  return p.type === 'api'
}

/** Model hint used by the Extraction model selector for the OpenAI family. */
export function defaultModelFor(providerId: string): string | undefined {
  if (providerId === 'gemini') return GEMINI_MODELS[0]
  if (providerId === 'openai') return OPENAI_PRESETS[0].models[0]
  return tesseractProvider.defaultModel
}
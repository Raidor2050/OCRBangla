import type { OCRProvider, OcrPageResult, ProviderPageInput } from '../types'
import { buildVisionMessages } from './prompts'
import { credentialStore } from '../../storage/credentials'
import { canvasToDataUrl } from '../../documents/image'
import { postJson } from './http'

/**
 * OpenAI-compatible Chat Completions (vision) provider.
 *
 * The exact same wire format is served by OpenAI, Groq, OpenRouter, Together,
 * many self-hosted LLM servers (with CORS enabled), and custom endpoints — so
 * this single provider covers a family of services. The user picks a base URL,
 * a model, and supplies their own key (BYOK).
 *
 * Browser (CORS) note: OpenAI itself has had intermittent CORS incidents;
 * Groq/OpenRouter work from browsers. The UI/error copy and docs/API_KEYS.md
 * explain this honestly.
 */

export interface OpenAiConfig {
  baseUrl: string
  model: string
  apiKey: string
}

export const OPENAI_PRESETS = [
  {
    id: 'openai',
    label: 'OpenAI (api.openai.com)',
    baseUrl: 'https://api.openai.com/v1',
    models: ['gpt-4o-mini', 'gpt-4o', 'gpt-4.1-mini', 'o4-mini'],
  },
  {
    id: 'groq',
    label: 'Groq (api.groq.com — browser-friendly)',
    baseUrl: 'https://api.groq.com/openai/v1',
    models: ['llama-3.2-90b-vision-preview', 'meta-llama/llama-4-maverick-17b-128e-instruct'],
  },
  {
    id: 'openrouter',
    label: 'OpenRouter (openrouter.ai)',
    baseUrl: 'https://openrouter.ai/api/v1',
    models: ['openai/gpt-4o-mini'],
  },
  {
    id: 'custom',
    label: 'Custom OpenAI-compatible endpoint',
    baseUrl: '',
    models: [],
  },
]

export async function getOpenAiConfig(): Promise<OpenAiConfig | null> {
  const apiKey = await credentialStore.get('openai')
  if (apiKey == null) return null
  const settings = JSON.parse(localStorage.getItem('ocrb.provider.openai') ?? '{}') as Partial<OpenAiConfig>
  const baseUrl =
    settings.baseUrl && settings.baseUrl.trim() ? settings.baseUrl.trim() : OPENAI_PRESETS[0].baseUrl
  const model = settings.model && settings.model.trim() ? settings.model.trim() : OPENAI_PRESETS[0].models[0]
  return { baseUrl, model, apiKey }
}

export function saveOpenAiConfig(cfg: { baseUrl?: string; model?: string }): void {
  const cur = (() => {
    try {
      return JSON.parse(localStorage.getItem('ocrb.provider.openai') ?? '{}') as Partial<OpenAiConfig>
    } catch {
      return {}
    }
  })()
  const next: Partial<OpenAiConfig> = { ...cur }
  if (cfg.baseUrl !== undefined) next.baseUrl = cfg.baseUrl.trim()
  if (cfg.model !== undefined) next.model = cfg.model.trim()
  localStorage.setItem('ocrb.provider.openai', JSON.stringify(next))
}

export function clearOpenAiConfig(): void {
  localStorage.removeItem('ocrb.provider.openai')
}

export const openAiCompatibleProvider: OCRProvider = {
  id: 'openai',
  name: 'OpenAI-compatible API',
  type: 'api',
  description:
    'Vision-capable Chat Completions endpoint (OpenAI, Groq, OpenRouter, custom). Your document image is sent to the service you configure, only when you run it.',
  capabilities: {
    supportsConfidence: false,
    supportsLineBoxes: false,
    supportsWordBoxes: false,
    inputImages: true,
    nativePdf: false,
    requiresNetwork: true,
    languages: ['ben', 'eng', 'ben+eng'],
  },
  languages: ['ben', 'eng'],
  models: OPENAI_PRESETS.flatMap((p) =>
    p.models.map((m) => ({
      id: m,
      label: m,
      description: p.label,
    })),
  ),
  defaultModel: 'gpt-4o-mini',

  async isConfigured() {
    return (await credentialStore.get('openai')) != null
  },

  async processPage(input: ProviderPageInput): Promise<OcrPageResult> {
    return doOpenAiProcessPage(input)
  },
}

async function doOpenAiProcessPage(input: ProviderPageInput): Promise<OcrPageResult> {
  const config = await getOpenAiConfig()
  if (!config) {
    throw new Error('OpenAI-compatible provider is not configured. Add an API key in Models → External Models.')
  }
  const model = input.model || config.model
  const imageDataUrl = canvasToDataUrl(input.canvas, 'image/jpeg', 0.85, 1568)
  const { status, data } = await postJson(
    `${config.baseUrl.replace(/\/+$/, '')}/chat/completions`,
    { authorization: `Bearer ${config.apiKey}` },
    {
      model,
      messages: buildVisionMessages(imageDataUrl),
      max_tokens: 4096,
      temperature: 0,
    },
    input.signal,
  )
  if (status !== 200) throw new Error('Unexpected response from provider.')
  const content = extractContent(data)
  const t0 = Date.now()
  return {
    pageIndex: input.pageIndex,
    text: content,
    meta: { provider: 'openai-compatible', model, processingMs: Date.now() - t0, httpStatus: status },
  }
}

function extractContent(data: unknown): string {
  const first = (data as { choices?: Array<{ message?: { content?: string } }> })?.choices?.[0]
  const content = first?.message?.content
  if (typeof content !== 'string' || content.length === 0) {
    throw new Error('The provider returned an empty transcription.')
  }
  return content.trim()
}
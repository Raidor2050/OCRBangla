import type { OCRProvider, OcrPageResult, ProviderPageInput } from '../types'
import { OCR_SYSTEM_PROMPT, OCR_USER_PROMPT } from './prompts'
import { credentialStore } from '../../storage/credentials'
import { canvasToDataUrl } from '../../documents/image'
import { postJson } from './http'

/**
 * Google Gemini provider (generativelanguage.googleapis.com).
 *
 * Gemini's REST API is browser/CORS-friendly and a practical high-quality
 * Bangla OCR path for clean documents. The key is the *user's own* AI Studio
 * key (BYOK), sent via the X-Goog-Api-Key header (never in the URL here).
 *
 * IMPORTANT (verified by research, Sept 2026): Google is migrating Gemini API
 * web apps from API keys to Firebase/authentication keys. Standard AI Studio
 * keys may stop working after the migration for web clients. docs/API_KEYS.md
 * documents the migration path. If a call starts failing with 401/403, the UI
 * surfaces the provider's exact message.
 */

export const GEMINI_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-1.5-flash',
  'gemini-2.5-pro',
]

const API_ORIGIN = 'https://generativelanguage.googleapis.com/v1beta'

export async function getGeminiConfig(): Promise<{ apiKey: string; model: string } | null> {
  const apiKey = await credentialStore.get('gemini')
  if (apiKey == null) return null
  const saved = JSON.parse(localStorage.getItem('ocrb.provider.gemini') ?? '{}') as { model?: string }
  return { apiKey, model: saved.model && saved.model.trim() ? saved.model.trim() : GEMINI_MODELS[0] }
}

export function saveGeminiModel(model: string): void {
  localStorage.setItem('ocrb.provider.gemini', JSON.stringify({ model: model.trim() }))
}

export function clearGeminiConfig(): void {
  localStorage.removeItem('ocrb.provider.gemini')
}

export const geminiProvider: OCRProvider = {
  id: 'gemini',
  name: 'Google Gemini',
  type: 'api',
  description:
    'Google Gemini vision model (AI Studio key). Document images are sent to Google only when you run a job with this model selected.',
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
  models: GEMINI_MODELS.map((m) => ({
    id: m,
    label: m,
    description: 'Google Gemini family',
  })),
  defaultModel: GEMINI_MODELS[0],

  async isConfigured() {
    return (await credentialStore.get('gemini')) != null
  },

  async processPage(input: ProviderPageInput): Promise<OcrPageResult> {
    return doGeminiProcessPage(input)
  },
}

async function doGeminiProcessPage(input: ProviderPageInput): Promise<OcrPageResult> {
  const config = await getGeminiConfig()
  if (!config) {
    throw new Error('Gemini is not configured. Add an API key in Models → External Models.')
  }
  const model = input.model || config.model
  const imageDataUrl = canvasToDataUrl(input.canvas, 'image/jpeg', 0.9, 1568)
  const imageB64 = imageDataUrl.slice(imageDataUrl.indexOf(',') + 1)
  const mime = imageDataUrl.slice(5, imageDataUrl.indexOf(';'))
  const t0 = Date.now()
  const { data } = await postJson(
    `${API_ORIGIN}/models/${model}:generateContent`,
    { 'x-goog-api-key': config.apiKey },
    {
      systemInstruction: { parts: [{ text: OCR_SYSTEM_PROMPT }] },
      contents: [
        {
          parts: [
            { text: OCR_USER_PROMPT },
            { inlineData: { mimeType: mime, data: imageB64 } },
          ],
        },
      ],
      generationConfig: { temperature: 0, maxOutputTokens: 8192 },
    },
    input.signal,
  )
  const text = extractGeminiText(data)
  return {
    pageIndex: input.pageIndex,
    text,
    meta: {
      provider: 'gemini',
      model,
      processingMs: Date.now() - t0,
    },
  }
}

function extractGeminiText(data: unknown): string {
  const candidates = (data as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> })
    ?.candidates
  const parts = candidates?.[0]?.content?.parts
  const text = (parts ?? []).map((p) => p.text ?? '').join('')
  if (!text.trim()) {
    throw new Error('Gemini returned an empty transcription.')
  }
  return text
}
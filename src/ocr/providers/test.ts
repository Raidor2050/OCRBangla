import { credentialStore } from '../../storage/credentials'
import { getGeminiConfig } from './gemini'
import { getOpenAiConfig } from './openai'

export interface ConnectionTestResult {
  ok: boolean
  message: string
  modelCount?: number
  providerId: string
}

/**
 * Tests provider connectivity WITHOUT OCR and without transmitting a document.
 * For Gemini and OpenAI-compatible services, listing models validates the key,
 * endpoint, and CORS in one cheap request.
 */
export async function testProviderConnection(providerId: string): Promise<ConnectionTestResult> {
  if (providerId === 'gemini') return testGemini()
  if (providerId === 'openai') return testOpenAi()
  return { ok: false, message: 'This provider does not support a connection test.', providerId }
}

async function testGemini(): Promise<ConnectionTestResult> {
  const config = await getGeminiConfig()
  if (!config) return { ok: false, message: 'No API key configured for Gemini.', providerId: 'gemini' }
  try {
    const res = await fetch('https://generativelanguage.googleapis.com/v1beta/models?pageSize=10', {
      headers: { 'x-goog-api-key': config.apiKey },
    })
    if (!res.ok) {
      const body = await res.json().catch(() => null)
      const msg =
        body && typeof body === 'object' && 'error' in body
          ? (body as { error?: { message?: string } }).error?.message
          : undefined
      return {
        ok: false,
        providerId: 'gemini',
        message: `Gemini rejected the key (HTTP ${res.status})${msg ? ': ' + msg : ''}.`,
      }
    }
    const data = (await res.json()) as { models?: unknown[] }
    return {
      ok: true,
      providerId: 'gemini',
      message: `Connected. ${data.models?.length ?? 0} models accessible.`,
      modelCount: data.models?.length ?? 0,
    }
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') throw err
    return {
      ok: false,
      providerId: 'gemini',
      message:
        'Could not reach Gemini from this browser. This is usually a CORS or network issue — see docs/API_KEYS.md.',
    }
  }
}

async function testOpenAi(): Promise<ConnectionTestResult> {
  const config = await getOpenAiConfig()
  if (!config) return { ok: false, message: 'No API key configured.', providerId: 'openai' }
  try {
    const res = await fetch(`${config.baseUrl.replace(/\/+$/, '')}/models`, {
      headers: { authorization: `Bearer ${config.apiKey}` },
    })
    if (!res.ok) {
      const body = await res.json().catch(() => null)
      const msg =
        body && typeof body === 'object' && 'error' in body
          ? (body as { error?: { message?: string } }).error?.message
          : undefined
      return {
        ok: false,
        providerId: 'openai',
        message: `Endpoint rejected the key (HTTP ${res.status})${msg ? ': ' + msg : ''}.`,
      }
    }
    const data = (await res.json()) as { data?: unknown[] }
    return {
      ok: true,
      providerId: 'openai',
      message: `Connected to ${config.baseUrl}. ${data.data?.length ?? 0} models accessible.`,
      modelCount: data.data?.length ?? 0,
    }
  } catch {
    return {
      ok: false,
      providerId: 'openai',
      message:
        'Could not reach the endpoint from this browser. It may block browser (CORS) requests. See docs/API_KEYS.md for browser-friendly options.',
    }
  }
}

export { credentialStore }
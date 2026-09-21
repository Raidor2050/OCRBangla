/** Friendly HTTP helper for the API providers — never leaks raw internals. */

export class ProviderError extends Error {
  kind: 'network' | 'cors' | 'auth' | 'rate' | 'server' | 'abort' | 'parse'
  status?: number

  constructor(kind: ProviderError['kind'], message: string, status?: number) {
    super(message)
    this.kind = kind
    this.status = status
  }
}

function classifyStatus(status: number): ProviderError['kind'] {
  if (status === 401 || status === 403) return 'auth'
  if (status === 429) return 'rate'
  if (status >= 500) return 'server'
  return 'parse'
}

export async function postJson(
  url: string,
  headers: Record<string, string>,
  body: unknown,
  signal?: AbortSignal,
): Promise<{ status: number; data: unknown }> {
  let res: Response
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...headers },
      body: JSON.stringify(body),
      signal,
    })
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new ProviderError('abort', 'Request cancelled.')
    }
    // A TypeError here almost always means a CORS failure on GitHub Pages.
    throw new ProviderError(
      'cors',
      'The request could not be completed from this browser. The service may block browser (CORS) requests, or the network is unreachable. Try a different network, or check docs/API_KEYS.md for providers that work without a backend.',
    )
  }
  let data: unknown = null
  try {
    data = await res.json()
  } catch {
    // EMPTY BODY tolerated
  }
  if (!res.ok) {
    throw new ProviderError(classifyStatus(res.status), extractMessage(data, res.status), res.status)
  }
  return { status: res.status, data }
}

function extractMessage(data: unknown, status: number): string {
  const fallback = `The provider returned HTTP ${status}.`
  if (typeof data !== 'object' || data === null) return fallback
  const d = data as Record<string, unknown>
  const err = d.error
  if (typeof err === 'object' && err !== null && 'message' in err) {
    const m = (err as { message?: unknown }).message
    if (typeof m === 'string' && m.length > 0) return `Provider error: ${m}`
  }
  return fallback
}
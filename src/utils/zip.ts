import { zipSync, strToU8, type Zippable } from 'fflate'
import { safeBaseName } from '../documents/detect'

export interface ZipEntry {
  /** Relative path inside the archive (sanitized). */
  path: string
  content: string | Uint8Array
}

/** Build a ZIP in memory. Rejects dangerous/non-flat paths. */
export function buildZip(entries: ZipEntry[]): Uint8Array {
  const tree: Zippable = {}
  for (const entry of entries) {
    const safePath = sanitizeZipPath(entry.path)
    tree[safePath] =
      typeof entry.content === 'string' ? strToU8(entry.content) : entry.content
  }
  return zipSync(tree, { level: 6 })
}

export function sanitizeZipPath(path: string): string {
  const cleaned = path
    .replace(/\\/g, '/')
    .replace(/^\/+/, '')
    .split('/')
    .map((part) => (part === '.' ? '' : part))
    .filter((part) => part !== '' && part !== '..')
  // Never allow .. traversal or absolute paths to escape the archive root.
  const joined = cleaned.join('/')
  if (joined === '') return 'document.txt'
  return joined
}

export function zipEntriesForDocument(
  fileName: string,
  text: string,
  json: unknown,
  ext = 'txt',
): ZipEntry[] {
  const base = safeBaseName(fileName)
  const entries: ZipEntry[] = [
    {
      path: `${base}${ext === '' ? '' : '.' + ext}`,
      content: text,
    },
  ]
  if (json !== undefined) {
    entries.push({
      path: `${base}.json`,
      content: JSON.stringify(json, null, 2),
    })
  }
  return entries
}

export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 4000)
}

export function downloadText(content: string, fileName: string): void {
  downloadBlob(new Blob([content], { type: 'text/plain;charset=utf-8' }), fileName)
}

export function downloadJson(obj: unknown, fileName: string): void {
  downloadBlob(new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' }), fileName)
}

export function downloadZip(bytes: Uint8Array, fileName: string): void {
  downloadBlob(new Blob([bytes as unknown as BlobPart], { type: 'application/zip' }), fileName)
}
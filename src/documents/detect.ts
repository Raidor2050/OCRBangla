export type FileKind = 'image' | 'pdf' | 'unsupported'

const IMAGE_EXTS = new Set(['png', 'jpg', 'jpeg', 'webp'])
const IMAGE_MIMES = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/jpg',
])

export function extOf(name: string): string {
  const i = name.lastIndexOf('.')
  return i >= 0 ? name.slice(i + 1).toLowerCase() : ''
}

export function detectFileKind(file: File): FileKind {
  const ext = extOf(file.name)
  if (ext === 'pdf' || file.type === 'application/pdf' || file.type === 'application/x-pdf') return 'pdf'
  if (IMAGE_EXTS.has(ext) || IMAGE_MIMES.has(file.type)) return 'image'
  return 'unsupported'
}

export const SUPPORTED_FORMATS = 'PNG, JPG, JPEG, WEBP, PDF'

export function humanSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export const MAX_IMAGE_DIM = 4200

/** Derive a safe base filename without path traversal characters. */
export function safeBaseName(name: string): string {
  const base = name.replace(/[^a-zA-Z0-9._\-\u0980-\u09FF]+/g, '_')
  const stripped = base.replace(/\.(?:png|jpe?g|webp|pdf)$/i, '')
  return stripped === '' ? 'document' : stripped
}

export function extensionFor(file: File): string {
  const ext = extOf(file.name)
  return ext || (detectFileKind(file) === 'pdf' ? 'pdf' : 'png')
}
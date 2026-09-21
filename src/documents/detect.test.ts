import { describe, expect, it } from 'vitest'
import { detectFileKind, extOf, humanSize, safeBaseName } from './detect'

function fakeFile(name: string, type: string): File {
  return new File(['x'], name, { type })
}

describe('detectFileKind', () => {
  it('recognizes images by extension and mime', () => {
    expect(detectFileKind(fakeFile('photo.png', 'image/png'))).toBe('image')
    expect(detectFileKind(fakeFile('photo.WEBP', 'image/webp'))).toBe('image')
    expect(detectFileKind(fakeFile('noext', 'image/jpeg'))).toBe('image')
  })

  it('recognizes pdfs by extension or mime', () => {
    expect(detectFileKind(fakeFile('doc.PDF', 'application/octet-stream'))).toBe('pdf')
    expect(detectFileKind(fakeFile('doc', 'application/pdf'))).toBe('pdf')
  })

  it('rejects unsupported files honestly', () => {
    expect(detectFileKind(fakeFile('notes.txt', 'text/plain'))).toBe('unsupported')
    expect(detectFileKind(fakeFile('scan.tiff', 'image/tiff'))).toBe('unsupported')
    expect(detectFileKind(fakeFile('maybe.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'))).toBe('unsupported')
  })
})

describe('extOf / humanSize / safeBaseName', () => {
  it('extracts lowercase extension', () => {
    expect(extOf('photo.JPG')).toBe('jpg')
    expect(extOf('noext')).toBe('')
  })

  it('humanSize formats bytes', () => {
    expect(humanSize(512)).toBe('512 B')
    expect(humanSize(2048)).toBe('2.0 KB')
    expect(humanSize(3 * 1024 * 1024)).toBe('3.0 MB')
  })

  it('safeBaseName strips path traversal and unsafe characters', () => {
    expect(safeBaseName('../../../etc/passwd')).toMatch(/^[a-zA-Z0-9._-]+$/)
    expect(safeBaseName('সরকারি নথি.scan.jpg')).toContain('নথি')
    expect(safeBaseName('')).toBe('document')
  })
})
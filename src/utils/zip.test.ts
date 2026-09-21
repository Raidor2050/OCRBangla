import { describe, expect, it } from 'vitest'
import { buildZip, sanitizeZipPath, zipEntriesForDocument } from './zip'

describe('sanitizeZipPath', () => {
  it('blocks absolute paths and .. traversal', () => {
    expect(sanitizeZipPath('/etc/passwd')).toBe('etc/passwd')
    expect(sanitizeZipPath('../../secret.txt')).toBe('secret.txt')
    expect(sanitizeZipPath('a/../b.txt')).toBe('a/b.txt') // '..' dropped, siblings kept
    expect(sanitizeZipPath('../b.txt')).toBe('b.txt')
  })

  it('normalizes backslashes and dots', () => {
    expect(sanitizeZipPath('a\\b\\c.txt')).toBe('a/b/c.txt')
    expect(sanitizeZipPath('./name.jpg')).toBe('name.jpg')
  })

  it('never returns empty', () => {
    expect(sanitizeZipPath('../..')).toBe('document.txt')
  })
})

describe('zipEntriesForDocument', () => {
it('produces a txt and optional json entry under the safe base name', () => {
    const entries = zipEntriesForDocument('বিজ্ঞপ্তি.pdf', 'বাংলা টেক্সট', { hello: 1 })
    expect(entries[0].path).toBe('বিজ্ঞপ্তি.txt')
    expect(entries[0].content).toBe('বাংলা টেক্সট')
    expect(entries[1].path).toBe('বিজ্ঞপ্তি.json')
    expect(typeof entries[1].content).toBe('string')
  })
})

describe('buildZip', () => {
  it('produces a valid ZIP signature', () => {
    const bytes = buildZip([{ path: 'a.txt', content: 'hello' }])
    // PK\x03\x04 local file header
    expect([bytes[0], bytes[1]]).toEqual([0x50, 0x4b])
  })
})
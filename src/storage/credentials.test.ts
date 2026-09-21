import { describe, expect, it } from 'vitest'
import { createMemoryCredentialStore, maskSecret } from './credentials'

describe('createMemoryCredentialStore', () => {
  it('round-trips get/set', async () => {
    const store = createMemoryCredentialStore()
    await store.set('gemini', 'abc123')
    expect(await store.get('gemini')).toBe('abc123')
    expect(await store.get('openai')).toBeNull()
  })

  it('deletes and clears', async () => {
    const store = createMemoryCredentialStore()
    await store.set('a', '1')
    await store.set('b', '2')
    await store.delete('a')
    expect(await store.get('a')).toBeNull()
    expect(await store.all()).toEqual({ b: '2' })
    await store.clearAll()
    expect(await store.all()).toEqual({})
  })

  it('all() lists only stored providers', async () => {
    const store = createMemoryCredentialStore()
    await store.set('openai', 'sk-xxx')
    expect(Object.keys(await store.all())).toEqual(['openai'])
  })
})

describe('maskSecret', () => {
  it('masks long secrets keeping prefix and suffix', () => {
    const m = maskSecret('sk-proj-ABCdefGHIjkl')
    expect(m.startsWith('sk-p')).toBe(true)
    expect(m.endsWith('kl')).toBe(true)
    expect(m).toContain('••••••••')
    expect(m.length).toBeLessThan(26)
  })

  it('fully masks very short values', () => {
    expect(maskSecret('xyz')).toBe('••••••')
  })

  it('handles empty input', () => {
    expect(maskSecret('')).toBe('')
  })
})
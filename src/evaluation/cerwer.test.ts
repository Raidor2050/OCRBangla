import { describe, expect, it } from 'vitest'
import {
  evaluate,
  cer,
  wer,
  cerN,
  diffText,
  renderDiffText,
  substitutionCounts,
  graphemes,
} from './cerwer'

describe('graphemes', () => {
  it('splits Bengali conjuncts by grapheme cluster, not code point', () => {
    const g = graphemes('ক্ষ')
    expect(g.join(' ')).toBe('ক্ষ')
    expect(g.length).toBe(1)
  })

  it('keeps vowel signs attached to their consonant cluster', () => {
    expect(graphemes('বাংলা').length).toBeLessThan('বাংলা'.length)
  })
})

describe('CER/WER', () => {
  it('identical strings score zero errors', () => {
    const gt = 'বাংলা ভাষা'
    expect(cer(gt, gt)).toBe(0)
    expect(wer(gt, gt)).toBe(0)
  })

  it('complete mismatch scores cer 1 and wer 1', () => {
    const gt = 'abc'
    expect(cer(gt, 'xyzz')).toBeGreaterThan(1) // short ref allows >1
    expect(wer(gt, '')).toBe(1)
  })

  it('bounded cerN stays within [0,1]', () => {
    for (const [a, b] of [
      ['', ''],
      ['abc', 'xyzz'],
      ['বাংলা', 'দাংলা'],
      ['a b c', 'a b'],
    ]) {
      const v = cerN(a, b)
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThanOrEqual(1)
    }
  })

  it('evaluate returns consistent fields', () => {
    const r = evaluate('বাংলা', 'দাংলা')
    expect(r.gtChars).toBe(2) // grapheme clusters: [বাং, লা]
    expect(r.hypChars).toBe(2)
    expect(r.edits).toBe(1)
    expect(r.wordAccuracy).toBeCloseTo(1 - r.wer)
  })
})

describe('diffText', () => {
  it('marks a substitution and renders it', () => {
    const ops = diffText('বাংলা', 'দাংলা')
    const sub = ops.find((o) => o.type === 'sub')
    expect(sub).toBeDefined()
    expect(sub!.gt).toBe('বাং')
    expect(sub!.hyp).toBe('দাং')
    expect(renderDiffText(ops)).toContain('বাং→দাং')
  })

  it('marks insertions and deletions', () => {
    const ops = diffText('abc', 'abxc')
    expect(ops.some((o) => o.type === 'ins')).toBe(true)
    const deletions = diffText('abc', 'ac')
    expect(deletions.some((o) => o.type === 'del')).toBe(true)
  })
})

describe('substitutionCounts', () => {
  it('counts revisiting substitution pairs', () => {
    const counts = substitutionCounts('বাঙলা বাঙলা', 'বাংলা বাংলা')
    const total = counts.reduce((s, [, , n]) => s + n, 0)
    expect(total).toBeGreaterThan(0)
  })

  it('sorts most frequent first', () => {
    const counts = substitutionCounts('aaabb', 'aacbb')
    for (let i = 1; i < counts.length; i++) {
      expect(counts[i - 1][2]).toBeGreaterThanOrEqual(counts[i][2])
    }
  })
})
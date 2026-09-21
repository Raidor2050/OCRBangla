import { describe, expect, it } from 'vitest'
import {
  postprocessBangla,
  tagIssues,
  detectBanglaRatio,
  BANGLA_SAMPLE,
  BANGLA_SAMPLE_LATIN_MIX,
} from './bangla'

describe('postprocessBangla — Tier A', () => {
  it('composes precomposed nukta characters only where canonical', () => {
    const res = postprocessBangla('\u09A1\u09BC\u09BE\u09B0\u09BE')
    expect(res.text).toBe('\u09DC\u09BE\u09B0\u09BE')
    expect(res.issues).toEqual([])
  })

  it('does not alter plain, already-canonical Bangla', () => {
    const res = postprocessBangla(BANGLA_SAMPLE)
    expect(res.text.includes('বাংলাদেশের')).toBe(true)
  })

  it('normalizes newlines and strips ASCII controls', () => {
    const res = postprocessBangla('a\r\nb\x00c\t')
    expect(res.text).toBe('a\nbc')
  })

  it('collapses runs of spaces on a line and trims trailing spaces', () => {
    const res = postprocessBangla('বাংলা   ভাষা  \nপরের লাইন')
    expect(res.text).toContain('বাংলা ভাষা')
    expect(res.text).not.toContain('\u09BE  \n')
  })

  it('collapses 3+ blank lines to 2', () => {
    const res = postprocessBangla('a\n\n\n\nb')
    expect(res.text).toBe('a\n\nb')
  })

  it('is a pure function with no dictionary rewriting', () => {
    const weird = 'বাংলা ফ্রি দেবরী'
    const res = postprocessBangla(weird)
    // Meaning-preserving: token content unchanged.
    expect(res.text.includes('ফ্রি')).toBe(true)
    expect(res.text.includes('দেবরী')).toBe(true)
  })
})

describe('tagIssues — Tier B', () => {
  it('flags virama at end of text', () => {
    const issues = tagIssues('ক')
    // trailing virama case:
    const trail = tagIssues('সৌরভ্')
    expect(trail.some((i) => i.code === 'virama-trailing')).toBe(true)
    expect(issues.length).toBe(0)
  })

  it('flags virama before a vowel sign as low severity', () => {
    const issues = tagIssues('\u0995\u09CD\u09BF')
    expect(issues.some((i) => i.code === 'virama-before-vowel' && i.severity === 'low')).toBe(true)
  })

  it('flags repeated vowel signs except the legal ো / ৌ pairs', () => {
    const bad = tagIssues('ক\u09BE\u09BF')
    expect(bad.some((i) => i.code === 'vowel-sign-sandwich')).toBe(true)
    const legal = tagIssues('\u09A6\u09C7\u09BE\u09B6') // ো (দে+া)
    expect(legal.some((i) => i.code === 'vowel-sign-sandwich')).toBe(false)
  })

  it('flags nukta on a consonant that cannot take one', () => {
    const issues = tagIssues('\u099A\u09BC')
    expect(issues.some((i) => i.code === 'nukta-misuse')).toBe(true)
  })

  it('flags a lone Latin digit inside a Bangla word', () => {
    const issues = tagIssues('ক3খ')
    expect(issues.some((i) => i.code === 'latin-digit-in-word')).toBe(true)
  })

  it('flags repeated punctuation', () => {
    const issues = tagIssues('এবং.. its fine')
    expect(issues.some((i) => i.code === 'punct-repeat')).toBe(true)
  })

  it('does not flag a clean checked sample', () => {
    const clean = tagIssues('বাংলাদেশের রাজধানী ঢাকা।')
    expect(clean.filter((i) => i.severity === 'high')).toEqual([])
  })
})

describe('detectBanglaRatio', () => {
  it('counts only non-whitespace characters', () => {
    const r = detectBanglaRatio('বাংলা abc')
    expect(r.banglaChars).toBeGreaterThan(0)
    expect(r.latinChars).toBe(3)
    expect(r.total).toBe(r.banglaChars + r.latinChars)
  })

  it('mixed sample has both scripts', () => {
    const r = detectBanglaRatio(BANGLA_SAMPLE_LATIN_MIX)
    expect(r.banglaChars).toBeGreaterThan(r.latinChars)
    expect(r.latinChars).toBeGreaterThan(0)
  })
})
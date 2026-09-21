/**
 * Bangla-aware post-processing.
 *
 * Safe-by-design rules (see docs/research/BANGLA_TEXT_ANALYSIS.md):
 *  - Tier A (auto): canonical-equivalent changes only — NFC, precomposed-nukta
 *    convention, whitespace/newline hygiene, control-char cleanup, ZWJ/ZWNJ
 *    preservation. These never alter the meaning of legitimate text.
 *  - Tier B (detect + tag, never rewrite): orthotactic checks surfaced to the
 *    user as "issues" with position + suggested fix. No auto-correction.
 *  - There is NO Tier C (dictionary/spell/LM rewriting) anywhere in this file.
 */

// Bengali dependent vowel signs (including the 2-part compositions).
const VOWEL_SIGNS = new Set(['\u09BE', '\u09BF', '\u09C0', '\u09C1', '\u09C2', '\u09C3', '\u09C4', '\u09C7', '\u09C8', '\u09CB', '\u09CC', '\u09D7'])
const VIRAMA = '\u09CD'
const NUKTA = '\u09BC'

// Composition exclusions in UAX #15: NFC leaves these un-combined, so we add
// an explicit canonical convention (same rendered glyph).
const NUKTA_COMPOSITIONS: ReadonlyArray<readonly [string, string]> = [
  ['\u09A1\u09BC', '\u09DC'], // ড+় -> ড়
  ['\u09A2\u09BC', '\u09DD'], // ঢ+় -> ঢ়
  ['\u09AF\u09BC', '\u09DF'], // য+় -> য়
]

const BODY_CONSONANTS = /[\u0995-\u09B9]/u

export interface PostprocessOptions {
  /** NFC + nukta composition (always safe). Default true. */
  canonical: boolean
  /** \r\n -> \n and control-character cleanup. Default true. */
  lineEndings: boolean
  /** Collapse runs of 2+ spaces to one; trim line-trailing spaces. Default true. */
  whitespace: boolean
  /** Collapse 3+ blank lines to 2 (preserves paragraph separation). Default true. */
  blankLines: boolean
}

export const DEFAULT_POSTPROCESS: PostprocessOptions = {
  canonical: true,
  lineEndings: true,
  whitespace: true,
  blankLines: true,
}

export interface BanglaIssue {
  index: number
  severity: 'high' | 'low'
  code: string
  message: string
  length: number
}

export interface PostprocessResult {
  text: string
  issues: BanglaIssue[]
}

function normalizeCanonical(text: string): string {
  let out = text.normalize('NFC')
  for (const [from, to] of NUKTA_COMPOSITIONS) {
    out = out.split(from).join(to)
  }
  return out
}

function cleanControls(text: string): string {
  // Remove ASCII controls except \n \t \r; then \r\n -> \n, lone \r -> \n.
  let out = ''
  for (const ch of text) {
    const code = ch.codePointAt(0)!
    if (code < 0x20 && code !== 0x09 && code !== 0x0a && code !== 0x0d) continue
    if (code >= 0x7f && code <= 0x9f) continue
    out += ch
  }
  out = out.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  // Drop soft hyphen etc. (format chars) but keep ZWJ/ZWNJ.
  out = out.replace(/[\u00AD\u200B\u2060\u200E\u200F\u061C]/gu, '')
  return out
}

function cleanWhitespace(text: string): string {
  return text
    .split('\n')
    .map((line) => line.replace(/[ \t]+/g, ' ').replace(/\s+$/, ''))
    .join('\n')
}

function cleanBlankLines(text: string): string {
  return text.replace(/\n{3,}/g, '\n\n')
}

/**
 * Tier A post-processing: deterministic, conservative, canonical-equivalent.
 */
export function postprocessBangla(raw: string, opts: Partial<PostprocessOptions> = {}): PostprocessResult {
  const o: PostprocessOptions = { ...DEFAULT_POSTPROCESS, ...opts }
  let text = raw
  if (o.canonical) text = normalizeCanonical(text)
  if (o.lineEndings) text = cleanControls(text)
  if (o.whitespace) text = cleanWhitespace(text)
  if (o.blankLines) text = cleanBlankLines(text)
  const issues = tagIssues(text)
  return { text, issues }
}

/**
 * Tier B orthotactic checker. Tags suspicious sequences WITHOUT rewriting them.
 * All suggestions are advisory and surfaced only through a review UI.
 */
export function tagIssues(text: string): BanglaIssue[] {
  const issues: BanglaIssue[] = []
  const chars = Array.from(text)
  const n = chars.length
  for (let i = 0; i < n; i++) {
    const ch = chars[i]

    // Virama (্) positioning.
    if (ch === VIRAMA) {
      const prev = i > 0 ? chars[i - 1] : ''
      const next = i < n - 1 ? chars[i + 1] : ''
      if (i === 0) {
        issues.push({ index: 0, severity: 'high', code: 'virama-leading', message: 'Line starts with a virama (্), likely a broken conjunct.', length: 1 })
      }
      if (i === n - 1 || next === '\n' || next === ' ') {
        issues.push({ index: i, severity: 'high', code: 'virama-trailing', message: 'Virama (্) followed by a gap — a conjunct was probably split.', length: 1 })
      }
      if (next && VOWEL_SIGNS.has(next)) {
        issues.push({ index: i, severity: 'low', code: 'virama-before-vowel', message: 'Virama before a vowel sign is not a valid Bangla sequence.', length: 2 })
      }
      if (prev && prev === VIRAMA) {
        issues.push({ index: i, severity: 'low', code: 'virama-repeat', message: 'Repeated virama — broken conjunct pattern.', length: 1 })
      }
    }

    // Vowel sign adjacency (excluding the valid ে+া / ে+ৗ compositions).
    if (VOWEL_SIGNS.has(ch)) {
      const next = i < n - 1 ? chars[i + 1] : ''
      if (next && VOWEL_SIGNS.has(next)) {
        const pair = ch + next
        if (!(pair === '\u09C7\u09BE' || pair === '\u09C7\u09D7')) {
          issues.push({
            index: i,
            severity: 'high',
            code: 'vowel-sign-sandwich',
            message: `Two vowel signs in a row (${pair}) — usually a stray mark from low-resolution OCR.`,
            length: 2,
          })
        }
      }
    }

    // Nukta on a non-nukta-takable consonant.
    if (ch === NUKTA) {
      const prev = i > 0 ? chars[i - 1] : ''
      if (!/[\u09A1\u09A2\u09AF\u0995\u0996\u0997\u099C\u099D]/.test(prev)) {
        issues.push({ index: i, severity: 'low', code: 'nukta-misuse', message: 'Nukta (়) following a character that does not take a nukta.', length: 1 })
      }
    }

    // Latin digit wedged inside a Bangla word.
    if (/[0-9]/.test(ch) && i > 0 && i < n - 1) {
      const prev = chars[i - 1]
      const next = chars[i + 1]
      if (BODY_CONSONANTS.test(prev) && BODY_CONSONANTS.test(next)) {
        issues.push({ index: i, severity: 'low', code: 'latin-digit-in-word', message: 'Latin digit inside a Bangla word — check for ম/ভ/ক misreads.', length: 1 })
      }
    }
  }

  // Punctuation doubles.
  for (let i = 0; i < n - 1; i++) {
    if ((chars[i] === '.' && chars[i + 1] === '.') || (chars[i] === ',' && chars[i + 1] === ',')) {
      issues.push({ index: i, severity: 'low', code: 'punct-repeat', message: 'Repeated ' + chars[i] + ' — stray OCR punctuation.', length: 2 })
    }
  }

  return issues
}

/** Isolate Bengali-only vs mixed-script ranges (informational). */
export function detectBanglaRatio(text: string): { banglaChars: number; latinChars: number; total: number } {
  let bangla = 0
  let latin = 0
  let total = 0
  for (const ch of Array.from(text)) {
    if (/\s/.test(ch)) continue
    total++
    const cp = ch.codePointAt(0)!
    if (cp >= 0x0980 && cp <= 0x09ff) bangla++
    else if (/[A-Za-z0-9]/.test(ch)) latin++
  }
  return { banglaChars: bangla, latinChars: latin, total }
}

export const BANGLA_SAMPLE = `বাংলাদেশের স্বাধীনতা একটি ঐতিহাসিক অর্জন।
২৮ শে অক্টোবর সকাল ৯টায় আমরা একটি গুরুত্বপূর্ণ সভায় উপস্থিত ছিলাম।
যুক্তাক্ষর, কার, মাত্রা — সবই বাংলা লিপির অংশ।
ক্ষ, ষ্ট্র, হ্ন, র্ফ — জটিল যুক্তাক্ষরও সহজভাবে লেখা যায়।`

export const BANGLA_SAMPLE_LATIN_MIX = `বাংলাদেশ is my homeland. আমি সকালে পড়াশোনা করি, evening এ কাজ করি।`
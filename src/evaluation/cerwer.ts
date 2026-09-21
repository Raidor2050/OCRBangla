/**
 * OCR evaluation metrics.
 *
 * CER/WER depend entirely on the *user-supplied ground truth*. These numbers
 * describe "how different is the engine output from this one reference text",
 * not any universal model accuracy. The UI always states this.
 *
 * All distance math operates on grapheme clusters so Bengali conjuncts and
 * vowel signs are not split into half-shape units during counting/diffing.
 */

export function graphemes(s: string): string[] {
  if (typeof Intl !== 'undefined' && 'Segmenter' in Intl) {
    try {
      const seg = new Intl.Segmenter('bn', { granularity: 'grapheme' })
      return Array.from(seg.segment(s), (x) => x.segment)
    } catch {
      /* fall through to code-point split */
    }
  }
  return Array.from(s)
}

/** Levenshtein (edit) distance between two grapheme sequences. */
export function editDistance(a: string, b: string): number {
  const ga = graphemes(a)
  const gb = graphemes(b)
  return editDistanceGraphemes(ga, gb)
}

export function editDistanceGraphemes(a: string[], b: string[]): number {
  const m = a.length
  const n = b.length
  if (m === 0) return n
  if (n === 0) return m
  let prev = new Uint32Array(n + 1)
  let curr = new Uint32Array(n + 1)
  for (let j = 0; j <= n; j++) prev[j] = j
  for (let i = 1; i <= m; i++) {
    curr[0] = i
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost)
    }
    const t = prev
    prev = curr
    curr = t
  }
  return prev[n]
}

/**
 * Character Error Rate as (insertions + deletions + substitutions) / reference
 * length. Can exceed 1.0 for very short references.
 */
export function cer(gt: string, hyp: string): number {
  const m = graphemes(gt).length
  const d = editDistance(gt, hyp)
  return d / Math.max(1, m)
}

/** Word Error Rate over whitespace-separated tokens. */
export function wer(gt: string, hyp: string): number {
  const gtWords = gt.split(/\s+/).filter(Boolean)
  if (gtWords.length === 0) return hyp.trim() === '' ? 0 : 1
  const hypWords = hyp.split(/\s+/).filter(Boolean)
  const d = editDistanceGraphemes(gtWords, hypWords)
  return d / gtWords.length
}

/** Bounded CER: errors / (errors + correct). Always in [0,1]. */
export function cerN(gt: string, hyp: string, dist?: number): number {
  const d = dist ?? editDistance(gt, hyp)
  const gtLen = graphemes(gt).length
  const correct = Math.max(1, gtLen - d)
  return d / (d + correct)
}

/**
 * Detailed char/word-aligned diff ops for review UI.
 * `gt`/`hyp` are undefined for insertions/deletions respectively.
 */
export interface DiffOp {
  type: 'same' | 'sub' | 'del' | 'ins'
  gt?: string
  hyp?: string
}

export function diffText(gt: string, hyp: string): DiffOp[] {
  const ga = graphemes(gt)
  const gb = graphemes(hyp)
  const m = ga.length
  const n = gb.length
  // Full DP table for backtrace.
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0))
  for (let i = 0; i <= m; i++) dp[i][0] = i
  for (let j = 0; j <= n; j++) dp[0][j] = j
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = ga[i - 1] === gb[j - 1] ? 0 : 1
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost)
    }
  }
  const ops: DiffOp[] = []
  let i = m
  let j = n
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && dp[i][j] === dp[i - 1][j - 1] && ga[i - 1] === gb[j - 1]) {
      ops.push({ type: 'same', gt: ga[i - 1], hyp: gb[j - 1] })
      i--
      j--
    } else if (i > 0 && j > 0 && dp[i][j] === dp[i - 1][j - 1] + 1) {
      ops.push({ type: 'sub', gt: ga[i - 1], hyp: gb[j - 1] })
      i--
      j--
    } else if (i > 0 && dp[i][j] === dp[i - 1][j] + 1) {
      ops.push({ type: 'del', gt: ga[i - 1] })
      i--
    } else {
      ops.push({ type: 'ins', hyp: gb[j - 1] })
      j--
    }
  }
  ops.reverse()
  return ops
}

/** Render diff ops as readable text with grapheme-level change markers. */
export function renderDiffText(ops: DiffOp[]): string {
  return ops
    .map((op) => {
      switch (op.type) {
        case 'same':
          return op.gt ?? ''
        case 'sub':
          return `⟨${op.gt}→${op.hyp}⟩`
        case 'del':
          return `[${op.gt}]`
        case 'ins':
          return `+${op.hyp}+`
      }
    })
    .join('')
}

/** Count substitution pairs (ground-truth grapheme -> hypothesis grapheme). */
export function substitutionCounts(gt: string, hyp: string): Array<[string, string, number]> {
  const counts = new Map<string, number>()
  for (const op of diffText(gt, hyp)) {
    if (op.type === 'sub' && op.gt && op.hyp) {
      const key = op.gt + '\u0000' + op.hyp
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }
  }
  return Array.from(counts.entries())
    .map(([key, count]) => {
      const [a, b] = key.split('\u0000')
      return [a, b, count] as [string, string, number]
    })
    .sort((x, y) => y[2] - x[2])
}

export interface EvalResult {
  cer: number
  cerN: number
  wer: number
  wordAccuracy: number
  gtChars: number
  hypChars: number
  edits: number
}

export function evaluate(gt: string, hyp: string): EvalResult {
  const edits = editDistance(gt, hyp)
  const gtChars = graphemes(gt).length
  const hypChars = graphemes(hyp).length
  const c = cer(gt, hyp)
  const w = wer(gt, hyp)
  const cn = cerN(gt, hyp, edits)
  return {
    cer: c,
    cerN: cn,
    wer: w,
    wordAccuracy: 1 - w,
    gtChars,
    hypChars,
    edits,
  }
}

/** Percentage formatting used across the UI, with an honest "vs ground truth" label added by the caller. */
export function fmtPct(x: number): string {
  return `${(x * 100).toFixed(1)}%`
}
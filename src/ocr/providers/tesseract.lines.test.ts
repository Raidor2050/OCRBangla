import { describe, expect, it } from 'vitest'
import type { Box } from '../types'
import { assembleRefinedLines, planLineRefinement, type RefinedLine } from './tesseract'

function line(text: string, bbox?: Box) {
  return { text, bbox }
}

describe('planLineRefinement', () => {
  it('skips lines without a bbox', () => {
    const plan = planLineRefinement(1000, 2000, [line('text')])
    expect(plan[0].reason).toBe('no-bbox')
    expect(plan[0].crop).toBeUndefined()
  })

  it('skips lines that cover most of the page (broken layout)', () => {
    const plan = planLineRefinement(1000, 1000, [line('all', { x: 0, y: 0, w: 1000, h: 600 })])
    expect(plan[0].reason).toBe('too-large')
  })

  it('honors the maxLines cap', () => {
    const lines = Array.from({ length: 3 }, () => line('l', { x: 10, y: 10, w: 100, h: 20 }))
    const plan = planLineRefinement(1000, 1000, lines, 2)
    expect(plan[0].reason).toBe('ok')
    expect(plan[1].reason).toBe('ok')
    expect(plan[2].reason).toBe('max-lines')
  })

  it('pads and clamps a normal line crop to canvas bounds', () => {
    const plan = planLineRefinement(400, 400, [line('l', { x: 0, y: 0, w: 390, h: 20 })])
    const c = plan[0].crop
    expect(plan[0].reason).toBe('ok')
    expect(c).toBeDefined()
    expect(c!.sx).toBe(0)
    expect(c!.sy).toBe(0)
    expect(c!.sw + c!.sx).toBeLessThanOrEqual(400)
    expect(c!.sh + c!.sy).toBeLessThanOrEqual(400)
    expect(c!.sw).toBeGreaterThanOrEqual(8)
    expect(c!.sh).toBeGreaterThanOrEqual(8)
  })

  it('marks degenerate crops as too-small', () => {
    const plan = planLineRefinement(100, 100, [line('l', { x: 50, y: 50, w: 1, h: 1 })])
    expect(plan[0].reason).toBe('too-small')
  })
})

describe('assembleRefinedLines', () => {
  const lines = [
    { text: 'first', confidence: 50, bbox: { x: 0, y: 0, w: 100, h: 20 } as Box, words: [{ text: 'fi' } as never] },
    { text: 'second', confidence: 60, bbox: { x: 0, y: 30, w: 100, h: 20 } as Box, words: [] as never[] },
  ]

  it('replaces refined lines and drops their word splits', () => {
    const refined: Array<RefinedLine | undefined> = [
      { text: 'প্রথম', confidence: 88 },
      undefined,
    ]
    const { text, lines: out, confidences } = assembleRefinedLines(lines, refined)
    expect(text).toBe('প্রথম\nsecond')
    expect(out[0].text).toBe('প্রথম')
    expect(out[0].confidence).toBe(88)
    expect(out[0].words).toBeUndefined()
    expect(out[1].text).toBe('second')
    expect(out[1].words).toHaveLength(0)
    expect(confidences).toEqual([88, 60])
  })

  it('keeps lines untouched when nothing was refined', () => {
    const { text, confidences } = assembleRefinedLines(lines, [])
    expect(text).toBe('first\nsecond')
    expect(confidences).toEqual([50, 60])
  })
})
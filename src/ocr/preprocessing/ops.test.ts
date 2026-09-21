import { describe, expect, it } from 'vitest'
import {
  analyze,
  toGrayscale,
  adjustContrast,
  boxBlur,
  median3,
  sharpen,
  otsuThreshold,
  binarize,
  autoEnhance,
  estimateSkewAngle,
  applyPreprocess,
  type PixImage,
} from './ops'

function solidPixel(r: number, g: number, b: number, a = 255): PixImage {
  const data = new Uint8ClampedArray([r, g, b, a])
  return { width: 1, height: 1, data }
}

function checker(w: number, h: number, light: number, dark: number): PixImage {
  const data = new Uint8ClampedArray(w * h * 4)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const j = (y * w + x) * 4
      const on = (x + y) % 2 === 0
      for (let c = 0; c < 3; c++) data[j + c] = on ? light : dark
      data[j + 3] = 255
    }
  }
  return { width: w, height: h, data }
}

const allBlack: PixImage = { width: 2, height: 2, data: new Uint8ClampedArray([0, 0, 0, 255, 0, 0, 0, 255, 0, 0, 0, 255, 0, 0, 0, 255]) }

describe('analyze', () => {
  it('reports color vs grayscale', () => {
    expect(analyze(solidPixel(220, 30, 30)).isColor).toBe(true)
    expect(analyze(solidPixel(120, 120, 120)).isColor).toBe(false)
  })

  it('estimates noise on checkerboard > flat image', () => {
    const noisy = analyze(checker(8, 8, 255, 0)).noiseEstimate
    const flat = analyze(solidPixel(128, 128, 128)).noiseEstimate
    expect(noisy).toBeGreaterThan(flat)
  })
})

describe('grayscale + contrast', () => {
  it('toGrayscale equalizes RGB channels while keeping alpha', () => {
    const g = toGrayscale(solidPixel(60, 120, 180, 77))
    expect(g.data[0]).toBe(g.data[1])
    expect(g.data[1]).toBe(g.data[2])
    expect(g.data[3]).toBe(77)
  })

  it('adjustContrast clamps to [0,255]', () => {
    const hi = adjustContrast(solidPixel(200, 200, 200), 3)
    expect(hi.data[0]).toBeLessThanOrEqual(255)
    const lo = adjustContrast(solidPixel(30, 30, 30), 0.4)
    expect(lo.data[0]).toBeGreaterThanOrEqual(0)
  })
})

describe('filters preserve geometry', () => {
  for (const fn of [boxBlur, median3, sharpen]) {
    it(`${fn.name} keeps dimensions and alpha`, () => {
      const out = fn(checker(6, 6, 250, 10) as Parameters<typeof fn>[0])
      expect(out.width).toBe(6)
      expect(out.height).toBe(6)
      expect(out.data.length).toBe(6 * 6 * 4)
      expect(out.data[3]).toBe(255)
    })
  }
})

describe('otsuThreshold', () => {
  it('stays inside the observed intensity range', () => {
    const black = 60 // white pixels
    const white = 40 // black pixels
    const luma = new Uint8ClampedArray(black + white)
    luma.fill(245, 0, black)
    luma.fill(8, black)
    const t = otsuThreshold(luma)
    expect(t).toBeGreaterThanOrEqual(8)
    expect(t).toBeLessThanOrEqual(245)
  })

  it('binarize separates a clean bimodal image', () => {
    const img = checker(10, 10, 245, 8)
    const out = binarize(img, 'otsu')
    let black = 0
    let white = 0
    for (let i = 0; i < out.data.length; i += 4) {
      if (out.data[i] === 0) black++
      else white++
    }
    expect(black).toBeGreaterThan(0)
    expect(black).toBeLessThan(100)
    expect(black + white).toBe(100)
  })
})

describe('binarize', () => {
  it('returns pixels at 0 or 255 only', () => {
    const out = binarize(checker(10, 10, 240, 5), 'otsu')
    for (let i = 0; i < out.data.length; i += 4) {
      expect([0, 255]).toContain(out.data[i])
    }
  })
})

describe('autoEnhance', () => {
  it('always reports exactly which steps it applied', () => {
    const res = autoEnhance(checker(8, 8, 250, 10))
    expect(res.applied.length).toBeGreaterThan(0)
    expect(res.applied[0]).toBe('grayscale')
    expect(res.opts.grayscale).toBe(true)
  })
})

describe('estimateSkewAngle', () => {
  it('returns ~0 for horizontal shapes and within [-1,1] otherwise', () => {
    const h = checker(20, 4, 255, 0)
    expect(Math.abs(estimateSkewAngle(h))).toBeLessThanOrEqual(0.5)
    const r = estimateSkewAngle(allBlack as PixImage)
    expect(r).toBeGreaterThanOrEqual(-1)
    expect(r).toBeLessThanOrEqual(1)
  })
})

describe('applyPreprocess', () => {
  it('identity options return structurally valid output', () => {
    const img = checker(4, 4, 240, 20)
    const out = applyPreprocess(img, { grayscale: false, auto: false })
    expect(out.image.width).toBe(4)
    expect(out.image.height).toBe(4)
    expect(out.applied.length).toBeGreaterThan(0)
  })

  it('auto mode reports concrete applied steps', () => {
    const out = applyPreprocess(checker(8, 8, 240, 5), { auto: true })
    expect(out.applied).toContain('grayscale')
  })
})
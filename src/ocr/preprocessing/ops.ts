/**
 * Pure, browser-agnostic image processing operating on RGBA pixel buffers.
 *
 * Anything here is a deterministic function of `{width,height,data}`.
 * Canvas/ImageData only appear at the edges (adapter), so all of this is
 * unit-testable under jsdom without a real canvas.
 *
 * Bangla caution (see docs/research/IMAGE_PREPROCESSING.md): Bengali script has
 * thin vowel marks (ি/ী/ু), the virama (্), conjuncts, and the word matra.
 * Aggressive morphology/smoothing ruins them, so defaults are conservative:
 * upscale gray BEFORE binarizing, light median for denoise, Otsu/adaptive for
 * thresholding, and no erosion/dilation anywhere.
 */

export interface PixImage {
  width: number
  height: number
  data: Uint8ClampedArray
}

export interface AnalyzedImage {
  meanR: number
  meanG: number
  meanB: number
  lumaMean: number
  lumaStd: number
  isColor: boolean
  noiseEstimate: number
}

export function analyze(image: PixImage): AnalyzedImage {
  const { width, height, data } = image
  const n = width * height
  let sumR = 0,
    sumG = 0,
    sumB = 0,
    sumL = 0,
    sumL2 = 0
  let minL = 255,
    maxL = 0
  for (let i = 0; i < n; i++) {
    const j = i * 4
    const r = data[j]
    const g = data[j + 1]
    const b = data[j + 2]
    const l = r * 0.2126 + g * 0.7152 + b * 0.0722
    sumR += r
    sumG += g
    sumB += b
    sumL += l
    sumL2 += l * l
    if (l < minL) minL = l
    if (l > maxL) maxL = l
  }
  const lumaMean = sumL / n
  const lumaStd = Math.sqrt(Math.max(0, sumL2 / n - lumaMean * lumaMean))
  const rMean = sumR / n
  const gMean = sumG / n
  const bMean = sumB / n
  const isColor =
    Math.abs(rMean - gMean) > 4 || Math.abs(gMean - bMean) > 4 || Math.abs(rMean - bMean) > 4

  // Noise estimate: mean absolute difference between each pixel and its left
  // neighbour. Flat, clean areas yield a small value; noisy scans yield large.
  let diff = 0
  let sample = 0
  for (let y = 0; y < height; y++) {
    const row = y * width
    for (let x = 1; x < width; x += 2) {
      const j = (row + x) * 4
      const k = (row + x - 1) * 4
      const la = data[j] * 0.2126 + data[j + 1] * 0.7152 + data[j + 2] * 0.0722
      const lb = data[k] * 0.2126 + data[k + 1] * 0.7152 + data[k + 2] * 0.0722
      diff += Math.abs(la - lb)
      sample++
    }
  }
  const noiseEstimate = diff / Math.max(1, sample)
  return { meanR: rMean, meanG: gMean, meanB: bMean, lumaMean, lumaStd, isColor, noiseEstimate }
}

export function toGrayscale(image: PixImage): PixImage {
  const { width, height, data } = image
  const out = new Uint8ClampedArray(data.length)
  for (let i = 0; i < width * height; i++) {
    const j = i * 4
    const l = data[j] * 0.2126 + data[j + 1] * 0.7152 + data[j + 2] * 0.0722
    out[j] = l
    out[j + 1] = l
    out[j + 2] = l
    out[j + 3] = data[j + 3]
  }
  return { width, height, data: out }
}

export function adjustContrast(image: PixImage, factor: number): PixImage {
  const { width, height, data } = image
  const out = new Uint8ClampedArray(data.length)
  const f = clamp(factor, 0.4, 2.5)
  for (let i = 0; i < width * height; i++) {
    const j = i * 4
    for (let c = 0; c < 3; c++) {
      out[j + c] = clampByte(128 + (data[j + c] - 128) * f)
    }
    out[j + 3] = data[j + 3]
  }
  return { width, height, data: out }
}

export function normalizeChannel(image: PixImage): PixImage {
  // Per-channel histogram stretch — gentle, safe exposure correction.
  const { width, height, data } = image
  const n = width * height
  const min = [255, 255, 255]
  const max = [0, 0, 0]
  for (let i = 0; i < n; i++) {
    const j = i * 4
    for (let c = 0; c < 3; c++) {
      const v = data[j + c]
      if (v < min[c]) min[c] = v
      if (v > max[c]) max[c] = v
    }
  }
  const lo = Math.min(min[0], min[1], min[2])
  const hi = Math.max(max[0], max[1], max[2])
  if (hi - lo < 4) return image
  const scale = 255 / Math.max(1, hi - lo)
  const outData = new Uint8ClampedArray(data.length)
  for (let i = 0; i < n; i++) {
    const j = i * 4
    for (let c = 0; c < 3; c++) {
      outData[j + c] = clampByte((data[j + c] - lo) * scale)
    }
    outData[j + 3] = data[j + 3]
  }
  return { width, height, data: outData }
}

/** Separable box blur (light smoothing). Radius >= 1. */
export function boxBlur(image: PixImage, radius = 1): PixImage {
  const { width, height, data } = image
  const n = width * height
  const luma = new Float64Array(n)
  for (let i = 0; i < n; i++) {
    const j = i * 4
    luma[i] = data[j] * 0.2126 + data[j + 1] * 0.7152 + data[j + 2] * 0.0722
  }
  const tmp = new Float64Array(n)
  const r = Math.max(1, radius)
  horizontalBlur(luma, tmp, width, height, r)
  verticalBlur(tmp, luma, width, height, r)
  const outData = new Uint8ClampedArray(data.length)
  for (let i = 0; i < n; i++) {
    const j = i * 4
    const v = luma[i]
    outData[j] = v
    outData[j + 1] = v
    outData[j + 2] = v
    outData[j + 3] = data[j + 3]
  }
  return { width, height, data: outData }
}

function horizontalBlur(src: Float64Array, dst: Float64Array, w: number, h: number, r: number) {
  const win = 2 * r + 1
  for (let y = 0; y < h; y++) {
    const row = y * w
    let acc = 0
    for (let x = -r; x <= r; x++) acc += src[row + clamp(x, 0, w - 1)]
    for (let x = 0; x < w; x++) {
      dst[row + x] = acc / win
      const add = clamp(x + r + 1, 0, w - 1)
      const sub = clamp(x - r, 0, w - 1)
      acc += src[row + add] - src[row + sub]
    }
  }
}

function verticalBlur(src: Float64Array, dst: Float64Array, w: number, h: number, r: number) {
  const win = 2 * r + 1
  for (let x = 0; x < w; x++) {
    let acc = 0
    for (let y = -r; y <= r; y++) acc += src[clamp(y, 0, h - 1) * w + x]
    for (let y = 0; y < h; y++) {
      dst[y * w + x] = acc / win
      const add = clamp(y + r + 1, 0, h - 1) * w + x
      const sub = clamp(y - r, 0, h - 1) * w + x
      acc += src[add] - src[sub]
    }
  }
}

/** 3x3 median filter — preserves thin strokes far better than blur. */
export function median3(image: PixImage): PixImage {
  const { width, height, data } = image
  const n = width * height
  const luma = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    const j = i * 4
    luma[i] = data[j] * 0.2126 + data[j + 1] * 0.7152 + data[j + 2] * 0.0722
  }
  const outData = new Uint8ClampedArray(data.length)
  const win = new Float32Array(9)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let k = 0
      for (let oy = -1; oy <= 1; oy++) {
        const yy = clamp(y + oy, 0, height - 1)
        for (let ox = -1; ox <= 1; ox++) {
          const xx = clamp(x + ox, 0, width - 1)
          win[k++] = luma[yy * width + xx]
        }
      }
      win.sort()
      const med = win[4]
      const j = (y * width + x) * 4
      outData[j] = med
      outData[j + 1] = med
      outData[j + 2] = med
      outData[j + 3] = data[j + 3]
    }
  }
  return { width, height, data: outData }
}

/** Unsharp mask. */
export function sharpen(image: PixImage, amount = 0.6): PixImage {
  const { width, height, data } = image
  const blurred = boxBlur(image, 1)
  const outData = new Uint8ClampedArray(data.length)
  const n = width * height
  for (let i = 0; i < n; i++) {
    const j = i * 4
    for (let c = 0; c < 3; c++) {
      const sharp = data[j + c] + amount * (data[j + c] - blurred.data[j + c])
      outData[j + c] = clampByte(sharp)
    }
    outData[j + 3] = data[j + 3]
  }
  return { width, height, data: outData }
}

// ---------- Thresholding ----------

export function lumaBuffer(image: PixImage): Uint8ClampedArray {
  const { width, height, data } = image
  const n = width * height
  const out = new Uint8ClampedArray(n)
  for (let i = 0; i < n; i++) {
    const j = i * 4
    out[i] = data[j] * 0.2126 + data[j + 1] * 0.7152 + data[j + 2] * 0.0722
  }
  return out
}

export function otsuThreshold(luma: Uint8ClampedArray): number {
  const hist = new Uint32Array(256)
  for (let i = 0; i < luma.length; i++) hist[luma[i]]++
  const total = luma.length
  let sum = 0
  for (let t = 0; t < 256; t++) sum += t * hist[t]
  let sumB = 0,
    wB = 0,
    maxVariance = -1,
    threshold = 127
  for (let t = 0; t < 256; t++) {
    wB += hist[t]
    if (wB === 0) continue
    const wF = total - wB
    if (wF === 0) break
    sumB += t * hist[t]
    const mB = sumB / wB
    const mF = (sum - sumB) / wF
    const variance = wB * wF * (mB - mF) * (mB - mF)
    if (variance > maxVariance) {
      maxVariance = variance
      threshold = t
    }
  }
  return threshold
}

export type ThresholdMethod = 'none' | 'otsu' | 'adaptive' | 'sauvola'

export function binarize(image: PixImage, method: ThresholdMethod = 'otsu'): PixImage {
  const { width, height } = image
  const luma = lumaBuffer(image)
  const n = width * height
  const out = new Uint8ClampedArray(n * 4)
  let threshold = 127
  if (method === 'otsu') threshold = otsuThreshold(luma)
  for (let i = 0; i < n; i++) {
    const v =
      method === 'none'
        ? luma[i]
        : method === 'sauvola'
          ? adaptiveSauvola(luma, width, height, i) > luma[i]
            ? 0
            : 255
          : method === 'adaptive'
            ? adaptiveBradley(luma, width, height, i) > luma[i]
              ? 0
              : 255
            : luma[i] <= threshold
              ? 0
              : 255
    const j = i * 4
    out[j] = v
    out[j + 1] = v
    out[j + 2] = v
    out[j + 3] = 255
  }
  return { width, height, data: out }
}

// Integral-image helpers for local thresholds.
function integral(luma: Uint8ClampedArray, w: number, h: number): Int32Array {
  const it = new Int32Array((w + 1) * (h + 1))
  for (let y = 0; y < h; y++) {
    let rowSum = 0
    for (let x = 0; x < w; x++) {
      rowSum += luma[y * w + x]
      it[(y + 1) * (w + 1) + (x + 1)] = it[y * (w + 1) + (x + 1)] + rowSum
    }
  }
  return it
}

function integralSum(
  it: Int32Array,
  w: number,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
): number {
  const s = w + 1
  return it[y1 * s + x1] - it[y0 * s + x1] - it[y1 * s + x0] + it[y0 * s + x0]
}

function adaptiveBradley(
  luma: Uint8ClampedArray,
  w: number,
  h: number,
  i: number,
): number {
  const x = i % w
  const y = (i / w) | 0
  const s = Math.max(15, Math.round(w / 8))
  const it = integral(luma, w, h)
  const x0 = Math.max(0, x - s)
  const y0 = Math.max(0, y - s)
  const x1 = Math.min(w, x + s)
  const y1 = Math.min(h, y + s)
  const count = (x1 - x0) * (y1 - y0)
  const sum = integralSum(it, w, x0, y0, x1, y1)
  const t = (1 - 0.15) * (sum / Math.max(1, count))
  return t
}

function adaptiveSauvola(luma: Uint8ClampedArray, w: number, h: number, i: number): number {
  const x = i % w
  const y = (i / w) | 0
  const s = 16
  const it = integral(luma, w, h)
  const x0 = Math.max(0, x - s)
  const y0 = Math.max(0, y - s)
  const x1 = Math.min(w, x + s)
  const y1 = Math.min(h, y + s)
  const count = (x1 - x0) * (y1 - y0)
  const mean = integralSum(it, w, x0, y0, x1, y1) / Math.max(1, count)
  let sqSum = 0
  for (let yy = y0; yy < y1; yy++) {
    for (let xx = x0; xx < x1; xx++) {
      const v = luma[yy * w + xx] - mean
      sqSum += v * v
    }
  }
  const std = Math.sqrt(sqSum / Math.max(1, count))
  return mean * (1 + 0.2 * (std / 128 - 1))
}

// ---------- Skew estimation ----------

/**
 * Estimate page skew from text-line centroids. Downsample first for speed.
 * Returns degrees in [-3, 3]. Conservative: returns 0 when the estimate is
 * unreliable (too few lines, variance too high).
 */
export function estimateSkewAngle(image: PixImage, maxDim = 500): number {
  const { width, height } = image
  const scale = Math.min(1, maxDim / Math.max(width, height))
  const sw = Math.max(1, Math.round(width * scale))
  const sh = Math.max(1, Math.round(height * scale))
  const luma = lumaBuffer(image)
  const packs = new Uint8ClampedArray(sw * sh)
  for (let y = 0; y < sh; y++) {
    const srcY = Math.min(height - 1, Math.round(y / scale))
    for (let x = 0; x < sw; x++) {
      const srcX = Math.min(width - 1, Math.round(x / scale))
      packs[y * sw + x] = luma[srcY * width + srcX]
    }
  }
  const thr = otsuThreshold(packs)
  const rows: { cx: number }[] = []
  for (let y = 0; y < sh; y++) {
    let sum = 0
    let count = 0
    for (let x = 0; x < sw; x++) {
      if (packs[y * sw + x] < thr) {
        sum += x
        count++
      }
    }
    if (count > Math.max(3, sw * 0.02)) rows.push({ cx: sum / count })
  }
  if (rows.length < 8) return 0

  // Fit cx = a + b*y (screen-y) via least squares; angle from the slope.
  const n = rows.length
  let ySum = 0
  for (let i = 0; i < n; i++) ySum += i
  const yMean = ySum / n
  let xMean = 0
  for (const r of rows) xMean += r.cx
  xMean /= n
  let num = 0
  let den = 0
  for (let i = 0; i < n; i++) {
    const dy = i - yMean
    const dx = rows[i].cx - xMean
    num += dx * dy
    den += dy * dy
  }
  if (Math.abs(den) < 1e-6) return 0
  const slope = num / den
  const residualVar =
    rows.reduce((acc, r, i) => {
      const d = r.cx - (xMean + slope * (i - yMean))
      return acc + d * d
    }, 0) / n
  // Unreliable when centroids are scattered; better no rotation than a bad one.
  if (residualVar > (sw * 0.08) ** 2) return 0
  const angle = (Math.atan(slope) * 180) / Math.PI
  return clamp(angle, -3, 3)
}

// ---------- Auto pipeline ----------

export interface AutoResult {
  image: PixImage
  applied: string[]
  opts: {
    grayscale: boolean
    contrast: number
    denoise: boolean
    sharpen: boolean
    threshold: Exclude<ThresholdMethod, 'none' | 'sauvola'> | 'none'
    scale: number
  }
}

/**
 * Deterministic heuristic "Auto enhance" tuned conservatively for Bangla script.
 * Returns the transformed image plus a human-readable list of applied steps so
 * the UI can report *exactly* what it did (no fake preprocessing).
 */
export function autoEnhance(image: PixImage, targetMinDim = 1200): AutoResult {
  const a = analyze(image)
  let cur = toGrayscale(image)
  const applied: string[] = ['grayscale']
  const minDim = Math.min(cur.width, cur.height)
  let scale = 1
  if (minDim < targetMinDim) {
    scale = Math.min(2, targetMinDim / minDim)
  }
  let contrast = 1
  if (a.lumaStd < 42) {
    contrast = 1.35
    applied.push('contrast boost')
  } else if (a.lumaStd < 60) {
    contrast = 1.15
    applied.push('light contrast')
  }
  let denoise = false
  if (a.noiseEstimate > 26 && a.lumaStd > 14) {
    denoise = true
    applied.push('denoise (median 3)')
  }
  let threshold: AutoResult['opts']['threshold'] = 'none'
  if (a.lumaStd < 20) {
    threshold = 'adaptive'
    applied.push('adaptive threshold')
  }
  if (denoise) cur = median3(cur)
  if (contrast !== 1) cur = adjustContrast(cur, contrast)
  if (threshold !== 'none') cur = binarize(cur, threshold)
  return { image: cur, applied, opts: { grayscale: true, contrast, denoise, sharpen: false, threshold, scale } }
}

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v
}

function clampByte(v: number): number {
  return v < 0 ? 0 : v > 255 ? 255 : Math.round(v)
}

export function identity(image: PixImage): PixImage {
  return image
}

// ---------- Full pipeline (shared by worker + main-thread fallback) ----------

export interface ApplyOptions {
  auto?: boolean
  grayscale?: boolean
  contrast?: number
  sharpen?: boolean
  denoise?: boolean
  threshold?: ThresholdMethod
  deskew?: boolean
}

export interface ApplyResult {
  image: PixImage
  applied: string[]
  skewAngle?: number
}

/** Runs the deterministic op chain. Returns what it actually applied. */
export function applyPreprocess(image: PixImage, opts: ApplyOptions): ApplyResult {
  let img = image
  const applied: string[] = []
  let skewAngle: number | undefined

  if (opts.auto) {
    const result = autoEnhance(img)
    img = result.image
    applied.push(...result.applied)
  } else {
    if (opts.grayscale && !isGrayish(img)) {
      img = toGrayscale(img)
      applied.push('grayscale')
    }
    if (opts.denoise) {
      img = median3(img)
      applied.push('denoise (median 3)')
    }
    if (opts.contrast && opts.contrast !== 1) {
      img = adjustContrast(img, opts.contrast)
      applied.push(`contrast ${opts.contrast.toFixed(2)}`)
    }
    if (opts.threshold && opts.threshold !== 'none') {
      img = binarize(img, opts.threshold)
      applied.push(`threshold: ${opts.threshold}`)
    }
    if (opts.sharpen) {
      img = sharpen(img)
      applied.push('sharpen (unsharp)')
    }
    if (img === image && !opts.deskew) {
      const stretched = normalizeChannel(img)
      if (stretched !== img) {
        applied.push('tone normalize')
        img = stretched
      }
    }
  }

  if (opts.deskew) skewAngle = estimateSkewAngle(img)
  if (applied.length === 0) applied.push('none')
  return { image: img, applied, skewAngle }
}

function isGrayish(img: PixImage): boolean {
  const step = Math.max(4, Math.floor(img.width / 40))
  for (let y = 0; y < img.height; y += step) {
    for (let x = 0; x < img.width; x += step) {
      const j = (y * img.width + x) * 4
      const r = img.data[j]
      const g = img.data[j + 1]
      const b = img.data[j + 2]
      if (Math.abs(r - g) > 8 || Math.abs(g - b) > 8 || Math.abs(r - b) > 8) return false
    }
  }
  return true
}
import { describe, it, expect } from 'vitest'
import { computeAdaptiveValuePreview, type PreviewObservation, PREVIEW_MAX_ADJUSTMENT } from '@/lib/trade-market/redraftAdaptiveValuePreview'

const now = new Date().toISOString()
const obs = (terminal: PreviewObservation['terminal'], observedValue: number | null = 4000, confidenceScore = 100, at = now): PreviewObservation => ({ terminal, observedValue, confidenceScore, createdAt: at })

describe('computeAdaptiveValuePreview', () => {
  it('returns insufficient + no adjustment under the minimum sample', () => {
    const r = computeAdaptiveValuePreview({ playerId: 'p1', observations: [obs('accepted'), obs('accepted')] })
    expect(r.sampleSize).toBe(2)
    expect(r.direction).toBe('insufficient')
    expect(r.adjustmentPercent).toBe(0)
    expect(r.marketPreviewValue).toBe(r.baseValue)
    expect(r.reasons.join(' ')).toMatch(/Not enough AllFantasy trade history/)
  })

  it('returns insufficient when no observation carries a value (no fabrication)', () => {
    const r = computeAdaptiveValuePreview({ playerId: 'p1', observations: [obs('accepted', null), obs('accepted', null), obs('accepted', null)] })
    expect(r.baseValue).toBeNull()
    expect(r.direction).toBe('insufficient')
    expect(r.adjustmentPercent).toBe(0)
  })

  it('raises preview value when accepted trades dominate', () => {
    const r = computeAdaptiveValuePreview({ playerId: 'p1', observations: [obs('accepted'), obs('accepted'), obs('accepted'), obs('accepted')] })
    expect(r.direction).toBe('rising')
    expect(r.adjustmentPercent).toBeGreaterThan(0)
    expect(r.marketPreviewValue).toBeGreaterThan(r.baseValue as number)
    expect(r.baseValue).toBe(4000)
  })

  it('vetoes/rejections drag confidence and the signal down', () => {
    const accepted = computeAdaptiveValuePreview({ playerId: 'p1', observations: [obs('accepted'), obs('accepted'), obs('accepted'), obs('accepted')] })
    const dragged = computeAdaptiveValuePreview({ playerId: 'p1', observations: [obs('accepted'), obs('accepted'), obs('vetoed'), obs('rejected')] })
    expect(dragged.confidence).toBeLessThan(accepted.confidence)
    expect(dragged.adjustmentPercent).toBeLessThan(accepted.adjustmentPercent)
  })

  it('caps adjustment at ±5% for a small (3–9) sample', () => {
    const obsList = Array.from({ length: 9 }, () => obs('accepted'))
    const r = computeAdaptiveValuePreview({ playerId: 'p1', observations: obsList })
    expect(r.sampleSize).toBe(9)
    expect(Math.abs(r.adjustmentPercent)).toBeLessThanOrEqual(5)
  })

  it('never exceeds the ±15% hard cap even with a huge sample', () => {
    const obsList = Array.from({ length: 60 }, () => obs('accepted'))
    const r = computeAdaptiveValuePreview({ playerId: 'p1', observations: obsList })
    expect(Math.abs(r.adjustmentPercent)).toBeLessThanOrEqual(PREVIEW_MAX_ADJUSTMENT)
  })

  it('low confidence prevents any adjustment', () => {
    // Many vetoes drive confidence below the floor → no adjustment, held at base.
    const obsList = [obs('vetoed'), obs('vetoed'), obs('vetoed'), obs('vetoed')]
    const r = computeAdaptiveValuePreview({ playerId: 'p1', observations: obsList })
    expect(r.confidence).toBeLessThan(40)
    expect(r.adjustmentPercent).toBe(0)
    expect(r.marketPreviewValue).toBe(r.baseValue)
  })

  it('contains no PII', () => {
    const r = computeAdaptiveValuePreview({ playerId: 'p1', playerName: 'Player One', observations: [obs('accepted'), obs('accepted'), obs('accepted')] })
    const json = JSON.stringify(r).toLowerCase()
    for (const banned of ['email', 'token', 'session', 'password', '@', 'authorization']) {
      expect(json.includes(banned)).toBe(false)
    }
  })
})

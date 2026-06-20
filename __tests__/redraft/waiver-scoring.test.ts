import { describe, it, expect } from 'vitest'
import {
  valueScoreFor,
  recommendationScore,
  computeConfidence,
  tierFromScore,
  faabBandForTier,
  faabBidFromBand,
  priorityGuidanceForTier,
  isScarcePosition,
  scarcityWeight,
} from '@/lib/redraft-war-room/redraftWaiverScoring'

describe('redraft waiver scoring (Step 3D)', () => {
  describe('valueScoreFor', () => {
    it('normalizes projection points to a position-aware 0-100', () => {
      expect(valueScoreFor({ value: 22, source: 'projection', position: 'RB', adp: null })).toBe(100) // at cap
      expect(valueScoreFor({ value: 11, source: 'projection', position: 'RB', adp: null })).toBe(50)
      expect(valueScoreFor({ value: 14, source: 'projection', position: 'TE', adp: null })).toBe(100) // TE cap lower
    })
    it('derives a score from ADP when only ADP exists (lower ADP = higher)', () => {
      const a = valueScoreFor({ value: null, source: 'adp', position: 'WR', adp: 1 })
      const b = valueScoreFor({ value: null, source: 'adp', position: 'WR', adp: 200 })
      expect(a).toBeGreaterThan(b)
      expect(a).toBeGreaterThan(90)
    })
    it('returns 0 when there is no value signal', () => {
      expect(valueScoreFor({ value: null, source: 'none', position: 'WR', adp: null })).toBe(0)
    })
  })

  describe('recommendationScore', () => {
    it('boosts for a critical need and scarce position', () => {
      const base = recommendationScore({ valueScore: 60, position: 'WR', needSeverity: null, depthWeakness: false, injuryReplacement: false, byeCoverage: false })
      const needy = recommendationScore({ valueScore: 60, position: 'RB', needSeverity: 'critical', depthWeakness: false, injuryReplacement: false, byeCoverage: false })
      expect(needy).toBeGreaterThan(base)
    })
    it('adds injury-replacement and bye-coverage boosts', () => {
      const plain = recommendationScore({ valueScore: 50, position: 'WR', needSeverity: null, depthWeakness: false, injuryReplacement: false, byeCoverage: false })
      const boosted = recommendationScore({ valueScore: 50, position: 'WR', needSeverity: null, depthWeakness: false, injuryReplacement: true, byeCoverage: true })
      expect(boosted).toBe(plain + 13)
    })
    it('clamps to 0-100', () => {
      expect(recommendationScore({ valueScore: 100, position: 'RB', needSeverity: 'critical', depthWeakness: false, injuryReplacement: true, byeCoverage: true })).toBeLessThanOrEqual(100)
    })
  })

  describe('computeConfidence', () => {
    it('is high for high-confidence projections, low for no signal', () => {
      expect(computeConfidence({ source: 'projection', projectionConfidenceLevel: 'high', limitedData: false, injured: false }).level).toBe('high')
      expect(computeConfidence({ source: 'none', projectionConfidenceLevel: null, limitedData: false, injured: false }).level).toBe('low')
    })
    it('reduces for limited data (NCAAF) and injury', () => {
      const full = computeConfidence({ source: 'projection', projectionConfidenceLevel: 'high', limitedData: false, injured: false }).score
      const limited = computeConfidence({ source: 'projection', projectionConfidenceLevel: 'high', limitedData: true, injured: false }).score
      const injured = computeConfidence({ source: 'projection', projectionConfidenceLevel: 'high', limitedData: false, injured: true }).score
      expect(limited).toBe(full - 20)
      expect(injured).toBe(full - 10)
    })
  })

  describe('tierFromScore', () => {
    it('maps score bands to tiers', () => {
      expect(tierFromScore(85, 'high')).toBe('Must Add')
      expect(tierFromScore(70, 'high')).toBe('Strong Add')
      expect(tierFromScore(50, 'high')).toBe('Worth Considering')
      expect(tierFromScore(30, 'high')).toBe('Watch List')
      expect(tierFromScore(10, 'high')).toBe('Low Priority')
    })
    it('caps Must/Strong Add at Worth Considering when confidence is low', () => {
      expect(tierFromScore(90, 'low')).toBe('Worth Considering')
      expect(tierFromScore(70, 'low')).toBe('Worth Considering')
      expect(tierFromScore(30, 'low')).toBe('Watch List')
    })
  })

  describe('FAAB bands + priority guidance', () => {
    it('maps tier to a FAAB band and bumps for critical+scarce', () => {
      expect(faabBandForTier('Must Add', { criticalNeed: false, scarce: false })).toBe('15%+')
      expect(faabBandForTier('Worth Considering', { criticalNeed: false, scarce: false })).toBe('5–10%')
      expect(faabBandForTier('Worth Considering', { criticalNeed: true, scarce: true })).toBe('10–15%') // bumped one band
      expect(faabBandForTier('Low Priority', { criticalNeed: false, scarce: false })).toBe('1–3%')
    })
    it('derives a numeric bid from the band midpoint × budget', () => {
      expect(faabBidFromBand('15%+', 100)).toBe(18)
      expect(faabBidFromBand('1–3%', 100)).toBe(2)
      expect(faabBidFromBand('10–15%', null)).toBeNull()
    })
    it('recommends priority urgency by tier/need', () => {
      expect(priorityGuidanceForTier('Must Add', false)).toBe('use_now')
      expect(priorityGuidanceForTier('Watch List', true)).toBe('use_now') // critical need
      expect(priorityGuidanceForTier('Strong Add', false)).toBe('medium')
      expect(priorityGuidanceForTier('Watch List', false)).toBe('hold')
    })
  })

  it('scarcity: RB/TE are scarce, WR is not', () => {
    expect(isScarcePosition('RB')).toBe(true)
    expect(isScarcePosition('TE')).toBe(true)
    expect(isScarcePosition('WR')).toBe(false)
    expect(scarcityWeight('RB')).toBeGreaterThan(scarcityWeight('WR'))
  })
})

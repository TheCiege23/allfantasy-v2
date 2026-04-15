import { describe, expect, it } from 'vitest'
import { normalizeStrategyMode, resolveRecommendedSideFromScore } from '@/lib/ai-player-comparison/strategy-weights'

describe('ai-player-comparison strategy', () => {
  it('normalizes aliases', () => {
    expect(normalizeStrategyMode('upside')).toBe('need_upside')
    expect(normalizeStrategyMode('dog')).toBe('underdog')
    expect(normalizeStrategyMode('')).toBe('balanced')
  })

  it('resolves sides from weighted score', () => {
    expect(resolveRecommendedSideFromScore(0.1)).toBe('playerA')
    expect(resolveRecommendedSideFromScore(-0.1)).toBe('playerB')
    expect(resolveRecommendedSideFromScore(0)).toBe('tie')
  })
})

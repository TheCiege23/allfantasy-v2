import { describe, expect, it } from 'vitest'
import {
  applyLearningEvent,
  buildOptimizerProfileInput,
  decayConfidenceForIdle,
  traitMapFromRows,
  traitsMapToStoredArray,
} from '@/lib/lineup-preference-learning/engine'
import { LINEUP_PREFERENCE_TRAIT_IDS } from '@/lib/lineup-preference-learning/trait-ids'

describe('lineup preference learning engine', () => {
  it('defines nine primary trait ids', () => {
    expect(LINEUP_PREFERENCE_TRAIT_IDS).toHaveLength(9)
    expect(LINEUP_PREFERENCE_TRAIT_IDS).toContain('prefers_safe_floor')
    expect(LINEUP_PREFERENCE_TRAIT_IDS).toContain('prefers_same_position_emergency')
  })

  it('reinforces traits on ai_lineup_accepted close call', () => {
    const map = new Map()
    applyLearningEvent(
      map,
      'ai_lineup_accepted',
      { closeCall: true, reinforceTraits: ['prefers_high_ceiling'], edgeMagnitude: 2 },
      new Date()
    )
    const traits = traitsMapToStoredArray(map)
    const hi = traits.find((t) => t.traitId === 'prefers_high_ceiling')
    expect(hi?.confidence).toBeGreaterThan(0)
    expect(hi?.sampleSize).toBeGreaterThan(0)
  })

  it('maps traits to optimizer profile input with capped preference weight', () => {
    const map = new Map()
    applyLearningEvent(map, 'bench_promoted', { position: 'WR', archetype: 'streamer' }, new Date())
    const traits = traitsMapToStoredArray(map)
    const input = buildOptimizerProfileInput(traits)
    expect(input.preferenceWeight).toBeLessThanOrEqual(0.45)
    expect(input.prefersMatchupChasing).toBeGreaterThan(0)
  })

  it('decays confidence when idle', () => {
    const last = new Date('2026-01-01T00:00:00Z')
    const now = new Date('2026-02-01T00:00:00Z')
    const next = decayConfidenceForIdle(0.8, last, last, now)
    expect(next).toBeLessThan(0.8)
  })

  it('loads trait map from prisma-shaped rows', () => {
    const map = traitMapFromRows([
      {
        traitId: 'prefers_consistency',
        confidence: 0.4,
        sampleSize: 3,
        lastReinforcedAt: new Date(),
        examples: [{ summary: 'test', at: '2026-01-01' }],
        metadata: null,
        createdAt: new Date(),
      },
    ])
    expect(map.get('prefers_consistency')?.confidence).toBe(0.4)
  })
})

import { describe, expect, it } from 'vitest'

import {
  applyThresholdBonuses,
  extractThresholdBonuses,
  filterStatsForIdpPosition,
  getMatchupTiebreakerMode,
} from '@/lib/scoring-engine/scoringSettingsResolved'

describe('scoringSettingsResolved', () => {
  it('extracts threshold bonuses from settings', () => {
    const b = extractThresholdBonuses({
      rules: {
        thresholdBonuses: [{ statKey: 'pass_yd', threshold: 300, bonusPoints: 3 }],
      },
    } as Record<string, unknown>)
    expect(b[0]?.threshold).toBe(300)
    expect(b[0]?.bonusPoints).toBe(3)
  })

  it('applyThresholdBonuses adds bonus when threshold met', () => {
    const pts = applyThresholdBonuses(
      10,
      { pass_yd: 310 },
      [{ statKey: 'pass_yd', threshold: 300, bonusPoints: 3 }],
    )
    expect(pts).toBe(13)
  })

  it('filters IDP stats when allowlist set', () => {
    const out = filterStatsForIdpPosition(
      { tackle: 5, pass_yd: 300 },
      'LB',
      {
        rules: { idpStatAllowlist: ['tackle'] },
      } as Record<string, unknown>,
    )
    expect(out.pass_yd).toBeUndefined()
    expect(out.tackle).toBe(5)
  })

  it('reads matchup tiebreaker', () => {
    expect(getMatchupTiebreakerMode({ rules: { matchupTiebreaker: 'bench_points' } } as Record<string, unknown>)).toBe(
      'bench_points',
    )
  })
})

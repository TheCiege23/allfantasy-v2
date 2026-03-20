import { describe, expect, it } from 'vitest'
import {
  getDefaultScoringTemplate,
  resolveDefaultScoringTemplate,
} from '@/lib/scoring-defaults/ScoringDefaultsRegistry'
import {
  computeFantasyPoints,
  computeFantasyPointsWithBreakdown,
} from '@/lib/scoring-defaults/FantasyPointCalculator'
import { mergeRulesWithOverrides } from '@/lib/scoring-defaults/ScoringOverrideService'

describe('Default Scoring Settings by Sport', () => {
  it('provides scoring templates for required sports with expected stat keys', () => {
    const nfl = getDefaultScoringTemplate('NFL', 'PPR')
    expect(nfl.sportType).toBe('NFL')
    expect(nfl.rules.some((r) => r.statKey === 'passing_yards')).toBe(true)
    expect(nfl.rules.some((r) => r.statKey === 'receptions')).toBe(true)

    const nba = getDefaultScoringTemplate('NBA', 'points')
    expect(nba.rules.map((r) => r.statKey)).toEqual(
      expect.arrayContaining([
        'points',
        'rebounds',
        'assists',
        'steals',
        'blocks',
        'turnovers',
        'three_pointers_made',
        'double_double',
        'triple_double',
      ])
    )

    const mlb = getDefaultScoringTemplate('MLB', 'standard')
    expect(mlb.rules.map((r) => r.statKey)).toEqual(
      expect.arrayContaining([
        'single',
        'double',
        'triple',
        'home_run',
        'rbi',
        'run',
        'walk',
        'stolen_base',
        'innings_pitched',
        'strikeouts_pitched',
        'earned_runs',
        'save',
        'hold',
      ])
    )

    const nhl = getDefaultScoringTemplate('NHL', 'standard')
    expect(nhl.rules.map((r) => r.statKey)).toEqual(
      expect.arrayContaining([
        'goal',
        'assist',
        'shot_on_goal',
        'blocked_shot',
        'power_play_point',
        'save',
        'win',
        'shutout',
      ])
    )

    const ncaaf = getDefaultScoringTemplate('NCAAF', 'PPR')
    expect(ncaaf.rules.some((r) => r.statKey === 'passing_td')).toBe(true)

    const ncaab = getDefaultScoringTemplate('NCAAB', 'points')
    expect(ncaab.rules.some((r) => r.statKey === 'points')).toBe(true)

    const soccer = getDefaultScoringTemplate('SOCCER', 'standard')
    expect(soccer.rules.map((r) => r.statKey)).toEqual(
      expect.arrayContaining([
        'goal',
        'assist',
        'shot_on_target',
        'shot',
        'key_pass',
        'clean_sheet',
        'goal_allowed',
        'save',
        'penalty_save',
        'penalty_miss',
        'yellow_card',
        'red_card',
        'own_goal',
        'minutes_played',
      ])
    )
  })

  it('resolves template by league settings for NFL IDP presets and sport defaults', () => {
    const idpBalanced = resolveDefaultScoringTemplate('NFL', {
      leagueSettings: { leagueVariant: 'DYNASTY_IDP', idpScoringPreset: 'balanced' },
    })
    expect(idpBalanced.formatType).toBe('IDP-balanced')
    expect(idpBalanced.rules.some((r) => r.statKey === 'idp_sack')).toBe(true)
    expect(idpBalanced.rules.map((r) => r.statKey)).toEqual(
      expect.arrayContaining([
        'idp_solo_tackle',
        'idp_assist_tackle',
        'idp_tackle_for_loss',
        'idp_qb_hit',
        'idp_sack',
        'idp_interception',
        'idp_pass_defended',
        'idp_forced_fumble',
        'idp_fumble_recovery',
        'idp_defensive_touchdown',
        'idp_safety',
      ])
    )

    const idpBigPlay = resolveDefaultScoringTemplate('NFL', {
      leagueSettings: { leagueVariant: 'IDP', idpScoringPreset: 'big_play_heavy' },
    })
    expect(idpBigPlay.formatType).toBe('IDP-big_play_heavy')

    const nbaDefault = resolveDefaultScoringTemplate('NBA', { leagueSettings: null })
    expect(nbaDefault.formatType).toBe('points')

    const ncaafDefault = resolveDefaultScoringTemplate('NCAAF', { leagueSettings: null })
    expect(ncaafDefault.formatType).toBe('PPR')
  })

  it('computes fantasy points and per-stat breakdown from rules', () => {
    const rules = getDefaultScoringTemplate('NBA', 'points').rules
    const stats = {
      points: 25,
      rebounds: 10,
      assists: 8,
      steals: 2,
      blocks: 1,
      turnovers: 3,
      three_pointers_made: 4,
      double_double: 1,
      triple_double: 0,
    }

    const total = computeFantasyPoints(stats, rules)
    expect(total).toBeGreaterThan(0)

    const withBreakdown = computeFantasyPointsWithBreakdown(stats, rules)
    expect(withBreakdown.total).toBe(total)
    expect(withBreakdown.breakdown.points).toBe(25)
    expect(withBreakdown.breakdown.turnovers).toBeLessThan(0)
  })

  it('merges league scoring overrides over template rules', () => {
    const base = getDefaultScoringTemplate('NFL', 'PPR').rules
    const merged = mergeRulesWithOverrides(base, [
      { statKey: 'passing_td', pointsValue: 6, enabled: true },
      { statKey: 'interception', pointsValue: -1, enabled: true },
      { statKey: 'receptions', pointsValue: 0.5, enabled: true },
    ])

    const byKey = new Map(merged.map((r) => [r.statKey, r]))
    expect(byKey.get('passing_td')?.pointsValue).toBe(6)
    expect(byKey.get('interception')?.pointsValue).toBe(-1)
    expect(byKey.get('receptions')?.pointsValue).toBe(0.5)
  })
})

import { describe, expect, it } from 'vitest'
import {
  getDefaultScoringTemplate,
  resolveDefaultScoringTemplate,
  getScoringContextForAI,
  getSupportedScoringFormats,
  SCORING_DEFAULTS_REGISTRY_VERSION,
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

  it('exports a registry version string', () => {
    expect(typeof SCORING_DEFAULTS_REGISTRY_VERSION).toBe('string')
    expect(SCORING_DEFAULTS_REGISTRY_VERSION.length).toBeGreaterThan(0)
  })

  it('returns correct point values for NFL PPR, Half PPR, and Standard templates', () => {
    const ppr = getDefaultScoringTemplate('NFL', 'PPR')
    const halfPpr = getDefaultScoringTemplate('NFL', 'half_ppr')
    const standard = getDefaultScoringTemplate('NFL', 'standard')

    const byKey = (rules: typeof ppr.rules) => new Map(rules.map((r) => [r.statKey, r]))

    const pprMap = byKey(ppr.rules)
    expect(pprMap.get('passing_td')?.pointsValue).toBe(4)
    expect(pprMap.get('receptions')?.pointsValue).toBe(1)
    expect(pprMap.get('rushing_td')?.pointsValue).toBe(6)
    expect(pprMap.get('receiving_td')?.pointsValue).toBe(6)
    expect(pprMap.get('interception')?.pointsValue).toBe(-2)
    expect(pprMap.get('fumble_lost')?.pointsValue).toBe(-2)
    expect(pprMap.get('fg_50_plus')?.pointsValue).toBe(5)
    expect(pprMap.get('dst_points_allowed_0')?.pointsValue).toBe(10)

    expect(byKey(halfPpr.rules).get('receptions')?.pointsValue).toBe(0.5)
    expect(byKey(standard.rules).get('receptions')?.pointsValue).toBe(0)
  })

  it('returns correct point values for NHL skater and goalie stats', () => {
    const nhl = getDefaultScoringTemplate('NHL', 'standard')
    const byKey = new Map(nhl.rules.map((r) => [r.statKey, r]))

    expect(byKey.get('goal')?.pointsValue).toBe(3)
    expect(byKey.get('assist')?.pointsValue).toBe(2)
    expect(byKey.get('shot_on_goal')?.pointsValue).toBe(0.5)
    expect(byKey.get('blocked_shot')?.pointsValue).toBe(0.5)
    expect(byKey.get('power_play_point')?.pointsValue).toBe(1)
    expect(byKey.get('short_handed_point')?.pointsValue).toBe(2)
    expect(byKey.get('save')?.pointsValue).toBe(0.6)
    expect(byKey.get('goal_allowed')?.pointsValue).toBe(-3)
    expect(byKey.get('win')?.pointsValue).toBe(5)
    expect(byKey.get('shutout')?.pointsValue).toBe(3)
  })

  it('returns correct point values for MLB batter and pitcher stats', () => {
    const mlb = getDefaultScoringTemplate('MLB', 'standard')
    const byKey = new Map(mlb.rules.map((r) => [r.statKey, r]))

    // Batter
    expect(byKey.get('single')?.pointsValue).toBe(1)
    expect(byKey.get('double')?.pointsValue).toBe(2)
    expect(byKey.get('triple')?.pointsValue).toBe(3)
    expect(byKey.get('home_run')?.pointsValue).toBe(4)
    expect(byKey.get('rbi')?.pointsValue).toBe(1)
    expect(byKey.get('run')?.pointsValue).toBe(1)
    expect(byKey.get('walk')?.pointsValue).toBe(1)
    expect(byKey.get('stolen_base')?.pointsValue).toBe(2)
    expect(byKey.get('strikeout')?.pointsValue).toBe(-0.5) // batter K

    // Pitcher
    expect(byKey.get('innings_pitched')?.pointsValue).toBe(3)
    expect(byKey.get('earned_runs')?.pointsValue).toBe(-2)
    expect(byKey.get('strikeouts_pitched')?.pointsValue).toBe(1)
    expect(byKey.get('save')?.pointsValue).toBe(5)
    expect(byKey.get('hold')?.pointsValue).toBe(4)
    expect(byKey.get('win')?.pointsValue).toBe(5)
    expect(byKey.get('quality_start')?.pointsValue).toBe(4)
  })

  it('returns correct point values for NBA stats', () => {
    const nba = getDefaultScoringTemplate('NBA', 'points')
    const byKey = new Map(nba.rules.map((r) => [r.statKey, r]))

    expect(byKey.get('points')?.pointsValue).toBe(1)
    expect(byKey.get('rebounds')?.pointsValue).toBe(1.2)
    expect(byKey.get('assists')?.pointsValue).toBe(1.5)
    expect(byKey.get('steals')?.pointsValue).toBe(3)
    expect(byKey.get('blocks')?.pointsValue).toBe(3)
    expect(byKey.get('turnovers')?.pointsValue).toBe(-1)
    expect(byKey.get('three_pointers_made')?.pointsValue).toBe(0.5)
    expect(byKey.get('double_double')?.pointsValue).toBe(1.5)
    expect(byKey.get('triple_double')?.pointsValue).toBe(3)
  })

  it('getSupportedScoringFormats returns expected formats for each sport', () => {
    const nfl = getSupportedScoringFormats('NFL')
    expect(nfl).toEqual(expect.arrayContaining(['PPR', 'half_ppr', 'standard', 'IDP', 'IDP-balanced', 'IDP-tackle_heavy', 'IDP-big_play_heavy']))

    expect(getSupportedScoringFormats('NBA')).toEqual(expect.arrayContaining(['points', 'standard']))
    expect(getSupportedScoringFormats('NCAAB')).toEqual(expect.arrayContaining(['points', 'standard']))
    expect(getSupportedScoringFormats('MLB')).toContain('standard')
    expect(getSupportedScoringFormats('NHL')).toContain('standard')
    expect(getSupportedScoringFormats('NCAAF')).toEqual(expect.arrayContaining(['PPR', 'standard']))
    expect(getSupportedScoringFormats('SOCCER')).toContain('standard')
  })

  it('getScoringContextForAI returns a non-empty scoring context string for each sport', () => {
    const sports: Array<[string, string]> = [
      ['NFL', 'PPR'],
      ['NFL', 'IDP'],
      ['NBA', 'points'],
      ['MLB', 'standard'],
      ['NHL', 'standard'],
      ['NCAAF', 'PPR'],
      ['NCAAB', 'points'],
      ['SOCCER', 'standard'],
    ]
    for (const [sport, format] of sports) {
      const ctx = getScoringContextForAI(sport, format)
      expect(typeof ctx).toBe('string')
      expect(ctx.length).toBeGreaterThan(10)
      expect(ctx).toMatch(/Scoring:/)
      expect(ctx).toMatch(/Key rules:/)
    }
  })

  it('NCAAF shares NFL stat keys and NCAAB shares NBA stat keys', () => {
    const ncaaf = getDefaultScoringTemplate('NCAAF', 'PPR')
    expect(ncaaf.rules.some((r) => r.statKey === 'passing_yards')).toBe(true)
    expect(ncaaf.rules.some((r) => r.statKey === 'receptions')).toBe(true)
    expect(ncaaf.rules.some((r) => r.statKey === 'rushing_td')).toBe(true)

    const ncaab = getDefaultScoringTemplate('NCAAB', 'points')
    expect(ncaab.rules.some((r) => r.statKey === 'points')).toBe(true)
    expect(ncaab.rules.some((r) => r.statKey === 'assists')).toBe(true)
    expect(ncaab.rules.some((r) => r.statKey === 'triple_double')).toBe(true)
  })

  it('NFL IDP template contains offensive and defensive stat keys with correct values', () => {
    const idp = getDefaultScoringTemplate('NFL', 'IDP')
    const byKey = new Map(idp.rules.map((r) => [r.statKey, r]))

    // Offensive stats preserved
    expect(byKey.get('passing_td')?.pointsValue).toBe(4)
    expect(byKey.get('receptions')?.pointsValue).toBe(1)

    // IDP defensive stats
    expect(byKey.get('idp_sack')?.pointsValue).toBe(4)
    expect(byKey.get('idp_interception')?.pointsValue).toBe(3)
    expect(byKey.get('idp_solo_tackle')?.pointsValue).toBe(1)
    expect(byKey.get('idp_assist_tackle')?.pointsValue).toBe(0.5)
    expect(byKey.get('idp_forced_fumble')?.pointsValue).toBe(3)
    expect(byKey.get('idp_defensive_touchdown')?.pointsValue).toBe(6)
  })
})

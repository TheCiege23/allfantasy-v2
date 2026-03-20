import { describe, expect, it } from 'vitest'
import { normalizeStatPayload } from '@/lib/schedule-stats/StatNormalizationService'
import { getDefaultScoringTemplate } from '@/lib/scoring-defaults/ScoringDefaultsRegistry'
import { computeFantasyPoints } from '@/lib/scoring-defaults/FantasyPointCalculator'

describe('Prompt 3 multi-sport scoring + stats pipeline', () => {
  it('preserves NFL baseline scoring keys and computes points from normalized stats', () => {
    const normalized = normalizeStatPayload('NFL', {
      pass_yd: 250,
      pass_td: 2,
      pass_int: 1,
      rush_yd: 30,
      rush_td: 1,
      rec: 4,
      rec_yd: 45,
      rec_td: 0,
    })

    const rules = getDefaultScoringTemplate('NFL', 'PPR').rules
    const total = computeFantasyPoints(normalized, rules)

    expect(normalized).toEqual(
      expect.objectContaining({
        passing_yards: 250,
        passing_td: 2,
        interception: 1,
        rushing_yards: 30,
        rushing_td: 1,
        receptions: 4,
        receiving_yards: 45,
      })
    )
    expect(total).toBeGreaterThan(0)
  })

  it('supports NBA normalization and scoring categories', () => {
    const normalized = normalizeStatPayload('NBA', {
      pts: 28,
      reb: 9,
      ast: 8,
      stl: 2,
      blk: 1,
      to: 3,
      '3pm': 4,
      dd: 1,
      td: 0,
    })

    const rules = getDefaultScoringTemplate('NBA', 'points').rules
    const total = computeFantasyPoints(normalized, rules)

    expect(normalized).toEqual(
      expect.objectContaining({
        points: 28,
        rebounds: 9,
        assists: 8,
        steals: 2,
        blocks: 1,
        turnovers: 3,
        three_pointers_made: 4,
        double_double: 1,
      })
    )
    expect(total).toBeGreaterThan(0)
  })

  it('supports MLB normalization and scoring categories', () => {
    const normalized = normalizeStatPayload('MLB', {
      '1b': 1,
      '2b': 1,
      hr: 1,
      rbi_total: 3,
      sb: 1,
      ip: 6,
      so: 7,
      er: 2,
      sv: 0,
    })

    const rules = getDefaultScoringTemplate('MLB', 'standard').rules
    const total = computeFantasyPoints(normalized, rules)

    expect(normalized).toEqual(
      expect.objectContaining({
        single: 1,
        double: 1,
        home_run: 1,
        rbi: 3,
        stolen_base: 1,
        innings_pitched: 6,
        strikeouts_pitched: 7,
        earned_runs: 2,
      })
    )
    expect(total).toBeGreaterThan(0)
  })

  it('supports NHL normalization and scoring categories', () => {
    const normalized = normalizeStatPayload('NHL', {
      g: 1,
      a: 2,
      sog: 5,
      ppp: 1,
      blk: 2,
      sv: 32,
      w: 1,
      so: 0,
    })

    const rules = getDefaultScoringTemplate('NHL', 'standard').rules
    const total = computeFantasyPoints(normalized, rules)

    expect(normalized).toEqual(
      expect.objectContaining({
        goal: 1,
        assist: 2,
        shot_on_goal: 5,
        power_play_point: 1,
        blocked_shot: 2,
        save: 32,
        win: 1,
      })
    )
    expect(total).toBeGreaterThan(0)
  })

  it('supports NCAAF/NCAAB baseline compatibility with NFL/NBA stat maps', () => {
    const ncaaf = normalizeStatPayload('NCAAF', {
      pass_yd: 310,
      pass_td: 3,
      rec: 6,
    })
    const ncaafRules = getDefaultScoringTemplate('NCAAF', 'PPR').rules
    const ncaafTotal = computeFantasyPoints(ncaaf, ncaafRules)

    const ncaab = normalizeStatPayload('NCAAB', {
      pts: 24,
      reb: 11,
      ast: 6,
      stl: 1,
      blk: 2,
      to: 2,
    })
    const ncaabRules = getDefaultScoringTemplate('NCAAB', 'points').rules
    const ncaabTotal = computeFantasyPoints(ncaab, ncaabRules)

    expect(ncaaf).toEqual(expect.objectContaining({ passing_yards: 310, passing_td: 3, receptions: 6 }))
    expect(ncaab).toEqual(expect.objectContaining({ points: 24, rebounds: 11, assists: 6 }))
    expect(ncaafTotal).toBeGreaterThan(0)
    expect(ncaabTotal).toBeGreaterThan(0)
  })
})

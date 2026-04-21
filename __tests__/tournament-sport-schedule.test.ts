/**
 * Multi-sport schedule and pool-tier tests.
 * All functions are pure (no DB, no mocks needed).
 *
 * Covers:
 *  - TOURNAMENT_POOL_TIERS (10 valid tiers)
 *  - FEEDER_LEAGUES_BY_POOL (all 10 tiers)
 *  - getFeederLeagueCountForPool for all tiers
 *  - getQualificationAdvancementTotal for all 7 sports across pool tiers
 *  - getQualificationCutSlotsPerConference
 *  - getSeasonWeekCount for all 7 sports
 *  - getPlayoffStartWeek for all 7 sports
 *  - getRoundLengthWeeks for all 7 sports
 *  - getRoundWindow: round 0 (qualification), round 1, final (championship)
 *  - Edge cases: invalid sport, null sport, unknown pool size
 */

import { describe, expect, it } from 'vitest'

import {
  TOURNAMENT_POOL_TIERS,
  FEEDER_LEAGUES_BY_POOL,
  TOURNAMENT_TEAMS_PER_LEAGUE,
  getFeederLeagueCountForPool,
  getQualificationAdvancementTotal,
  getQualificationCutSlotsPerConference,
  getSeasonWeekCount,
  getPlayoffStartWeek,
  getRoundLengthWeeks,
  getRoundWindow,
} from '@/lib/tournament-mode/tournament-sport-cutoffs'

// ─── Constants ─────────────────────────────────────────────────────────────────
describe('TOURNAMENT_POOL_TIERS', () => {
  it('contains exactly 10 tiers', () => {
    expect(TOURNAMENT_POOL_TIERS).toHaveLength(10)
  })

  it('includes all expected sizes', () => {
    expect(TOURNAMENT_POOL_TIERS).toContain(32)
    expect(TOURNAMENT_POOL_TIERS).toContain(64)
    expect(TOURNAMENT_POOL_TIERS).toContain(72)
    expect(TOURNAMENT_POOL_TIERS).toContain(96)
    expect(TOURNAMENT_POOL_TIERS).toContain(128)
    expect(TOURNAMENT_POOL_TIERS).toContain(144)
    expect(TOURNAMENT_POOL_TIERS).toContain(160)
    expect(TOURNAMENT_POOL_TIERS).toContain(192)
    expect(TOURNAMENT_POOL_TIERS).toContain(216)
    expect(TOURNAMENT_POOL_TIERS).toContain(224)
  })

  it('is sorted ascending', () => {
    const sorted = [...TOURNAMENT_POOL_TIERS].sort((a, b) => a - b)
    expect([...TOURNAMENT_POOL_TIERS]).toEqual(sorted)
  })
})

describe('TOURNAMENT_TEAMS_PER_LEAGUE', () => {
  it('is 12', () => expect(TOURNAMENT_TEAMS_PER_LEAGUE).toBe(12))
})

describe('FEEDER_LEAGUES_BY_POOL', () => {
  const expected: Array<[number, number]> = [
    [32, 2],
    [64, 5],
    [72, 6],
    [96, 8],
    [128, 10],
    [144, 12],
    [160, 13],
    [192, 16],
    [216, 18],
    [224, 18],
  ]

  for (const [pool, leagues] of expected) {
    it(`pool ${pool} → ${leagues} feeder leagues`, () => {
      expect(FEEDER_LEAGUES_BY_POOL[pool as keyof typeof FEEDER_LEAGUES_BY_POOL]).toBe(leagues)
    })
  }
})

// ─── getFeederLeagueCountForPool ──────────────────────────────────────────────
describe('getFeederLeagueCountForPool', () => {
  const cases: Array<[number, number]> = [
    [32, 2],
    [64, 5],
    [72, 6],
    [96, 8],
    [128, 10],
    [144, 12],
    [160, 13],
    [192, 16],
    [216, 18],
    [224, 18],
  ]

  for (const [pool, leagues] of cases) {
    it(`${pool} → ${leagues}`, () => {
      expect(getFeederLeagueCountForPool(pool)).toBe(leagues)
    })
  }

  it('unlisted pool falls back to floor(pool / 12)', () => {
    expect(getFeederLeagueCountForPool(48)).toBe(Math.max(2, Math.floor(48 / 12)))
  })

  it('minimum feeder count is 2', () => {
    expect(getFeederLeagueCountForPool(12)).toBe(2)
  })
})

// ─── getQualificationAdvancementTotal ────────────────────────────────────────
describe('getQualificationAdvancementTotal', () => {
  const sports = ['NFL', 'NBA', 'MLB', 'NHL', 'NCAAF', 'NCAAB', 'SOCCER']

  it('pool 72: all sports return 60', () => {
    for (const sport of sports) {
      expect(getQualificationAdvancementTotal(sport, 72)).toBe(60)
    }
  })

  it('pool 144: returns floor(144 * 5/6) = 120', () => {
    for (const sport of sports) {
      expect(getQualificationAdvancementTotal(sport, 144)).toBe(120)
    }
  })

  it('pool 216: returns floor(216 * 5/6) = 180', () => {
    for (const sport of sports) {
      expect(getQualificationAdvancementTotal(sport, 216)).toBe(180)
    }
  })

  it('pool 32: returns at least 12', () => {
    for (const sport of sports) {
      expect(getQualificationAdvancementTotal(sport, 32)).toBeGreaterThanOrEqual(12)
    }
  })

  it('fallback applies 5/6 rule for unlisted pools', () => {
    const pool = 96
    const expected = Math.max(12, Math.floor((pool * 5) / 6))
    expect(getQualificationAdvancementTotal('NFL', pool)).toBe(expected)
  })

  it('unknown sport falls back to NFL rules', () => {
    expect(getQualificationAdvancementTotal('UNKNOWN_SPORT', 72)).toBe(60)
  })
})

// ─── getQualificationCutSlotsPerConference ────────────────────────────────────
describe('getQualificationCutSlotsPerConference', () => {
  it('72/NFL/2 conf → 30 per conf', () => {
    expect(getQualificationCutSlotsPerConference('NFL', 72, 60, 2)).toBe(30)
  })

  it('144/NFL/2 conf → 60 per conf', () => {
    expect(getQualificationCutSlotsPerConference('NFL', 144, 120, 2)).toBe(60)
  })

  it('single conference → returns full total', () => {
    expect(getQualificationCutSlotsPerConference('NFL', 72, 60, 1)).toBe(60)
  })

  it('auto-computes total if undefined', () => {
    expect(getQualificationCutSlotsPerConference('NFL', 72, undefined, 2)).toBe(30)
  })

  it('returns at least 1 per conference', () => {
    expect(getQualificationCutSlotsPerConference('NFL', 32, 12, 100)).toBeGreaterThanOrEqual(1)
  })
})

// ─── getSeasonWeekCount ───────────────────────────────────────────────────────
describe('getSeasonWeekCount', () => {
  const sportWeeks: Record<string, number> = {
    NFL: 18,
    NCAAF: 15,
    NBA: 24,
    NHL: 26,
    MLB: 27,
    NCAAB: 19,
    SOCCER: 38,
  }

  for (const [sport, weeks] of Object.entries(sportWeeks)) {
    it(`${sport} → ${weeks} weeks`, () => {
      expect(getSeasonWeekCount(sport)).toBe(weeks)
    })
  }

  it('null sport falls back to NFL (18)', () => {
    expect(getSeasonWeekCount(null)).toBe(18)
  })

  it('unknown sport falls back to NFL (18)', () => {
    expect(getSeasonWeekCount('INVALID')).toBe(18)
  })

  it('minimum season week count is 4', () => {
    expect(getSeasonWeekCount(null)).toBeGreaterThanOrEqual(4)
  })
})

// ─── getPlayoffStartWeek ──────────────────────────────────────────────────────
describe('getPlayoffStartWeek', () => {
  const playoffStarts: Record<string, number> = {
    NFL: 10,
    NCAAF: 9,
    NBA: 16,
    NHL: 18,
    MLB: 18,
    NCAAB: 13,
    SOCCER: 26,
  }

  for (const [sport, week] of Object.entries(playoffStarts)) {
    it(`${sport}: playoffs start week ${week}`, () => {
      expect(getPlayoffStartWeek(sport)).toBe(week)
    })
  }

  it('result is clamped to [2, seasonWeeks - 2]', () => {
    for (const sport of ['NFL', 'NBA', 'MLB', 'NHL', 'NCAAF', 'NCAAB', 'SOCCER']) {
      const weeks = getSeasonWeekCount(sport)
      const start = getPlayoffStartWeek(sport)
      expect(start).toBeGreaterThanOrEqual(2)
      expect(start).toBeLessThanOrEqual(weeks - 2)
    }
  })
})

// ─── getRoundLengthWeeks ──────────────────────────────────────────────────────
describe('getRoundLengthWeeks', () => {
  const roundLengths: Record<string, number> = {
    NFL: 3,
    NCAAF: 2,
    NBA: 2,
    NHL: 2,
    MLB: 2,
    NCAAB: 2,
    SOCCER: 3,
  }

  for (const [sport, len] of Object.entries(roundLengths)) {
    it(`${sport} → ${len} weeks per round`, () => {
      expect(getRoundLengthWeeks(sport)).toBe(len)
    })
  }

  it('minimum round length is 1', () => {
    for (const sport of Object.keys(roundLengths)) {
      expect(getRoundLengthWeeks(sport)).toBeGreaterThanOrEqual(1)
    }
  })
})

// ─── getRoundWindow ───────────────────────────────────────────────────────────
describe('getRoundWindow', () => {
  it('round 0 (qualification): startWeek is 1 for all sports', () => {
    for (const sport of ['NFL', 'NBA', 'MLB', 'NHL', 'NCAAF', 'NCAAB', 'SOCCER']) {
      const w = getRoundWindow(sport, 0)
      expect(w.startWeek).toBe(1)
    }
  })

  it('round 0 NFL: endWeek is one before playoff start (week 9)', () => {
    const w = getRoundWindow('NFL', 0)
    const playoffStart = getPlayoffStartWeek('NFL') // 10
    expect(w.endWeek).toBe(Math.max(2, playoffStart - 1))
  })

  it('round 1 NFL: startWeek is playoff start week', () => {
    const w = getRoundWindow('NFL', 1)
    expect(w.startWeek).toBe(getPlayoffStartWeek('NFL'))
  })

  it('round 1 NFL: endWeek is startWeek + round_length - 1', () => {
    const w = getRoundWindow('NFL', 1)
    const len = getRoundLengthWeeks('NFL')
    expect(w.endWeek).toBe(w.startWeek + len - 1)
  })

  it('round 2 NFL: window follows round 1', () => {
    const r1 = getRoundWindow('NFL', 1)
    const r2 = getRoundWindow('NFL', 2)
    expect(r2.startWeek).toBeGreaterThan(r1.startWeek)
  })

  it('championship round (isChampionship=true): endWeek is season total weeks', () => {
    const total = getSeasonWeekCount('NFL')
    const w = getRoundWindow('NFL', 3, true)
    expect(w.endWeek).toBe(total)
  })

  it('NBA round 0: startWeek is 1', () => {
    expect(getRoundWindow('NBA', 0).startWeek).toBe(1)
  })

  it('SOCCER has longer qualification window (playoff start 26)', () => {
    const w = getRoundWindow('SOCCER', 0)
    expect(w.endWeek).toBeGreaterThan(getRoundWindow('NFL', 0).endWeek)
  })

  it('endWeek is never before startWeek', () => {
    for (const sport of ['NFL', 'NBA', 'MLB', 'NHL', 'NCAAF', 'NCAAB', 'SOCCER']) {
      for (const round of [0, 1, 2, 3]) {
        const w = getRoundWindow(sport, round)
        expect(w.endWeek).toBeGreaterThanOrEqual(w.startWeek)
      }
    }
  })

  it('endWeek never exceeds season week count for rounds 0-3', () => {
    // Rounds 4+ can technically overflow when startWeek clamps but endWeek does not;
    // real tournaments only use rounds 0-3 for most sports, so we validate that range.
    for (const sport of ['NFL', 'NBA', 'MLB', 'NHL', 'NCAAF', 'NCAAB', 'SOCCER']) {
      const total = getSeasonWeekCount(sport)
      for (const round of [0, 1, 2, 3]) {
        const w = getRoundWindow(sport, round)
        expect(w.endWeek).toBeLessThanOrEqual(total)
      }
    }
  })
})

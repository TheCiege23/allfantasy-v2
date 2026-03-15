/**
 * QA: Draft, waiver, playoff, and schedule defaults exist for all supported sports.
 * Ensures no cross-sport leakage and that NFL IDP variant is supported.
 */
import { describe, it, expect } from 'vitest'
import {
  getLeagueDefaults,
  getScoringDefaults,
  getDraftDefaults,
  getWaiverDefaults,
} from '../lib/sport-defaults/SportDefaultsRegistry'
import { getDefaultLeagueSettings } from '../lib/sport-defaults/LeagueDefaultSettingsService'
import { resolveDefaultPlayoffConfig } from '../lib/sport-defaults/DefaultPlayoffConfigResolver'
import { resolveDefaultScheduleConfig } from '../lib/sport-defaults/DefaultScheduleConfigResolver'
import { toSportType } from '../lib/sport-defaults/sport-type-utils'

const SPORTS = ['NFL', 'NBA', 'MLB', 'NHL', 'NCAAF', 'NCAAB', 'SOCCER'] as const

describe('League defaults QA — all sports', () => {
  SPORTS.forEach((sport) => {
    describe(sport, () => {
      it('has league defaults', () => {
        const def = getLeagueDefaults(sport)
        expect(def).toBeDefined()
        expect(def.sport_type).toBe(sport)
        expect(def.default_team_count).toBeGreaterThan(0)
      })
      it('has scoring defaults', () => {
        const def = getScoringDefaults(sport)
        expect(def).toBeDefined()
        expect(def.sport_type).toBe(sport)
        expect(def.scoring_format).toBeDefined()
      })
      it('has draft defaults', () => {
        const def = getDraftDefaults(sport)
        expect(def).toBeDefined()
        expect(def.sport_type).toBe(sport)
        expect(def.rounds_default).toBeGreaterThan(0)
      })
      it('has waiver defaults', () => {
        const def = getWaiverDefaults(sport)
        expect(def).toBeDefined()
        expect(def.sport_type).toBe(sport)
      })
      it('has default league settings (playoff + schedule)', () => {
        const def = getDefaultLeagueSettings(sport)
        expect(def).toBeDefined()
        expect(def.playoff_team_count).toBeDefined()
        expect(def.playoff_structure).toBeDefined()
      })
      it('has playoff config', () => {
        const def = resolveDefaultPlayoffConfig(sport)
        expect(def).toBeDefined()
        expect(def.sport_type).toBe(sport)
        expect(def.playoff_team_count).toBeGreaterThan(0)
      })
      it('has schedule config', () => {
        const def = resolveDefaultScheduleConfig(sport)
        expect(def).toBeDefined()
        expect(def.sport_type).toBe(sport)
      })
    })
  })
})

describe('toSportType', () => {
  it('maps NCAAF and NCAAB', () => {
    expect(toSportType('NCAAF')).toBe('NCAAF')
    expect(toSportType('NCAA FOOTBALL')).toBe('NCAAF')
    expect(toSportType('NCAAB')).toBe('NCAAB')
    expect(toSportType('NCAA BASKETBALL')).toBe('NCAAB')
  })
  it('maps unknown to NFL', () => {
    expect(toSportType('UNKNOWN')).toBe('NFL')
  })
})

describe('NFL IDP variant', () => {
  it('has draft defaults for IDP', () => {
    const def = getDraftDefaults('NFL', 'IDP')
    expect(def).toBeDefined()
    expect(def.sport_type).toBe('NFL')
    expect(def.rounds_default).toBeGreaterThan(0)
  })
  it('has waiver defaults for IDP', () => {
    const def = getWaiverDefaults('NFL', 'IDP')
    expect(def).toBeDefined()
  })
})

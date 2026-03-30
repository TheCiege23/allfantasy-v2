import { describe, expect, it } from 'vitest'

import {
  getAllowedDraftTypesForSport,
  getRulesForSport,
  getSupportedSports,
  getValidPositions,
  getValidRosterSlotNames,
} from '@/lib/sport-rules-engine'

describe('SportRulesEngine', () => {
  it('supports all required sports', () => {
    expect(getSupportedSports()).toEqual(
      expect.arrayContaining(['NFL', 'NHL', 'NBA', 'MLB', 'NCAAB', 'NCAAF', 'SOCCER'])
    )
  })

  it('returns NFL roster slots matching expected setup', () => {
    const slots = getValidRosterSlotNames('NFL')
    expect(slots).toEqual(expect.arrayContaining(['QB', 'RB', 'WR', 'TE', 'FLEX', 'DST']))
  })

  it('returns expected position families for NBA and MLB', () => {
    const nbaPositions = getValidPositions('NBA')
    const mlbPositions = getValidPositions('MLB')

    expect(nbaPositions).toEqual(expect.arrayContaining(['PG', 'SG', 'SF', 'PF', 'C']))
    expect(mlbPositions).toEqual(
      expect.arrayContaining(['SP', 'RP', '1B', '2B', '3B', 'SS', 'OF'])
    )
  })

  it('returns sport-scoped draft options including mock draft mode', () => {
    const nflDraftTypes = getAllowedDraftTypesForSport('NFL')
    expect(nflDraftTypes).toEqual(
      expect.arrayContaining(['snake', 'linear', 'auction', 'slow_draft', 'mock_draft'])
    )
  })

  it('returns scoring and player pool rules for soccer', () => {
    const soccerRules = getRulesForSport('SOCCER')
    expect(soccerRules.scoring.validFormats.length).toBeGreaterThan(0)
    expect(soccerRules.playerPool.validPositions).toEqual(
      expect.arrayContaining(['GKP', 'DEF', 'MID', 'FWD'])
    )
    expect(soccerRules.playerPool.poolSizeLimit).toBeGreaterThan(0)
  })
})

import { describe, expect, it } from 'vitest'

import { getCreateLeagueDraftTypes, getFormatsForSport } from '@/lib/league/format-engine'
import { getDraftTypeOptions } from '@/lib/create-league-v2/rules-engine'
import { NBA_CBB_DEFAULTS, NFL_CFB_DEFAULTS } from '@/lib/c2c/sportDefaults'
import { getScoringEligibility } from '@/lib/c2c/scoringEngine'
import { getAnnualDraftPool, getDraftPoolConfig } from '@/lib/c2c/draftFormatEngine'
import { validateC2CRosterSlots } from '@/lib/merged-devy-c2c/roster/C2CRosterRules'

describe('C2C full verification core matrix', () => {
  const c2cSports = ['NFL', 'NBA', 'NCAAB', 'NCAAF'] as const

  it('supports C2C format across NFL, NBA, NCAAB, and NCAAF with full create draft variants', () => {
    for (const sport of c2cSports) {
      const formatIds = getFormatsForSport(sport).map((f) => f.id)
      expect(formatIds).toContain('c2c')

      const createDraftTypes = getCreateLeagueDraftTypes(sport, 'c2c')
      expect(createDraftTypes).toEqual(expect.arrayContaining(['c2c_snake', 'c2c_linear', 'c2c_auction']))
    }
  })

  it('exposes C2C draft options on create-league form for all requested sports', () => {
    for (const sport of c2cSports) {
      const options = getDraftTypeOptions('c2c', sport)
      const ids = options.map((o) => o.id)
      expect(ids).toEqual(expect.arrayContaining(['c2c_snake', 'c2c_linear', 'c2c_auction', 'auto']))
    }
  })

  it('keeps C2C roster contracts with starter, bench, taxi, and devy capacity', () => {
    expect(NFL_CFB_DEFAULTS.campusStarterSlots.length).toBeGreaterThan(0)
    expect(NFL_CFB_DEFAULTS.cantonStarterSlots.length).toBeGreaterThan(0)
    expect(NFL_CFB_DEFAULTS.benchSlots).toBeGreaterThan(0)
    expect(NFL_CFB_DEFAULTS.taxiSlots).toBeGreaterThan(0)
    expect(NFL_CFB_DEFAULTS.devySlots).toBeGreaterThan(0)

    expect(NBA_CBB_DEFAULTS.campusStarterSlots.length).toBeGreaterThan(0)
    expect(NBA_CBB_DEFAULTS.cantonStarterSlots.length).toBeGreaterThan(0)
    expect(NBA_CBB_DEFAULTS.benchSlots).toBeGreaterThan(0)
    expect(NBA_CBB_DEFAULTS.taxiSlots).toBeGreaterThan(0)
    expect(NBA_CBB_DEFAULTS.devySlots).toBeGreaterThan(0)
  })

  it('scores starter buckets and keeps bench/taxi/devy display-only', () => {
    expect(getScoringEligibility('campus', 'campus_starter', true)).toBe('counts_campus')
    expect(getScoringEligibility('canton', 'canton_starter', true)).toBe('counts_canton')

    expect(getScoringEligibility('campus', 'bench', true)).toBe('display_only')
    expect(getScoringEligibility('campus', 'taxi', true)).toBe('display_only')
    expect(getScoringEligibility('campus', 'devy', true)).toBe('none')
    expect(getScoringEligibility('campus', 'devy', false)).toBe('display_only')
  })

  it('enforces taxi and college-slot legality in roster validation', () => {
    const valid = validateC2CRosterSlots({
      config: {
        leagueId: 'l1',
        startupDraftFormat: 'combined',
        futureDraftFormat: 'combined',
        supportSeparateDrafts: false,
        campusToCantonPromotion: 'manual',
        scoringMode: 'combined_total',
        supportsCollegeScoring: true,
        collegeScoringUntilDeadline: true,
        collegeRosterSize: 20,
        taxiSize: 6,
        proBenchSize: 8,
        proIRSize: 2,
        proLineupSlots: {},
      },
      collegeSlotsFilled: 18,
      collegeSlotsGraduatedInCollege: 0,
      proRosterCount: 10,
      taxiCount: 4,
    })
    expect(valid.legal).toBe(true)

    const overflow = validateC2CRosterSlots({
      config: {
        leagueId: 'l2',
        startupDraftFormat: 'combined',
        futureDraftFormat: 'combined',
        supportSeparateDrafts: false,
        campusToCantonPromotion: 'manual',
        scoringMode: 'combined_total',
        supportsCollegeScoring: true,
        collegeScoringUntilDeadline: true,
        collegeRosterSize: 20,
        taxiSize: 6,
        proBenchSize: 8,
        proIRSize: 2,
        proLineupSlots: {},
      },
      collegeSlotsFilled: 21,
      collegeSlotsGraduatedInCollege: 1,
      proRosterCount: 10,
      taxiCount: 7,
    })
    expect(overflow.legal).toBe(false)
    expect(overflow.errors.join(' ')).toContain('College roster overflow')
    expect(overflow.errors.join(' ')).toContain('Taxi overflow')
    expect(overflow.errors.join(' ')).toContain('graduated players')
  })

  it('builds annual draft pool metadata and excludes already-rostered ids', () => {
    const combined = getAnnualDraftPool('combined', 'NFL_CFB', [
      {
        id: 'row-1',
        leagueId: 'l1',
        rosterId: 'r1',
        playerId: 'p1',
        playerName: 'Player One',
        playerType: 'campus_devy',
        playerSide: 'campus',
        bucketState: 'devy',
        scoringEligibility: 'display_only',
        classYear: null,
        school: null,
        conference: null,
        nflTeam: null,
        nflPosition: null,
        hasEnteredPro: false,
        proEntryYear: null,
        proEntryMethod: null,
        transitionedFrom: null,
        transitionedAt: null,
        transitionReason: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ])

    expect(combined.combinedPoolSize).toBeGreaterThan(0)
    expect(combined.notes).toContain('excluded as already rostered')

    const split = getDraftPoolConfig('split_campus_canton', 'NBA_CBB')
    expect(split).toHaveLength(2)
    expect(split.map((p) => p.side)).toEqual(expect.arrayContaining(['campus', 'canton']))
  })
})

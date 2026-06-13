/**
 * C2C defaults — NFL + NCAAF Phase 1 smoke tests.
 * Tests canonical contract, snapshot builder, normalizer, guardrails,
 * draft type resolution, pool isolation, and resolveConceptPreset wiring.
 */

import { describe, it, expect } from 'vitest'
import {
  getC2CDefaultContract,
  buildC2CSettingsSnapshot,
  normalizeC2CSettingsSnapshot,
  isC2CEligibleSport,
  normalizeC2CDraftType,
  validateC2CStructure,
  C2C_DRAFT_TYPE_IDS,
} from '@/lib/league-concepts/c2cDefaults'
import { resolveConceptPreset, mergeConceptPresetSettings } from '@/lib/league-concepts/resolveConceptPreset'

// ── isC2CEligibleSport ────────────────────────────────────────────────────────

describe('isC2CEligibleSport', () => {
  it('accepts NFL', () => expect(isC2CEligibleSport('NFL')).toBe(true))
  it('accepts NCAAF', () => expect(isC2CEligibleSport('NCAAF')).toBe(true))
  it('accepts lowercase nfl', () => expect(isC2CEligibleSport('nfl')).toBe(true))
  it('rejects NBA', () => expect(isC2CEligibleSport('NBA')).toBe(false))
  it('rejects null', () => expect(isC2CEligibleSport(null)).toBe(false))
  it('rejects empty string', () => expect(isC2CEligibleSport('')).toBe(false))
})

// ── normalizeC2CDraftType ─────────────────────────────────────────────────────

describe('normalizeC2CDraftType', () => {
  it('c2c_snake stays c2c_snake', () => expect(normalizeC2CDraftType('c2c_snake')).toBe('c2c_snake'))
  it('c2c_linear stays c2c_linear', () => expect(normalizeC2CDraftType('c2c_linear')).toBe('c2c_linear'))
  it('c2c_auction stays c2c_auction', () => expect(normalizeC2CDraftType('c2c_auction')).toBe('c2c_auction'))
  it('plain snake maps to c2c_snake', () => expect(normalizeC2CDraftType('snake')).toBe('c2c_snake'))
  it('plain linear maps to c2c_linear', () => expect(normalizeC2CDraftType('linear')).toBe('c2c_linear'))
  it('plain auction maps to c2c_auction', () => expect(normalizeC2CDraftType('auction')).toBe('c2c_auction'))
  it('mock_draft passthrough', () => expect(normalizeC2CDraftType('mock_draft')).toBe('mock_draft'))
  it('mock alias maps to mock_draft', () => expect(normalizeC2CDraftType('mock')).toBe('mock_draft'))
  it('offline passthrough', () => expect(normalizeC2CDraftType('offline')).toBe('offline'))
  it('auto passthrough', () => expect(normalizeC2CDraftType('auto')).toBe('auto'))
  it('unknown falls back to c2c_snake', () => expect(normalizeC2CDraftType('??')).toBe('c2c_snake'))
})

// ── C2C_DRAFT_TYPE_IDS ────────────────────────────────────────────────────────

describe('C2C_DRAFT_TYPE_IDS', () => {
  it('includes c2c_snake', () => expect(C2C_DRAFT_TYPE_IDS).toContain('c2c_snake'))
  it('includes c2c_linear', () => expect(C2C_DRAFT_TYPE_IDS).toContain('c2c_linear'))
  it('includes c2c_auction', () => expect(C2C_DRAFT_TYPE_IDS).toContain('c2c_auction'))
})

// ── getC2CDefaultContract — NFL ───────────────────────────────────────────────

describe('getC2CDefaultContract — NFL', () => {
  const contract = getC2CDefaultContract({ sport: 'NFL', draftType: 'c2c_snake' })

  it('returns non-null contract', () => expect(contract).not.toBeNull())
  it('sport is NFL', () => expect(contract!.sport).toBe('NFL'))
  it('leagueType is c2c', () => expect(contract!.leagueType).toBe('c2c'))
  it('roster_mode is c2c', () => expect(contract!.roster_mode).toBe('c2c'))
  it('draft_type is snake engine core', () => expect(contract!.draft_type).toBe('snake'))
  it('requested_draft_type is c2c_snake', () => expect(contract!.requested_draft_type).toBe('c2c_snake'))
  it('teams defaults to 12', () => expect(contract!.teams).toBe(12))
  it('scoring_preset_id defaults to fb_half_ppr', () => expect(contract!.scoring_preset_id).toBe('fb_half_ppr'))

  it('pro roster has correct starters (QB:1 RB:2 WR:2 TE:1 FLEX:2 SUPER_FLEX:1)', () => {
    const slots = contract!.proRosterTemplate.starterSlots
    expect(slots.QB).toBe(1)
    expect(slots.RB).toBe(2)
    expect(slots.WR).toBe(2)
    expect(slots.TE).toBe(1)
    expect(slots.FLEX).toBe(2)
    expect(slots.SUPER_FLEX).toBe(1)
  })
  it('pro bench = 12', () => expect(contract!.proRosterTemplate.benchSlots).toBe(12))
  it('pro IR = 3', () => expect(contract!.proRosterTemplate.irSlots).toBe(3))
  it('pro taxi = 4', () => expect(contract!.proRosterTemplate.taxiSlots).toBe(4))

  it('college roster size = 20', () => expect(contract!.collegeRosterTemplate.collegeRosterSize).toBe(20))
  it('college draft rounds = 6', () => expect(contract!.collegeRosterTemplate.collegeDraftRounds).toBe(6))

  it('c2c_enabled is true', () => expect(contract!.c2cSettings.enabled).toBe(true))
  it('adapterId is nfl_c2c', () => expect(contract!.c2cSettings.adapterId).toBe('nfl_c2c'))
  it('rookieDraftRounds = 4', () => expect(contract!.c2cSettings.rookieDraftRounds).toBe(4))
  it('promotionEngineStatus is pending', () => expect(contract!.c2cSettings.promotionEngineStatus).toBe('pending'))
  it('hybridStandingsStatus is pending', () => expect(contract!.c2cSettings.hybridStandingsStatus).toBe('pending'))

  it('devy is disabled in disabledSettings', () => {
    expect(contract!.disabledSettings.devy).toBe(false)
    expect(contract!.disabledSettings.devy_enabled).toBe(false)
  })
  it('keeper is disabled', () => expect(contract!.disabledSettings.keeper).toBe(false))
  it('survivor is disabled', () => expect(contract!.disabledSettings.survivor).toBe(false))
  it('salary_cap is disabled', () => expect(contract!.disabledSettings.salary_cap).toBe(false))

  it('pro pool excludes college players', () => {
    expect(contract!.proPlayerPoolRules.includeCollegePlayers).toBe(false)
    expect(contract!.proPlayerPoolRules.excludeCollegePool).toBe(true)
  })
  it('college pool excludes NFL players', () => {
    expect(contract!.collegePlayerPoolRules.includeNflPlayers).toBe(false)
    expect(contract!.collegePlayerPoolRules.excludeNflPool).toBe(true)
  })
  it('pro pool key differs from college pool key (pool isolation)', () => {
    expect(contract!.proPlayerPoolRules.poolKey).not.toBe(contract!.collegePlayerPoolRules.poolKey)
  })

  it('returns null for unsupported sport', () => {
    expect(getC2CDefaultContract({ sport: 'NBA' })).toBeNull()
  })
})

// ── getC2CDefaultContract — NCAAF ─────────────────────────────────────────────

describe('getC2CDefaultContract — NCAAF', () => {
  const contract = getC2CDefaultContract({ sport: 'NCAAF', draftType: 'c2c_snake' })

  it('returns non-null', () => expect(contract).not.toBeNull())
  it('sport is NCAAF', () => expect(contract!.sport).toBe('NCAAF'))
  it('leagueType is c2c', () => expect(contract!.leagueType).toBe('c2c'))
  it('adapterId is still nfl_c2c', () => expect(contract!.c2cSettings.adapterId).toBe('nfl_c2c'))
  it('scoring_preset_id defaults to ncaaf_half_ppr', () => expect(contract!.scoring_preset_id).toBe('ncaaf_half_ppr'))
  it('college roster size = 20', () => expect(contract!.collegeRosterTemplate.collegeRosterSize).toBe(20))
})

// ── Draft type variants ───────────────────────────────────────────────────────

describe('getC2CDefaultContract — draft type variants', () => {
  it('c2c_auction → engineCore=auction, auctionBudgetPerTeam=200', () => {
    const c = getC2CDefaultContract({ sport: 'NFL', draftType: 'c2c_auction' })!
    expect(c.draftSettings.engineCore).toBe('auction')
    expect(c.draftSettings.auctionBudgetPerTeam).toBe(200)
    expect(c.draftSettings.nominationOrderEnabled).toBe(true)
  })
  it('c2c_linear → snakeOrLinear=linear, sameOrderEveryRound=true', () => {
    const c = getC2CDefaultContract({ sport: 'NFL', draftType: 'c2c_linear' })!
    expect(c.draftSettings.snakeOrLinear).toBe('linear')
    expect(c.draftSettings.sameOrderEveryRound).toBe(true)
  })
  it('c2c_snake → auctionBudgetPerTeam is null', () => {
    const c = getC2CDefaultContract({ sport: 'NFL', draftType: 'c2c_snake' })!
    expect(c.draftSettings.auctionBudgetPerTeam).toBeNull()
  })
  it('mock_draft → doesNotMutateRealRosters=true', () => {
    const c = getC2CDefaultContract({ sport: 'NFL', draftType: 'mock_draft' })!
    expect(c.draftSettings.doesNotMutateRealRosters).toBe(true)
    expect(c.draftSettings.mockDraftEnabled).toBe(true)
  })
  it('offline → offlineModeEnabled=true, timerDisabled=true', () => {
    const c = getC2CDefaultContract({ sport: 'NFL', draftType: 'offline' })!
    expect(c.draftSettings.offlineModeEnabled).toBe(true)
    expect(c.draftSettings.timerDisabled).toBe(true)
  })
})

// ── buildC2CSettingsSnapshot ──────────────────────────────────────────────────

describe('buildC2CSettingsSnapshot — NFL', () => {
  const snap = buildC2CSettingsSnapshot({ sport: 'NFL', draftType: 'c2c_snake' })!

  it('returns non-null', () => expect(snap).not.toBeNull())
  it('isC2C is true', () => expect(snap.isC2C).toBe(true))
  it('c2c_enabled is true', () => expect(snap.c2c_enabled).toBe(true))
  it('isDynasty is true', () => expect(snap.isDynasty).toBe(true))
  it('leagueType is c2c', () => expect(snap.leagueType).toBe('c2c'))
  it('roster_mode is c2c', () => expect(snap.roster_mode).toBe('c2c'))
  it('college_roster_size = 20', () => expect(snap.college_roster_size).toBe(20))
  it('rookie_draft_rounds = 4', () => expect(snap.rookie_draft_rounds).toBe(4))
  it('college_draft_rounds = 6', () => expect(snap.college_draft_rounds).toBe(6))
  it('taxi_slots = 4', () => expect(snap.taxi_slots).toBe(4))
  it('ir_slots = 3', () => expect(snap.ir_slots).toBe(3))
  it('startupProDraftSettings is present', () => expect(snap.startupProDraftSettings).toBeDefined())
  it('startupCollegeDraftSettings is present', () => expect(snap.startupCollegeDraftSettings).toBeDefined())
  it('rookieDraftSettings is present', () => expect(snap.rookieDraftSettings).toBeDefined())
  it('hybrid_standings_status is pending', () => expect(snap.hybrid_standings_status).toBe('pending'))
  it('promotion_engine_status is pending', () => expect(snap.promotion_engine_status).toBe('pending'))
  it('devy = false', () => expect(snap.devy).toBe(false))
  it('keeper = false', () => expect(snap.keeper).toBe(false))
  it('survivor = false', () => expect(snap.survivor).toBe(false))
  it('salary_cap = false', () => expect(snap.salary_cap).toBe(false))
  it('college_player_pool differs from player_pool', () => {
    expect(snap.player_pool).not.toBe(snap.college_player_pool)
  })
  it('returns null for ineligible sport', () => {
    expect(buildC2CSettingsSnapshot({ sport: 'MLB' })).toBeNull()
  })
})

// ── normalizeC2CSettingsSnapshot guardrails ───────────────────────────────────

describe('normalizeC2CSettingsSnapshot — guardrails', () => {
  it('always sets c2c_enabled=true even if incoming sets it false', () => {
    const result = normalizeC2CSettingsSnapshot({
      sport: 'NFL',
      draftType: 'c2c_snake',
      settings: { c2c_enabled: false },
    })
    expect(result.c2c_enabled).toBe(true)
  })
  it('always sets devy=false', () => {
    const result = normalizeC2CSettingsSnapshot({
      sport: 'NFL',
      draftType: 'c2c_snake',
      settings: { devy: true },
    })
    expect(result.devy).toBe(false)
  })
  it('always sets keeper=false', () => {
    const result = normalizeC2CSettingsSnapshot({
      sport: 'NFL',
      draftType: 'c2c_snake',
      settings: { keeper: true },
    })
    expect(result.keeper).toBe(false)
  })
  it('automation statuses always remain pending', () => {
    const result = normalizeC2CSettingsSnapshot({
      sport: 'NFL',
      draftType: 'c2c_snake',
      settings: { promotion_engine_status: 'active', hybrid_standings_status: 'active' },
    })
    expect(result.promotion_engine_status).toBe('pending')
    expect(result.hybrid_standings_status).toBe('pending')
  })
  it('clamps college_roster_size below 5 to minimum 5', () => {
    const result = normalizeC2CSettingsSnapshot({
      sport: 'NFL',
      draftType: 'c2c_snake',
      settings: { college_roster_size: 2 },
    })
    expect(Number(result.college_roster_size)).toBe(5)
  })
  it('respects college_roster_size within valid range', () => {
    const result = normalizeC2CSettingsSnapshot({
      sport: 'NFL',
      draftType: 'c2c_snake',
      settings: { college_roster_size: 25 },
    })
    expect(result.college_roster_size).toBe(25)
  })
})

// ── validateC2CStructure ──────────────────────────────────────────────────────

describe('validateC2CStructure', () => {
  it('valid NFL c2c_snake returns no errors', () => {
    const snap = buildC2CSettingsSnapshot({ sport: 'NFL', draftType: 'c2c_snake' })!
    expect(validateC2CStructure(snap)).toHaveLength(0)
  })
  it('valid NCAAF c2c_auction returns no errors', () => {
    const snap = buildC2CSettingsSnapshot({ sport: 'NCAAF', draftType: 'c2c_auction' })!
    expect(validateC2CStructure(snap)).toHaveLength(0)
  })
  it('errors on unsupported sport', () => {
    const errors = validateC2CStructure({ sport: 'NBA', requested_draft_type: 'c2c_snake', college_roster_size: 20, rookie_draft_rounds: 4, college_draft_rounds: 6 })
    expect(errors.some(e => e.includes('not supported'))).toBe(true)
  })
  it('errors on plain snake draft type', () => {
    const errors = validateC2CStructure({ sport: 'NFL', requested_draft_type: 'snake', college_roster_size: 20, rookie_draft_rounds: 4, college_draft_rounds: 6 })
    expect(errors.some(e => e.includes('c2c_*'))).toBe(true)
  })
  it('errors on devy_snake draft type', () => {
    const errors = validateC2CStructure({ sport: 'NFL', requested_draft_type: 'devy_snake', college_roster_size: 20, rookie_draft_rounds: 4, college_draft_rounds: 6 })
    expect(errors.some(e => e.includes('c2c_*'))).toBe(true)
  })
  it('errors if devy_enabled is true', () => {
    const snap = buildC2CSettingsSnapshot({ sport: 'NFL', draftType: 'c2c_snake' })!
    snap.devy_enabled = true
    expect(validateC2CStructure(snap).some(e => e.includes('devy'))).toBe(true)
  })
})

// ── resolveConceptPreset — C2C wiring ─────────────────────────────────────────

describe('resolveConceptPreset — NFL C2C', () => {
  const result = resolveConceptPreset({
    sport: 'NFL',
    leagueType: 'c2c',
    scoringPreset: 'fb_half_ppr',
    draftType: 'c2c_snake',
    options: { allowAdmin: true },
  })

  it('resolves ok', () => expect(result.ok).toBe(true))
  it('preset leagueType is c2c', () => {
    if (!result.ok) throw new Error('not ok')
    expect(result.preset.leagueType).toBe('c2c')
  })
  it('settingsSnapshot.isC2C is true', () => {
    if (!result.ok) throw new Error('not ok')
    expect(result.settingsSnapshot.isC2C).toBe(true)
  })
  it('settingsSnapshot.c2c_enabled is true', () => {
    if (!result.ok) throw new Error('not ok')
    expect(result.settingsSnapshot.c2c_enabled).toBe(true)
  })
  it('settingsSnapshot.leagueType is c2c', () => {
    if (!result.ok) throw new Error('not ok')
    expect(result.settingsSnapshot.leagueType).toBe('c2c')
  })
})

describe('resolveConceptPreset — NCAAF C2C', () => {
  const result = resolveConceptPreset({
    sport: 'NCAAF',
    leagueType: 'c2c',
    scoringPreset: 'ncaaf_half_ppr',
    draftType: 'c2c_snake',
    options: { allowAdmin: true },
  })

  it('resolves ok', () => expect(result.ok).toBe(true))
  it('settingsSnapshot.sport is NCAAF', () => {
    if (!result.ok) throw new Error('not ok')
    expect(result.settingsSnapshot.sport).toBe('NCAAF')
  })
  it('settingsSnapshot.c2c_enabled is true', () => {
    if (!result.ok) throw new Error('not ok')
    expect(result.settingsSnapshot.c2c_enabled).toBe(true)
  })
})

// ── mergeConceptPresetSettings — C2C ─────────────────────────────────────────

describe('mergeConceptPresetSettings — C2C', () => {
  it('enforces c2c identity on merge', () => {
    const snap = buildC2CSettingsSnapshot({ sport: 'NFL', draftType: 'c2c_snake' })!
    const result = mergeConceptPresetSettings(snap, {
      leagueName: 'Test C2C League',
      default_team_count: 10,
    })
    expect(result.leagueType).toBe('c2c')
    expect(result.c2c_enabled).toBe(true)
    expect(result.isC2C).toBe(true)
    expect(result.leagueName).toBe('Test C2C League')
  })
})

// ── Cross-format guardrails ───────────────────────────────────────────────────

describe('Cross-format guardrails', () => {
  it('plain dynasty does not accept c2c_snake draft type', () => {
    const result = resolveConceptPreset({
      sport: 'NFL',
      leagueType: 'dynasty',
      scoringPreset: 'fb_half_ppr',
      draftType: 'c2c_snake',
    })
    // Should still resolve (dynasty has fallback) but the snapshot should NOT have c2c_enabled
    if (!result.ok) throw new Error('not ok')
    expect(result.settingsSnapshot.c2c_enabled).not.toBe(true)
  })
  it('plain devy does not set c2c_enabled', () => {
    const result = resolveConceptPreset({
      sport: 'NFL',
      leagueType: 'devy',
      scoringPreset: 'fb_half_ppr',
      draftType: 'devy_snake',
    })
    if (!result.ok) throw new Error('not ok')
    expect(result.settingsSnapshot.c2c_enabled).not.toBe(true)
  })
})

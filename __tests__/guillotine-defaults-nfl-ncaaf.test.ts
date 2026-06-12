/**
 * Guillotine defaults — NFL and NCAAF canonical creation pipeline tests.
 * Covers: isGuillotineEligibleSport, getGuillotineDefaultContract,
 * buildGuillotineSettingsSnapshot, normalizeGuillotineSettingsSnapshot,
 * catalog entries, resolveConceptPreset, mergeConceptPresetSettings.
 */

import { describe, it, expect } from 'vitest'
import {
  isGuillotineEligibleSport,
  getGuillotineDefaultContract,
  buildGuillotineSettingsSnapshot,
  normalizeGuillotineSettingsSnapshot,
  GUILLOTINE_DRAFT_TYPE_IDS,
} from '@/lib/league-concepts/guillotineDefaults'
import { CONCEPT_PRESET_CATALOG } from '@/lib/league-concepts/conceptPresetCatalog'
import { resolveConceptPreset, mergeConceptPresetSettings } from '@/lib/league-concepts/resolveConceptPreset'

// ── isGuillotineEligibleSport ─────────────────────────────────────────────────

describe('isGuillotineEligibleSport', () => {
  it('returns true for NFL', () => expect(isGuillotineEligibleSport('NFL')).toBe(true))
  it('returns true for NCAAF', () => expect(isGuillotineEligibleSport('NCAAF')).toBe(true))
  it('returns true for lowercase nfl', () => expect(isGuillotineEligibleSport('nfl')).toBe(true))
  it('returns false for NBA', () => expect(isGuillotineEligibleSport('NBA')).toBe(false))
  it('returns false for null', () => expect(isGuillotineEligibleSport(null)).toBe(false))
  it('returns false for empty string', () => expect(isGuillotineEligibleSport('')).toBe(false))
})

// ── GUILLOTINE_DRAFT_TYPE_IDS ─────────────────────────────────────────────────

describe('GUILLOTINE_DRAFT_TYPE_IDS', () => {
  it('includes snake, linear, auction', () => {
    expect(GUILLOTINE_DRAFT_TYPE_IDS).toContain('snake')
    expect(GUILLOTINE_DRAFT_TYPE_IDS).toContain('linear')
    expect(GUILLOTINE_DRAFT_TYPE_IDS).toContain('auction')
  })
  it('does not include offline or auto', () => {
    expect(GUILLOTINE_DRAFT_TYPE_IDS).not.toContain('offline')
    expect(GUILLOTINE_DRAFT_TYPE_IDS).not.toContain('auto')
  })
})

// ── NFL guillotine contract ───────────────────────────────────────────────────

describe('getGuillotineDefaultContract — NFL', () => {
  const contract = getGuillotineDefaultContract({ sport: 'NFL', draftType: 'snake' })!

  it('returns non-null for NFL', () => expect(contract).not.toBeNull())
  it('league_type is guillotine', () => expect(contract.league_type).toBe('guillotine'))
  it('leagueType is guillotine', () => expect(contract.leagueType).toBe('guillotine'))
  it('roster_mode is guillotine', () => expect(contract.roster_mode).toBe('guillotine'))

  // NFL: 18-week season → 17 teams default
  it('teams defaults to 17', () => expect(contract.teams).toBe(17))

  // Roster: 9 starters, 6 bench, 0 IR, 0 taxi → 15 total
  it('rosterTemplate.totalRosterSlots is 15', () => expect(contract.rosterTemplate.totalRosterSlots).toBe(15))
  it('rosterTemplate.benchSlots is 6', () => expect(contract.rosterTemplate.benchSlots).toBe(6))
  it('rosterTemplate.irSlots is 0', () => expect(contract.rosterTemplate.irSlots).toBe(0))
  it('rosterTemplate.taxiSlots is 0', () => expect(contract.rosterTemplate.taxiSlots).toBe(0))
  it('NFL starters include QB:1 RB:2 WR:2 TE:1 FLEX:1 K:1 DST:1', () => {
    expect(contract.rosterTemplate.starterSlots).toMatchObject({ QB: 1, RB: 2, WR: 2, TE: 1, FLEX: 1, K: 1, DST: 1 })
  })
  it('rosterTemplate.defensePosition is DST', () => expect(contract.rosterTemplate.defensePosition).toBe('DST'))

  // Scoring
  it('scoring_preset_id defaults to fb_half_ppr', () => expect(contract.scoring_preset_id).toBe('fb_half_ppr'))

  // Elimination
  it('eliminationSettings.eliminationsPerPeriod is 1', () => expect(contract.eliminationSettings.eliminationsPerPeriod).toBe(1))
  it('eliminationSettings.eliminationPeriod is weekly', () => expect(contract.eliminationSettings.eliminationPeriod).toBe('weekly'))
  it('eliminationSettings.eliminationStartWeek is 1', () => expect(contract.eliminationSettings.eliminationStartWeek).toBe(1))
  it('eliminationSettings.eliminationEndWeek is 18', () => expect(contract.eliminationSettings.eliminationEndWeek).toBe(18))
  it('eliminationSettings.endgame is last_team_standing', () => expect(contract.eliminationSettings.endgame).toBe('last_team_standing'))
  it('eliminationSettings.eliminatedRosterRelease is next_waiver_run', () => expect(contract.eliminationSettings.eliminatedRosterRelease).toBe('next_waiver_run'))
  it('eliminationSettings.commissionerOverride is true', () => expect(contract.eliminationSettings.commissionerOverride).toBe(true))
  it('eliminationSettings.tiebreakerOrder starts with bench_points', () => {
    expect(contract.eliminationSettings.tiebreakerOrder[0]).toBe('bench_points')
  })

  // Waivers
  it('waiverSettings.waiverType is faab', () => expect(contract.waiverSettings.waiverType).toBe('faab'))
  it('waiverSettings.faabBudgetPerTeam is 100', () => expect(contract.waiverSettings.faabBudgetPerTeam).toBe(100))
  it('waiverSettings.faabResetRule is never', () => expect(contract.waiverSettings.faabResetRule).toBe('never'))
  it('waiverSettings.samePeriodPickups is false', () => expect(contract.waiverSettings.samePeriodPickups).toBe(false))
  it('waiverSettings.claimPriorityBehavior is faab_highest', () => expect(contract.waiverSettings.claimPriorityBehavior).toBe('faab_highest'))

  // Season
  it('seasonSettings.hasPlayoffs is false', () => expect(contract.seasonSettings.hasPlayoffs).toBe(false))
  it('seasonSettings.tradesEnabled is false', () => expect(contract.seasonSettings.tradesEnabled).toBe(false))

  // Features
  it('enabledFeatures.isGuillotine is true', () => expect(contract.enabledFeatures.isGuillotine).toBe(true))
  it('enabledFeatures.eliminations is true', () => expect(contract.enabledFeatures.eliminations).toBe(true))
  it('enabledFeatures.faab is true', () => expect(contract.enabledFeatures.faab).toBe(true))
  it('enabledFeatures.isDynasty is false', () => expect(contract.enabledFeatures.isDynasty).toBe(false))
  it('enabledFeatures.devy is false', () => expect(contract.enabledFeatures.devy).toBe(false))
  it('enabledFeatures.taxi is false', () => expect(contract.enabledFeatures.taxi).toBe(false))
  it('enabledFeatures.keeper_carryover is false', () => expect(contract.enabledFeatures.keeper_carryover).toBe(false))

  // Player pool
  it('playerPoolRules.includeNflPlayers is true', () => expect(contract.playerPoolRules.includeNflPlayers).toBe(true))
  it('playerPoolRules.includeCollegePlayers is false', () => expect(contract.playerPoolRules.includeCollegePlayers).toBe(false))

  // Tabs
  it('tabsEnabled includes guillotine_standings', () => expect(contract.tabsEnabled.guillotine_standings).toBe(true))
  it('tabsEnabled includes elimination_history', () => expect(contract.tabsEnabled.elimination_history).toBe(true))
  it('tabsEnabled.settings is commissioner', () => expect(contract.tabsEnabled.settings).toBe('commissioner'))

  // Draft: no 3RR for guillotine
  it('draftSettings.thirdRoundReversal is false', () => expect(contract.draftSettings.thirdRoundReversal).toBe(false))
  it('draftSettings.preDraftRankingSource is adp', () => expect(contract.draftSettings.preDraftRankingSource).toBe('adp'))
})

// ── NFL guillotine auction ────────────────────────────────────────────────────

describe('getGuillotineDefaultContract — NFL auction', () => {
  const contract = getGuillotineDefaultContract({ sport: 'NFL', draftType: 'auction' })!

  it('draft_type is auction', () => expect(contract.draft_type).toBe('auction'))
  it('auctionBudgetPerTeam is 200', () => expect(contract.draftSettings.auctionBudgetPerTeam).toBe(200))
})

// ── NFL guillotine linear ─────────────────────────────────────────────────────

describe('getGuillotineDefaultContract — NFL linear', () => {
  const contract = getGuillotineDefaultContract({ sport: 'NFL', draftType: 'linear' })!

  it('draft_type is linear', () => expect(contract.draft_type).toBe('linear'))
  it('pickOrderRules is linear', () => expect(contract.draftSettings.pickOrderRules).toBe('linear'))
  it('auctionBudgetPerTeam is null', () => expect(contract.draftSettings.auctionBudgetPerTeam).toBeNull())
})

// ── NCAAF guillotine contract ─────────────────────────────────────────────────

describe('getGuillotineDefaultContract — NCAAF', () => {
  const contract = getGuillotineDefaultContract({ sport: 'NCAAF', draftType: 'snake' })!

  it('returns non-null for NCAAF', () => expect(contract).not.toBeNull())

  // NCAAF: 14-week season → 13 teams
  it('teams defaults to 13', () => expect(contract.teams).toBe(13))

  // Roster: 9 starters, 5 bench, 0 IR → 14 total
  it('rosterTemplate.totalRosterSlots is 14', () => expect(contract.rosterTemplate.totalRosterSlots).toBe(14))
  it('rosterTemplate.benchSlots is 5', () => expect(contract.rosterTemplate.benchSlots).toBe(5))
  it('rosterTemplate.irSlots is 0', () => expect(contract.rosterTemplate.irSlots).toBe(0))
  it('NCAAF starters include DEF not DST', () => {
    expect(contract.rosterTemplate.starterSlots).toHaveProperty('DEF')
    expect(contract.rosterTemplate.starterSlots).not.toHaveProperty('DST')
  })
  it('rosterTemplate.defensePosition is DEF', () => expect(contract.rosterTemplate.defensePosition).toBe('DEF'))

  // Pool isolation
  it('playerPoolRules.includeNflPlayers is false', () => expect(contract.playerPoolRules.includeNflPlayers).toBe(false))
  it('playerPoolRules.includeCollegePlayers is true', () => expect(contract.playerPoolRules.includeCollegePlayers).toBe(true))
  it('playerPoolRules.collegeOnly is true', () => expect(contract.playerPoolRules.collegeOnly).toBe(true))
  it('playerPoolRules.excludeNflPool is true', () => expect(contract.playerPoolRules.excludeNflPool).toBe(true))

  // Scoring
  it('scoring_preset_id defaults to ncaaf_half_ppr', () => expect(contract.scoring_preset_id).toBe('ncaaf_half_ppr'))

  // NCAAF: 14-week season
  it('eliminationSettings.eliminationEndWeek is 14', () => expect(contract.eliminationSettings.eliminationEndWeek).toBe(14))

  // NCAAF waiver runs Monday
  it('waiverSettings.waiverProcessingDays includes 1 (Monday)', () => {
    expect(contract.waiverSettings.waiverProcessingDays).toContain(1)
  })

  // Queue limit higher for NCAAF
  it('draftSettings.queueSizeLimit is 70', () => expect(contract.draftSettings.queueSizeLimit).toBe(70))
})

// ── returns null for non-eligible sport ──────────────────────────────────────

describe('getGuillotineDefaultContract — ineligible', () => {
  it('returns null for NBA', () => expect(getGuillotineDefaultContract({ sport: 'NBA' })).toBeNull())
  it('returns null for empty', () => expect(getGuillotineDefaultContract({ sport: '' })).toBeNull())
})

// ── buildGuillotineSettingsSnapshot ──────────────────────────────────────────

describe('buildGuillotineSettingsSnapshot', () => {
  it('returns null for ineligible sport', () => {
    expect(buildGuillotineSettingsSnapshot({ sport: 'NBA' })).toBeNull()
  })

  it('sets guillotineDefaultsVersion marker', () => {
    const snap = buildGuillotineSettingsSnapshot({ sport: 'NFL' })!
    expect(snap.guillotineDefaultsVersion).toBe(1)
  })

  it('isGuillotine is true', () => {
    expect(buildGuillotineSettingsSnapshot({ sport: 'NFL' })!.isGuillotine).toBe(true)
  })

  it('ir_slots is 0', () => {
    expect(buildGuillotineSettingsSnapshot({ sport: 'NFL' })!.ir_slots).toBe(0)
  })

  it('taxi_slots is 0', () => {
    expect(buildGuillotineSettingsSnapshot({ sport: 'NFL' })!.taxi_slots).toBe(0)
  })

  it('elimination_settings is present', () => {
    const snap = buildGuillotineSettingsSnapshot({ sport: 'NFL' })!
    expect(snap.elimination_settings).toBeDefined()
  })

  it('waiver_type is faab', () => {
    const snap = buildGuillotineSettingsSnapshot({ sport: 'NFL' })!
    expect(snap.waiver_type).toBe('faab')
  })

  it('faab_budget_per_team is 100', () => {
    const snap = buildGuillotineSettingsSnapshot({ sport: 'NFL' })!
    expect(snap.faab_budget_per_team).toBe(100)
  })

  it('devyConfig.enabled is false', () => {
    const snap = buildGuillotineSettingsSnapshot({ sport: 'NFL' })!
    expect((snap.devyConfig as { enabled: boolean }).enabled).toBe(false)
  })

  it('c2cConfig.enabled is false', () => {
    const snap = buildGuillotineSettingsSnapshot({ sport: 'NFL' })!
    expect((snap.c2cConfig as { enabled: boolean }).enabled).toBe(false)
  })

  it('keeperSettings.enabled is false', () => {
    const snap = buildGuillotineSettingsSnapshot({ sport: 'NFL' })!
    expect((snap.keeperSettings as { enabled: boolean }).enabled).toBe(false)
  })

  it('rookieDraftConfig.enabled is false', () => {
    const snap = buildGuillotineSettingsSnapshot({ sport: 'NFL' })!
    expect((snap.rookieDraftConfig as { enabled: boolean }).enabled).toBe(false)
  })

  it('NCAAF pool has excludeNflPool flag', () => {
    const snap = buildGuillotineSettingsSnapshot({ sport: 'NCAAF' })!
    expect((snap.playerPoolRules as Record<string, unknown>).excludeNflPool).toBe(true)
  })
})

// ── normalizeGuillotineSettingsSnapshot ──────────────────────────────────────

describe('normalizeGuillotineSettingsSnapshot', () => {
  it('enforces league_type = guillotine even if user sets dynasty', () => {
    const result = normalizeGuillotineSettingsSnapshot({
      sport: 'NFL',
      settings: { league_type: 'dynasty', leagueType: 'dynasty' },
    })
    expect(result.league_type).toBe('guillotine')
    expect(result.leagueType).toBe('guillotine')
  })

  it('enforces roster_mode = guillotine', () => {
    const result = normalizeGuillotineSettingsSnapshot({
      sport: 'NFL',
      settings: { roster_mode: 'redraft' },
    })
    expect(result.roster_mode).toBe('guillotine')
  })

  it('blocks taxi injection', () => {
    const result = normalizeGuillotineSettingsSnapshot({
      sport: 'NFL',
      settings: { taxi: true, taxi_enabled: true, taxi_slots: 5 },
    })
    expect(result.taxi).toBe(false)
    expect(result.taxi_slots).toBe(0)
  })

  it('blocks devy injection', () => {
    const result = normalizeGuillotineSettingsSnapshot({
      sport: 'NFL',
      settings: { devy: true, devy_enabled: true, devyConfig: { enabled: true } },
    })
    expect(result.devy).toBe(false)
    expect((result.devyConfig as { enabled: boolean }).enabled).toBe(false)
  })

  it('blocks C2C injection', () => {
    const result = normalizeGuillotineSettingsSnapshot({
      sport: 'NFL',
      settings: { c2c: true, c2cConfig: { enabled: true } },
    })
    expect(result.c2c).toBe(false)
    expect((result.c2cConfig as { enabled: boolean }).enabled).toBe(false)
  })

  it('blocks keeper carryover injection', () => {
    const result = normalizeGuillotineSettingsSnapshot({
      sport: 'NFL',
      settings: { keeper_dynasty_carryover_supported: true },
    })
    expect(result.keeper_dynasty_carryover_supported).toBe(false)
  })

  it('blocks future picks injection', () => {
    const result = normalizeGuillotineSettingsSnapshot({
      sport: 'NFL',
      settings: { future_picks: true, future_picks_enabled: true },
    })
    expect(result.future_picks).toBe(false)
    expect(result.future_picks_enabled).toBe(false)
  })

  it('enforces ir_slots = 0', () => {
    const result = normalizeGuillotineSettingsSnapshot({
      sport: 'NFL',
      settings: { ir_slots: 3 },
    })
    expect(result.ir_slots).toBe(0)
  })

  it('preserves leagueName', () => {
    const result = normalizeGuillotineSettingsSnapshot({
      sport: 'NFL',
      settings: { leagueName: 'Chop Shop' },
    })
    expect(result.leagueName).toBe('Chop Shop')
  })

  it('preserves language', () => {
    const result = normalizeGuillotineSettingsSnapshot({
      sport: 'NFL',
      settings: { language: 'es' },
    })
    expect(result.language).toBe('es')
  })

  it('preserves timezone', () => {
    const result = normalizeGuillotineSettingsSnapshot({
      sport: 'NFL',
      settings: { timezone: 'America/Denver' },
    })
    expect(result.timezone).toBe('America/Denver')
  })
})

// ── Concept preset catalog ────────────────────────────────────────────────────

describe('CONCEPT_PRESET_CATALOG — guillotine entries', () => {
  const nflEntry = CONCEPT_PRESET_CATALOG.find(
    (p) => p.sport === 'NFL' && p.leagueType === 'guillotine',
  )
  const ncaafEntry = CONCEPT_PRESET_CATALOG.find(
    (p) => p.sport === 'NCAAF' && p.leagueType === 'guillotine',
  )

  it('NFL guillotine entry exists', () => expect(nflEntry).toBeDefined())
  it('NCAAF guillotine entry exists', () => expect(ncaafEntry).toBeDefined())

  it('NFL defaultTeamCount is 17', () => expect(nflEntry?.defaultTeamCount).toBe(17))
  it('NCAAF defaultTeamCount is 13', () => expect(ncaafEntry?.defaultTeamCount).toBe(13))

  it('NFL allows snake', () => expect(nflEntry?.draftTypesAllowed).toContain('snake'))
  it('NFL allows linear', () => expect(nflEntry?.draftTypesAllowed).toContain('linear'))
  it('NFL allows auction', () => expect(nflEntry?.draftTypesAllowed).toContain('auction'))
  it('NCAAF allows snake', () => expect(ncaafEntry?.draftTypesAllowed).toContain('snake'))
  it('NCAAF allows linear', () => expect(ncaafEntry?.draftTypesAllowed).toContain('linear'))
  it('NCAAF allows auction', () => expect(ncaafEntry?.draftTypesAllowed).toContain('auction'))

  it('NFL rosterSlots is 9', () => expect(nflEntry?.rosterSlots).toBe(9))
  it('NFL benchSlots is 6', () => expect(nflEntry?.benchSlots).toBe(6))
  it('NCAAF rosterSlots is 9', () => expect(ncaafEntry?.rosterSlots).toBe(9))
  it('NCAAF benchSlots is 5', () => expect(ncaafEntry?.benchSlots).toBe(5))

  it('both are launch_ready', () => {
    expect(nflEntry?.readiness).toBe('launch_ready')
    expect(ncaafEntry?.readiness).toBe('launch_ready')
  })

  it('both have guillotine modifier', () => {
    expect(nflEntry?.metadata.modifiers).toContain('guillotine')
    expect(ncaafEntry?.metadata.modifiers).toContain('guillotine')
  })

  it('both include guillotine_danger_alert AI feature', () => {
    expect(nflEntry?.aiEnabledFeatures).toContain('guillotine_danger_alert')
    expect(ncaafEntry?.aiEnabledFeatures).toContain('guillotine_danger_alert')
  })
})

// ── resolveConceptPreset ──────────────────────────────────────────────────────

describe('resolveConceptPreset — guillotine', () => {
  it('NFL guillotine resolves and returns guillotine snapshot', () => {
    const result = resolveConceptPreset({
      sport: 'NFL',
      leagueType: 'guillotine',
      scoringPreset: 'fb_half_ppr',
      draftType: 'snake',
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.settingsSnapshot.league_type).toBe('guillotine')
    expect(result.settingsSnapshot.isGuillotine).toBe(true)
  })

  it('NCAAF guillotine resolves with NCAAF pool isolation', () => {
    const result = resolveConceptPreset({
      sport: 'NCAAF',
      leagueType: 'guillotine',
      scoringPreset: 'ncaaf_half_ppr',
      draftType: 'snake',
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    const pool = result.settingsSnapshot.playerPoolRules as Record<string, unknown>
    expect(pool.includeNflPlayers).toBe(false)
    expect(pool.collegeOnly).toBe(true)
  })

  it('NFL guillotine auction resolves correctly', () => {
    const result = resolveConceptPreset({
      sport: 'NFL',
      leagueType: 'guillotine',
      scoringPreset: 'fb_half_ppr',
      draftType: 'auction',
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    const draft = result.settingsSnapshot.draftSettings as Record<string, unknown>
    expect(draft.draftType).toBe('auction')
    expect(draft.auctionBudgetPerTeam).toBe(200)
  })

  it('NFL guillotine snapshot includes elimination settings', () => {
    const result = resolveConceptPreset({
      sport: 'NFL',
      leagueType: 'guillotine',
      scoringPreset: 'fb_half_ppr',
      draftType: 'snake',
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.settingsSnapshot.elimination_settings).toBeDefined()
    expect(result.settingsSnapshot.faab_enabled).toBe(true)
  })
})

// ── mergeConceptPresetSettings ────────────────────────────────────────────────

describe('mergeConceptPresetSettings — guillotine guardrails', () => {
  it('blocks devy injection on merge', () => {
    const preset = buildGuillotineSettingsSnapshot({ sport: 'NFL' })!
    const merged = mergeConceptPresetSettings(preset, {
      devy: true,
      devy_enabled: true,
      league_type: 'guillotine',
      leagueType: 'guillotine',
    })
    expect(merged.devy).toBe(false)
  })

  it('blocks keeper injection on merge', () => {
    const preset = buildGuillotineSettingsSnapshot({ sport: 'NFL' })!
    const merged = mergeConceptPresetSettings(preset, {
      keeper_dynasty_carryover_supported: true,
      league_type: 'guillotine',
      leagueType: 'guillotine',
    })
    expect(merged.keeper_dynasty_carryover_supported).toBe(false)
  })

  it('preserves leagueName through merge', () => {
    const preset = buildGuillotineSettingsSnapshot({ sport: 'NFL' })!
    const merged = mergeConceptPresetSettings(preset, {
      leagueName: 'The Chop Block',
      league_type: 'guillotine',
      leagueType: 'guillotine',
    })
    expect(merged.leagueName).toBe('The Chop Block')
  })
})

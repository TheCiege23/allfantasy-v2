import { describe, it, expect } from 'vitest'
import {
  isTournamentEligibleSport,
  TOURNAMENT_DRAFT_TYPE_IDS,
  getTournamentDefaultContract,
  buildTournamentSettingsSnapshot,
  normalizeTournamentSettingsSnapshot,
  validateTournamentStructure,
} from '../lib/league-concepts/tournamentDefaults'
import { resolveConceptPreset, mergeConceptPresetSettings } from '../lib/league-concepts/resolveConceptPreset'
import { CONCEPT_PRESET_CATALOG } from '../lib/league-concepts/conceptPresetCatalog'

// ── isTournamentEligibleSport ─────────────────────────────────────────────────

describe('isTournamentEligibleSport', () => {
  it('returns true for NFL', () => expect(isTournamentEligibleSport('NFL')).toBe(true))
  it('returns true for NCAAF', () => expect(isTournamentEligibleSport('NCAAF')).toBe(true))
  it('returns true for lowercase nfl', () => expect(isTournamentEligibleSport('nfl')).toBe(true))
  it('returns false for NBA', () => expect(isTournamentEligibleSport('NBA')).toBe(false))
  it('returns false for null', () => expect(isTournamentEligibleSport(null)).toBe(false))
  it('returns false for empty string', () => expect(isTournamentEligibleSport('')).toBe(false))
})

// ── TOURNAMENT_DRAFT_TYPE_IDS ─────────────────────────────────────────────────

describe('TOURNAMENT_DRAFT_TYPE_IDS', () => {
  it('includes snake, linear, auction', () => {
    expect(TOURNAMENT_DRAFT_TYPE_IDS).toContain('snake')
    expect(TOURNAMENT_DRAFT_TYPE_IDS).toContain('linear')
    expect(TOURNAMENT_DRAFT_TYPE_IDS).toContain('auction')
  })
  it('has exactly 3 entries', () => expect(TOURNAMENT_DRAFT_TYPE_IDS).toHaveLength(3))
})

// ── getTournamentDefaultContract — NFL ────────────────────────────────────────

describe('getTournamentDefaultContract — NFL', () => {
  const contract = getTournamentDefaultContract({ sport: 'NFL' })!

  it('returns a contract for NFL', () => expect(contract).not.toBeNull())
  it('league_type is tournament', () => expect(contract.league_type).toBe('tournament'))
  it('tournament_enabled is true', () => expect(contract.tournament_enabled).toBe(true))
  it('tournament_phase is setup', () => expect(contract.tournament_phase).toBe('setup'))
  it('draft_type is snake by default', () => expect(contract.draft_type).toBe('snake'))
  it('roster_mode is tournament', () => expect(contract.roster_mode).toBe('tournament'))

  it('rosterTemplate has 9 starter slots', () => {
    const total = Object.values(contract.rosterTemplate.starterSlots).reduce((a, b) => a + b, 0)
    expect(total).toBe(9)
  })
  it('rosterTemplate bench = 4', () => expect(contract.rosterTemplate.benchSlots).toBe(4))
  it('rosterTemplate IR = 0', () => expect(contract.rosterTemplate.irSlots).toBe(0))
  it('rosterTemplate taxi = 0', () => expect(contract.rosterTemplate.taxiSlots).toBe(0))
  it('NFL uses DST position', () => expect(contract.rosterTemplate.defensePosition).toBe('DST'))
  it('totalRosterSlots = 13', () => expect(contract.rosterTemplate.totalRosterSlots).toBe(13))

  it('scoringPreset is fb_half_ppr', () => expect(contract.scoring_preset_id).toBe('fb_half_ppr'))
  it('NFL pool: includeNflPlayers true', () => expect(contract.playerPoolRules.includeNflPlayers).toBe(true))
  it('NFL pool: includeCollegePlayers false', () => expect(contract.playerPoolRules.includeCollegePlayers).toBe(false))
  it('NFL pool: collegeOnly false', () => expect(contract.playerPoolRules.collegeOnly).toBe(false))

  it('tournament structure: participantCount = 96', () => expect(contract.tournamentStructure.participantCount).toBe(96))
  it('tournament structure: conferenceCount = 8', () => expect(contract.tournamentStructure.conferenceCount).toBe(8))
  it('tournament structure: teamsPerLeague = 12', () => expect(contract.tournamentStructure.teamsPerLeague).toBe(12))
  it('tournament structure: totalRounds = 3', () => expect(contract.tournamentStructure.totalRounds).toBe(3))
  it('tournament structure: advancersPerLeague = 2', () => expect(contract.tournamentStructure.advancersPerLeague).toBe(2))
  it('tournament structure: bubbleEnabled = true', () => expect(contract.tournamentStructure.bubbleEnabled).toBe(true))
  it('tournament structure: redraftBetweenRounds = true', () => expect(contract.tournamentStructure.redraftBetweenRounds).toBe(true))
  it('tournament structure: tradesEnabled = false', () => expect(contract.tournamentStructure.tradesEnabled).toBe(false))
  it('childLeagueGenerationStatus = not_started (Phase 1)', () => {
    expect(contract.tournamentStructure.childLeagueGenerationStatus).toBe('not_started')
  })

  it('enabledFeatures.tournament_enabled = true', () => expect(contract.enabledFeatures.tournament_enabled).toBe(true))
  it('enabledFeatures.child_league_generation = false (Phase 2)', () => {
    expect(contract.enabledFeatures.child_league_generation).toBe(false)
  })
  it('enabledFeatures.trades = false', () => expect(contract.enabledFeatures.trades).toBe(false))
  it('enabledFeatures.taxi = false', () => expect(contract.enabledFeatures.taxi).toBe(false))
  it('enabledFeatures.devy = false', () => expect(contract.enabledFeatures.devy).toBe(false))
  it('enabledFeatures.c2c = false', () => expect(contract.enabledFeatures.c2c).toBe(false))
  it('enabledFeatures.keeper_carryover = false', () => expect(contract.enabledFeatures.keeper_carryover).toBe(false))

  it('tabsEnabled has tournament_hub', () => expect(contract.tabsEnabled.tournament_hub).toBe(true))
  it('tabsEnabled has advancement', () => expect(contract.tabsEnabled.advancement).toBe(true))
  it('tabsEnabled settings is commissioner', () => expect(contract.tabsEnabled.settings).toBe('commissioner'))
  it('tabsEnabled does not have child_leagues (Phase 2)', () => {
    expect((contract.tabsEnabled as Record<string, unknown>).child_leagues).toBeUndefined()
  })

  it('creationPlan.childLeagueGenerationStatus = not_started', () => {
    expect(contract.creationPlan.childLeagueGenerationStatus).toBe('not_started')
  })
  it('creationPlan.expectedChildLeagueCount = 8', () => {
    expect(contract.creationPlan.expectedChildLeagueCount).toBe(8)
  })
})

// ── getTournamentDefaultContract — NCAAF ─────────────────────────────────────

describe('getTournamentDefaultContract — NCAAF', () => {
  const contract = getTournamentDefaultContract({ sport: 'NCAAF' })!

  it('returns a contract for NCAAF', () => expect(contract).not.toBeNull())
  it('sport is NCAAF', () => expect(contract.sport).toBe('NCAAF'))
  it('NCAAF uses DEF position', () => expect(contract.rosterTemplate.defensePosition).toBe('DEF'))
  it('DEF in draftablePlayerPositions', () => {
    expect(contract.rosterTemplate.draftablePlayerPositions).toContain('DEF')
  })
  it('DST not in NCAAF draftablePlayerPositions', () => {
    expect(contract.rosterTemplate.draftablePlayerPositions).not.toContain('DST')
  })

  it('NCAAF pool: includeCollegePlayers true', () => expect(contract.playerPoolRules.includeCollegePlayers).toBe(true))
  it('NCAAF pool: includeNflPlayers false', () => expect(contract.playerPoolRules.includeNflPlayers).toBe(false))
  it('NCAAF pool: collegeOnly true', () => expect(contract.playerPoolRules.collegeOnly).toBe(true))
  it('NCAAF pool: excludeNflPool true', () => expect(contract.playerPoolRules.excludeNflPool).toBe(true))

  it('scoringPreset is ncaaf_half_ppr', () => expect(contract.scoring_preset_id).toBe('ncaaf_half_ppr'))
  it('structure participantCount = 96', () => expect(contract.tournamentStructure.participantCount).toBe(96))
  it('structure teamsPerLeague = 12', () => expect(contract.tournamentStructure.teamsPerLeague).toBe(12))

  it('returns null for invalid sport', () => {
    expect(getTournamentDefaultContract({ sport: 'NBA' })).toBeNull()
  })
})

// ── Auction draft type ────────────────────────────────────────────────────────

describe('getTournamentDefaultContract — auction draft', () => {
  const contract = getTournamentDefaultContract({ sport: 'NFL', draftType: 'auction' })!

  it('draft_type is auction', () => expect(contract.draft_type).toBe('auction'))
  it('draftSettings.draftType is auction', () => expect(contract.draftSettings.draftType).toBe('auction'))
  it('auctionBudgetPerTeam is 200', () => expect(contract.draftSettings.auctionBudgetPerTeam).toBe(200))
  it('pickOrderRules is snake for auction', () => expect(contract.draftSettings.pickOrderRules).toBe('snake'))
})

// ── Linear draft type ─────────────────────────────────────────────────────────

describe('getTournamentDefaultContract — linear draft', () => {
  const contract = getTournamentDefaultContract({ sport: 'NFL', draftType: 'linear' })!

  it('draft_type is linear', () => expect(contract.draft_type).toBe('linear'))
  it('pickOrderRules is linear', () => expect(contract.draftSettings.pickOrderRules).toBe('linear'))
  it('auctionBudgetPerTeam is null', () => expect(contract.draftSettings.auctionBudgetPerTeam).toBeNull())
})

// ── buildTournamentSettingsSnapshot ──────────────────────────────────────────

describe('buildTournamentSettingsSnapshot — NFL', () => {
  const snap = buildTournamentSettingsSnapshot({ sport: 'NFL' })!

  it('returns non-null for NFL', () => expect(snap).not.toBeNull())
  it('league_type = tournament', () => expect(snap.league_type).toBe('tournament'))
  it('isTournament = true', () => expect(snap.isTournament).toBe(true))
  it('isDynasty = false', () => expect(snap.isDynasty).toBe(false))
  it('isGuillotine = false', () => expect(snap.isGuillotine).toBe(false))
  it('isKeeper = false', () => expect(snap.isKeeper).toBe(false))

  it('ir_slots = 0', () => expect(snap.ir_slots).toBe(0))
  it('taxi_slots = 0', () => expect(snap.taxi_slots).toBe(0))
  it('taxi_enabled = false', () => expect(snap.taxi_enabled).toBe(false))
  it('future_picks = false', () => expect(snap.future_picks).toBe(false))
  it('devy_enabled = false', () => expect(snap.devy_enabled).toBe(false))
  it('c2c_enabled = false', () => expect(snap.c2c_enabled).toBe(false))

  it('has tournamentStructure block', () => expect(snap.tournamentStructure).toBeDefined())
  it('has tournament_structure block', () => expect(snap.tournament_structure).toBeDefined())
  it('participant_count = 96', () => expect(snap.participant_count).toBe(96))
  it('child_league_generation_status = not_started', () => {
    expect(snap.child_league_generation_status).toBe('not_started')
  })

  it('has creationPlan block', () => expect(snap.creationPlan).toBeDefined())
  it('creationPlan roundPlanStatuses has 3 entries', () => {
    const plan = snap.creationPlan as Record<string, unknown>
    expect(Array.isArray(plan.roundPlanStatuses)).toBe(true)
    expect((plan.roundPlanStatuses as unknown[]).length).toBe(3)
  })

  it('returns null for unsupported sport', () => {
    expect(buildTournamentSettingsSnapshot({ sport: 'NBA' })).toBeNull()
  })
})

// ── normalizeTournamentSettingsSnapshot ──────────────────────────────────────

describe('normalizeTournamentSettingsSnapshot', () => {
  it('enforces league_type = tournament', () => {
    const result = normalizeTournamentSettingsSnapshot({
      sport: 'NFL',
      settings: { league_type: 'dynasty' },
    })
    expect(result.league_type).toBe('tournament')
  })

  it('enforces isTournament = true', () => {
    const result = normalizeTournamentSettingsSnapshot({
      sport: 'NFL',
      settings: { isTournament: false },
    })
    expect(result.isTournament).toBe(true)
  })

  it('blocks taxi', () => {
    const result = normalizeTournamentSettingsSnapshot({
      sport: 'NFL',
      settings: { taxi_enabled: true, taxi_slots: 3 },
    })
    expect(result.taxi_enabled).toBe(false)
    expect(result.taxi_slots).toBe(0)
  })

  it('blocks devy', () => {
    const result = normalizeTournamentSettingsSnapshot({
      sport: 'NFL',
      settings: { devy: true, devy_enabled: true },
    })
    expect(result.devy).toBe(false)
    expect(result.devy_enabled).toBe(false)
  })

  it('blocks c2c', () => {
    const result = normalizeTournamentSettingsSnapshot({
      sport: 'NFL',
      settings: { c2c: true, c2c_enabled: true },
    })
    expect(result.c2c).toBe(false)
    expect(result.c2c_enabled).toBe(false)
  })

  it('blocks keeper_carryover', () => {
    const result = normalizeTournamentSettingsSnapshot({
      sport: 'NFL',
      settings: { keeper_carryover: true },
    })
    expect(result.keeper_carryover).toBe(false)
  })

  it('blocks future picks', () => {
    const result = normalizeTournamentSettingsSnapshot({
      sport: 'NFL',
      settings: { future_picks_enabled: true },
    })
    expect(result.future_picks_enabled).toBe(false)
  })

  it('preserves leagueName from incoming settings', () => {
    const result = normalizeTournamentSettingsSnapshot({
      sport: 'NFL',
      settings: { leagueName: 'My Tournament' },
    })
    expect(result.leagueName).toBe('My Tournament')
  })

  it('preserves timezone from incoming settings', () => {
    const result = normalizeTournamentSettingsSnapshot({
      sport: 'NFL',
      settings: { timezone: 'America/Chicago' },
    })
    expect(result.timezone).toBe('America/Chicago')
  })

  it('re-applies canonical draftSettings after merge', () => {
    const result = normalizeTournamentSettingsSnapshot({
      sport: 'NFL',
      draftType: 'auction',
      settings: { draft_type: 'snake' },
    })
    expect(result.draft_type).toBe('auction')
    const ds = result.draftSettings as Record<string, unknown>
    expect(ds.draftType).toBe('auction')
  })

  it('keeps child_league_generation_status = not_started always', () => {
    const result = normalizeTournamentSettingsSnapshot({
      sport: 'NFL',
      settings: { child_league_generation_status: 'generated' },
    })
    expect(result.child_league_generation_status).toBe('not_started')
  })
})

// ── validateTournamentStructure ───────────────────────────────────────────────

describe('validateTournamentStructure', () => {
  const valid = {
    participantCount: 96,
    conferenceCount: 8,
    leaguesPerConference: 1,
    teamsPerLeague: 12,
    totalRounds: 3,
    advancersPerLeague: 2,
  }

  it('passes for canonical NFL structure', () => {
    const result = validateTournamentStructure(valid)
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('fails when participantCount does not match math', () => {
    const result = validateTournamentStructure({ ...valid, participantCount: 100 })
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.includes('participantCount'))).toBe(true)
  })

  it('fails when advancersPerLeague >= teamsPerLeague', () => {
    const result = validateTournamentStructure({ ...valid, advancersPerLeague: 12 })
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.includes('advancersPerLeague'))).toBe(true)
  })

  it('fails when totalRounds < 1', () => {
    const result = validateTournamentStructure({ ...valid, totalRounds: 0 })
    expect(result.valid).toBe(false)
  })

  it('fails when teamsPerLeague < 2', () => {
    const result = validateTournamentStructure({ ...valid, teamsPerLeague: 1, participantCount: 8 })
    expect(result.valid).toBe(false)
  })
})

// ── Catalog entries ───────────────────────────────────────────────────────────

describe('conceptPresetCatalog — tournament entries', () => {
  const nfl = CONCEPT_PRESET_CATALOG.find(
    p => p.sport === 'NFL' && p.leagueType === 'tournament',
  )
  const ncaaf = CONCEPT_PRESET_CATALOG.find(
    p => p.sport === 'NCAAF' && p.leagueType === 'tournament',
  )

  it('NFL tournament catalog entry exists', () => expect(nfl).toBeDefined())
  it('NCAAF tournament catalog entry exists', () => expect(ncaaf).toBeDefined())

  it('NFL defaultTeamCount = 12', () => expect(nfl?.defaultTeamCount).toBe(12))
  it('NCAAF defaultTeamCount = 12', () => expect(ncaaf?.defaultTeamCount).toBe(12))

  it('NFL draftTypesAllowed includes snake, linear, auction', () => {
    expect(nfl?.draftTypesAllowed).toContain('snake')
    expect(nfl?.draftTypesAllowed).toContain('linear')
    expect(nfl?.draftTypesAllowed).toContain('auction')
  })

  it('NCAAF draftTypesAllowed includes snake, linear, auction', () => {
    expect(ncaaf?.draftTypesAllowed).toContain('snake')
    expect(ncaaf?.draftTypesAllowed).toContain('linear')
    expect(ncaaf?.draftTypesAllowed).toContain('auction')
  })

  it('NFL modifiers include tournament', () => expect(nfl?.metadata.modifiers).toContain('tournament'))
  it('NCAAF modifiers include tournament', () => expect(ncaaf?.metadata.modifiers).toContain('tournament'))

  it('NFL rosterSlots = 9', () => expect(nfl?.rosterSlots).toBe(9))
  it('NFL benchSlots = 4', () => expect(nfl?.benchSlots).toBe(4))
  it('NFL irSlots = 0', () => expect(nfl?.irSlots).toBe(0))

  it('NCAAF scoringPreset = ncaaf_half_ppr', () => expect(ncaaf?.scoringPreset).toBe('ncaaf_half_ppr'))
})

// ── resolveConceptPreset integration ─────────────────────────────────────────

describe('resolveConceptPreset — tournament', () => {
  it('NFL snake resolves ok', () => {
    const result = resolveConceptPreset({
      sport: 'NFL',
      leagueType: 'tournament',
      scoringPreset: 'fb_half_ppr',
      draftType: 'snake',
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.settingsSnapshot.league_type).toBe('tournament')
    expect(result.settingsSnapshot.isTournament).toBe(true)
  })

  it('NFL auction resolves ok and draftType is auction', () => {
    const result = resolveConceptPreset({
      sport: 'NFL',
      leagueType: 'tournament',
      scoringPreset: 'fb_half_ppr',
      draftType: 'auction',
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    const ds = result.settingsSnapshot.draftSettings as Record<string, unknown>
    expect(ds.draftType).toBe('auction')
  })

  it('NCAAF snake resolves ok', () => {
    const result = resolveConceptPreset({
      sport: 'NCAAF',
      leagueType: 'tournament',
      scoringPreset: 'ncaaf_half_ppr',
      draftType: 'snake',
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.settingsSnapshot.sport).toBe('NCAAF')
    expect(result.settingsSnapshot.league_type).toBe('tournament')
  })

  it('NCAAF has college-only pool', () => {
    const result = resolveConceptPreset({
      sport: 'NCAAF',
      leagueType: 'tournament',
      scoringPreset: 'ncaaf_half_ppr',
      draftType: 'snake',
    })
    if (!result.ok) return
    const pool = result.settingsSnapshot.playerPoolRules as Record<string, unknown>
    expect(pool.includeCollegePlayers).toBe(true)
    expect(pool.includeNflPlayers).toBe(false)
  })

  it('tournament snapshot has tournamentStructure', () => {
    const result = resolveConceptPreset({
      sport: 'NFL',
      leagueType: 'tournament',
      scoringPreset: 'fb_half_ppr',
      draftType: 'snake',
    })
    if (!result.ok) return
    expect(result.settingsSnapshot.tournamentStructure).toBeDefined()
    expect((result.settingsSnapshot.tournamentStructure as Record<string, unknown>).participantCount).toBe(96)
  })

  it('devy_enabled is blocked in tournament snapshot', () => {
    const result = resolveConceptPreset({
      sport: 'NFL',
      leagueType: 'tournament',
      scoringPreset: 'fb_half_ppr',
      draftType: 'snake',
    })
    if (!result.ok) return
    expect(result.settingsSnapshot.devy_enabled).toBe(false)
  })
})

// ── mergeConceptPresetSettings integration ────────────────────────────────────

describe('mergeConceptPresetSettings — tournament', () => {
  const baseSnap = buildTournamentSettingsSnapshot({ sport: 'NFL' }) ?? {}

  it('devy blocked after merge', () => {
    const result = mergeConceptPresetSettings(baseSnap, { devy: true })
    expect(result.devy).toBe(false)
  })

  it('keeper blocked after merge', () => {
    const result = mergeConceptPresetSettings(baseSnap, { keeper_carryover: true })
    expect(result.keeper_carryover).toBe(false)
  })

  it('league_type stays tournament after merge', () => {
    const result = mergeConceptPresetSettings(baseSnap, { league_type: 'dynasty' })
    expect(result.league_type).toBe('tournament')
  })

  it('leagueName preserved from league settings', () => {
    const result = mergeConceptPresetSettings(baseSnap, { leagueName: 'Big Dance 2026' })
    expect(result.leagueName).toBe('Big Dance 2026')
  })

  it('child_league_generation_status stays not_started', () => {
    const result = mergeConceptPresetSettings(
      baseSnap,
      { child_league_generation_status: 'generated' },
    )
    expect(result.child_league_generation_status).toBe('not_started')
  })
})

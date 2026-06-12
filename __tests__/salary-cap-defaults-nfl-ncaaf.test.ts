/**
 * Salary Cap Defaults — NFL + NCAAF Phase 1
 * Tests the canonical defaults contract, settings snapshot builder, normalizer,
 * preset catalog wiring, and guardrails.
 */

import { describe, it, expect } from 'vitest'
import {
  isSalaryCapEligibleSport,
  normalizeSalaryCapDraftType,
  getSalaryCapDefaultContract,
  buildSalaryCapSettingsSnapshot,
  normalizeSalaryCapSettingsSnapshot,
  validateSalaryCapStructure,
  SALARY_CAP_DRAFT_TYPE_IDS,
} from '../lib/league-concepts/salaryCapDefaults'
import { resolveConceptPreset } from '../lib/league-concepts/resolveConceptPreset'
import { CONCEPT_PRESET_CATALOG } from '../lib/league-concepts/conceptPresetCatalog'

// ── Sport eligibility ─────────────────────────────────────────────────────────

describe('isSalaryCapEligibleSport', () => {
  it('returns true for NFL and NCAAF', () => {
    expect(isSalaryCapEligibleSport('NFL')).toBe(true)
    expect(isSalaryCapEligibleSport('NCAAF')).toBe(true)
    expect(isSalaryCapEligibleSport('nfl')).toBe(true)
  })
  it('returns false for other sports', () => {
    expect(isSalaryCapEligibleSport('NBA')).toBe(false)
    expect(isSalaryCapEligibleSport('MLB')).toBe(false)
    expect(isSalaryCapEligibleSport('')).toBe(false)
  })
})

// ── Draft type normalization ──────────────────────────────────────────────────

describe('normalizeSalaryCapDraftType', () => {
  it('returns auction for auction input', () => {
    expect(normalizeSalaryCapDraftType('auction')).toBe('auction')
  })
  it('rejects snake and linear back to auction', () => {
    expect(normalizeSalaryCapDraftType('snake')).toBe('auction')
    expect(normalizeSalaryCapDraftType('linear')).toBe('auction')
  })
  it('accepts valid supplementary types', () => {
    expect(normalizeSalaryCapDraftType('auto')).toBe('auto')
    expect(normalizeSalaryCapDraftType('offline')).toBe('offline')
    expect(normalizeSalaryCapDraftType('mock_draft')).toBe('mock_draft')
    expect(normalizeSalaryCapDraftType('mock')).toBe('mock_draft')
  })
  it('falls back to auction for unknown values', () => {
    expect(normalizeSalaryCapDraftType('slow_draft')).toBe('auction')
    expect(normalizeSalaryCapDraftType(null)).toBe('auction')
  })
})

// ── NFL default contract ──────────────────────────────────────────────────────

describe('NFL salary cap default contract', () => {
  const contract = getSalaryCapDefaultContract({ sport: 'NFL' })

  it('returns a non-null contract', () => {
    expect(contract).not.toBeNull()
  })

  it('has correct league_type and draft_type', () => {
    expect(contract!.league_type).toBe('salary_cap')
    expect(contract!.draft_type).toBe('auction')
  })

  it('has NFL player pool (not NCAAF)', () => {
    expect(contract!.playerPoolRules.poolKey).toBe('nfl_active_fantasy_players')
    expect(contract!.playerPoolRules.includeNflPlayers).toBe(true)
    expect(contract!.playerPoolRules.includeCollegePlayers).toBe(false)
    expect(contract!.playerPoolRules.collegeOnly).toBe(false)
  })

  it('has DST (not DEF) defense position', () => {
    expect(contract!.rosterTemplate.defensePosition).toBe('DST')
    expect(contract!.rosterTemplate.starterSlots).toHaveProperty('DST')
    expect(contract!.rosterTemplate.starterSlots).not.toHaveProperty('DEF')
  })

  it('has correct cap policy defaults', () => {
    const cap = contract!.capPolicy
    expect(cap.totalCap).toBe(200)
    expect(cap.maxSalary).toBe(100)
    expect(cap.minSalary).toBe(1)
    expect(cap.maxContractYears).toBe(4)
    expect(cap.defaultContractYears).toBe(1)
    expect(cap.franchiseTagEnabled).toBe(true)
    expect(cap.deadMoneyEnabled).toBe(true)
    expect(cap.capRolloverEnabled).toBe(true)
    expect(cap.capFloorEnabled).toBe(true)
    expect(cap.tradeCapValidationEnabled).toBe(true)
    expect(cap.commissionerCapOverrideEnabled).toBe(true)
  })

  it('has pending automation statuses', () => {
    const cap = contract!.capPolicy
    expect(cap.contractSystemStatus).toBe('pending')
    expect(cap.salaryLedgerStatus).toBe('pending')
    expect(cap.deadMoneyLedgerStatus).toBe('pending')
    expect(cap.franchiseTagStatus).toBe('pending')
    expect(cap.offseasonPhase).toBe('setup')
  })

  it('has auction draft settings wired to cap budget', () => {
    expect(contract!.draftSettings.auctionBudgetPerTeam).toBe(200)
    expect(contract!.draftSettings.nominationOrderEnabled).toBe(true)
    expect(contract!.draftSettings.bidValidationEnabled).toBe(true)
    expect(contract!.draftSettings.minBidEqualsMinSalary).toBe(true)
    expect(contract!.draftSettings.budgetValidationEnabled).toBe(true)
  })

  it('has salary cap tabs enabled', () => {
    const tabs = contract!.tabsEnabled
    expect(tabs.salary_cap).toBe(true)
    expect(tabs.auction_draft).toBe(true)
    expect(tabs.overview).toBe(true)
    expect(tabs.settings).toBe('commissioner')
    expect(tabs.commissioner_tools).toBe('commissioner')
    expect(tabs.contracts).toBe('pending')
  })

  it('has guardrails disabling non-salary-cap modes', () => {
    const disabled = contract!.disabledSettings
    expect(disabled.dynasty).toBe(false)
    expect(disabled.keeper_enabled).toBe(false)
    expect(disabled.devy).toBe(false)
    expect(disabled.taxi).toBe(false)
    expect(disabled.best_ball).toBe(false)
    expect(disabled.guillotine).toBe(false)
    expect(disabled.survivor).toBe(false)
    expect(disabled.tournament).toBe(false)
  })

  it('has no validation errors for default NFL contract', () => {
    expect(contract!.validationErrors).toHaveLength(0)
  })

  it('returns null for non-salary-cap sport', () => {
    expect(getSalaryCapDefaultContract({ sport: 'NBA' })).toBeNull()
    expect(getSalaryCapDefaultContract({ sport: '' })).toBeNull()
  })
})

// ── NCAAF default contract ────────────────────────────────────────────────────

describe('NCAAF salary cap default contract', () => {
  const contract = getSalaryCapDefaultContract({ sport: 'NCAAF' })

  it('returns a non-null contract', () => {
    expect(contract).not.toBeNull()
  })

  it('has NCAAF player pool (not NFL)', () => {
    expect(contract!.playerPoolRules.poolKey).toBe('ncaaf_active_college_fantasy_players')
    expect(contract!.playerPoolRules.includeCollegePlayers).toBe(true)
    expect(contract!.playerPoolRules.includeNflPlayers).toBe(false)
    expect(contract!.playerPoolRules.collegeOnly).toBe(true)
  })

  it('has DEF (not DST) defense position', () => {
    expect(contract!.rosterTemplate.defensePosition).toBe('DEF')
    expect(contract!.rosterTemplate.starterSlots).toHaveProperty('DEF')
    expect(contract!.rosterTemplate.starterSlots).not.toHaveProperty('DST')
  })

  it('has NCAAF-appropriate cap policy', () => {
    const cap = contract!.capPolicy
    expect(cap.totalCap).toBe(200)
    expect(cap.maxContractYears).toBe(3)
    expect(cap.capGrowthPercent).toBe(0)
    expect(cap.capRolloverEnabled).toBe(false)  // NCAAF resets each season
    expect(cap.deadMoneyEnabled).toBe(false)     // disabled pending contract system
    expect(cap.franchiseTagEnabled).toBe(false)  // not realistic for college
    expect(cap.franchiseTagLimit).toBe(0)
  })

  it('has NCAAF-specific ranking source', () => {
    expect(contract!.draftSettings.preDraftRankingSource).toBe('ncaaf_auction_values_adp_fallback')
    expect(contract!.playerPoolRules.rankingSource).toBe('ncaaf_auction_values_adp_fallback')
  })

  it('has 70-slot queue (NCAAF standard)', () => {
    expect(contract!.draftSettings.queueSizeLimit).toBe(70)
  })
})

// ── Settings snapshot ─────────────────────────────────────────────────────────

describe('buildSalaryCapSettingsSnapshot', () => {
  it('NFL snapshot has correct flat keys', () => {
    const snap = buildSalaryCapSettingsSnapshot({ sport: 'NFL' })!
    expect(snap.salary_cap_enabled).toBe(true)
    expect(snap.isSalaryCap).toBe(true)
    expect(snap.league_type).toBe('salary_cap')
    expect(snap.draft_type).toBe('auction')
    expect(snap.total_cap).toBe(200)
    expect(snap.max_salary).toBe(100)
    expect(snap.min_salary).toBe(1)
    expect(snap.auction_budget_per_team).toBe(200)
    expect(snap.franchise_tag_enabled).toBe(true)
    expect(snap.dead_money_enabled).toBe(true)
    expect(snap.cap_rollover_enabled).toBe(true)
    expect(snap.cap_floor_enabled).toBe(true)
    expect(snap.trade_cap_validation_enabled).toBe(true)
    expect(snap.commissioner_cap_override_enabled).toBe(true)
    expect(snap.contract_system_status).toBe('pending')
    expect(snap.salary_ledger_status).toBe('pending')
    expect(snap.player_pool).toBe('nfl_active_fantasy_players')
  })

  it('NCAAF snapshot has correct player pool and cap policy', () => {
    const snap = buildSalaryCapSettingsSnapshot({ sport: 'NCAAF' })!
    expect(snap.player_pool).toBe('ncaaf_active_college_fantasy_players')
    expect(snap.max_contract_years).toBe(3)
    expect(snap.cap_rollover_enabled).toBe(false)
    expect(snap.dead_money_enabled).toBe(false)
    expect(snap.franchise_tag_enabled).toBe(false)
  })

  it('returns null for ineligible sport', () => {
    expect(buildSalaryCapSettingsSnapshot({ sport: 'NBA' })).toBeNull()
  })
})

// ── Normalizer ────────────────────────────────────────────────────────────────

describe('normalizeSalaryCapSettingsSnapshot', () => {
  it('enforces auction draft_type even if snake is passed', () => {
    const result = normalizeSalaryCapSettingsSnapshot({
      sport: 'NFL',
      draftType: 'snake',
    })
    expect(result.draft_type).toBe('auction')
    expect(result.requested_draft_type).toBe('auction')
  })

  it('clamps total_cap to valid range', () => {
    const result = normalizeSalaryCapSettingsSnapshot({
      sport: 'NFL',
      settings: { total_cap: 0 },
    })
    expect(Number(result.total_cap)).toBeGreaterThan(0)
  })

  it('clamps max_salary to not exceed total_cap', () => {
    const result = normalizeSalaryCapSettingsSnapshot({
      sport: 'NFL',
      settings: { total_cap: 150, max_salary: 999 },
    })
    expect(Number(result.max_salary)).toBeLessThanOrEqual(150)
  })

  it('always disables guardrail modes', () => {
    const result = normalizeSalaryCapSettingsSnapshot({
      sport: 'NFL',
      settings: { dynasty: true, keeper_enabled: true, best_ball: true },
    })
    expect(result.dynasty).toBe(false)
    expect(result.keeper_enabled).toBe(false)
    expect(result.best_ball).toBe(false)
  })

  it('keeps automation statuses pending', () => {
    const result = normalizeSalaryCapSettingsSnapshot({
      sport: 'NFL',
      settings: { contract_system_status: 'active' },
    })
    expect(result.contract_system_status).toBe('pending')
  })
})

// ── Validation ────────────────────────────────────────────────────────────────

describe('validateSalaryCapStructure', () => {
  it('passes for valid defaults', () => {
    const snap = buildSalaryCapSettingsSnapshot({ sport: 'NFL' })!
    expect(validateSalaryCapStructure(snap)).toHaveLength(0)
  })

  it('rejects snake/linear draft types', () => {
    const errors = validateSalaryCapStructure({ draft_type: 'snake', total_cap: 200, max_salary: 100, min_salary: 1, max_contract_years: 4, default_contract_years: 1, sport: 'NFL' })
    expect(errors.some(e => e.includes('auction'))).toBe(true)
  })

  it('rejects NFL settings with NCAAF player pool', () => {
    const errors = validateSalaryCapStructure({
      sport: 'NFL',
      player_pool: 'ncaaf_active_college_fantasy_players',
      draft_type: 'auction',
      total_cap: 200,
      max_salary: 100,
      min_salary: 1,
      max_contract_years: 4,
      default_contract_years: 1,
    })
    expect(errors.some(e => e.includes('player pool'))).toBe(true)
  })

  it('rejects NCAAF settings with NFL player pool', () => {
    const errors = validateSalaryCapStructure({
      sport: 'NCAAF',
      player_pool: 'nfl_active_fantasy_players',
      draft_type: 'auction',
      total_cap: 200,
      max_salary: 100,
      min_salary: 1,
      max_contract_years: 3,
      default_contract_years: 1,
    })
    expect(errors.some(e => e.includes('player pool'))).toBe(true)
  })

  it('rejects max_salary > total_cap', () => {
    const errors = validateSalaryCapStructure({ total_cap: 200, max_salary: 300, min_salary: 1, max_contract_years: 4, default_contract_years: 1, draft_type: 'auction', sport: 'NFL' })
    expect(errors.some(e => e.includes('max_salary'))).toBe(true)
  })
})

// ── Concept preset catalog wiring ─────────────────────────────────────────────

describe('concept preset catalog salary_cap seeds', () => {
  const nflSeed = CONCEPT_PRESET_CATALOG.find(
    p => p.leagueType === 'salary_cap' && p.sport === 'NFL',
  )
  const ncaafSeed = CONCEPT_PRESET_CATALOG.find(
    p => p.leagueType === 'salary_cap' && p.sport === 'NCAAF',
  )

  it('NFL salary cap seed exists in catalog', () => {
    expect(nflSeed).toBeDefined()
    expect(nflSeed?.draftTypesAllowed).toContain('auction')
    expect(nflSeed?.draftTypesAllowed).not.toContain('snake')
    expect(nflSeed?.isLaunchReady).toBe(true)
  })

  it('NCAAF salary cap seed exists in catalog', () => {
    expect(ncaafSeed).toBeDefined()
    expect(ncaafSeed?.draftTypesAllowed).toContain('auction')
    expect(ncaafSeed?.isLaunchReady).toBe(true)
  })
})

// ── resolveConceptPreset integration ─────────────────────────────────────────

describe('resolveConceptPreset salary_cap', () => {
  it('NFL salary cap resolves to complete settings snapshot', () => {
    const result = resolveConceptPreset({
      sport: 'NFL',
      leagueType: 'salary_cap',
      scoringPreset: 'fb_half_ppr',
      draftType: 'auction',
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    const snap = result.settingsSnapshot
    expect(snap.salary_cap_enabled).toBe(true)
    expect(snap.draft_type).toBe('auction')
    expect(snap.total_cap).toBe(200)
    expect(snap.player_pool).toBe('nfl_active_fantasy_players')
    expect(snap.contract_system_status).toBe('pending')
  })

  it('NCAAF salary cap resolves to complete settings snapshot', () => {
    const result = resolveConceptPreset({
      sport: 'NCAAF',
      leagueType: 'salary_cap',
      scoringPreset: 'ncaaf_half_ppr',
      draftType: 'auction',
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    const snap = result.settingsSnapshot
    expect(snap.salary_cap_enabled).toBe(true)
    expect(snap.player_pool).toBe('ncaaf_active_college_fantasy_players')
    expect(snap.max_contract_years).toBe(3)
    expect(snap.cap_rollover_enabled).toBe(false)
  })

  it('NFL salary cap with snake draft type still returns auction', () => {
    const result = resolveConceptPreset({
      sport: 'NFL',
      leagueType: 'salary_cap',
      scoringPreset: 'fb_half_ppr',
      draftType: 'snake',
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.settingsSnapshot.draft_type).toBe('auction')
  })

  it('NFL and NCAAF player pools do not cross-contaminate', () => {
    const nfl = resolveConceptPreset({ sport: 'NFL', leagueType: 'salary_cap', scoringPreset: 'fb_half_ppr', draftType: 'auction' })
    const ncaaf = resolveConceptPreset({ sport: 'NCAAF', leagueType: 'salary_cap', scoringPreset: 'ncaaf_half_ppr', draftType: 'auction' })
    expect(nfl.ok && (nfl as any).settingsSnapshot.player_pool).toBe('nfl_active_fantasy_players')
    expect(ncaaf.ok && (ncaaf as any).settingsSnapshot.player_pool).toBe('ncaaf_active_college_fantasy_players')
  })
})

// ── Existing format tests still pass (smoke) ──────────────────────────────────

describe('existing format presets unaffected (smoke)', () => {
  it('NFL redraft still resolves', () => {
    const r = resolveConceptPreset({ sport: 'NFL', leagueType: 'redraft', scoringPreset: 'fb_half_ppr', draftType: 'snake' })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.settingsSnapshot.league_type).toBe('redraft')
  })
  it('NFL dynasty still resolves', () => {
    const r = resolveConceptPreset({ sport: 'NFL', leagueType: 'dynasty', scoringPreset: 'fb_half_ppr', draftType: 'snake' })
    expect(r.ok).toBe(true)
  })
  it('NFL keeper still resolves', () => {
    const r = resolveConceptPreset({ sport: 'NFL', leagueType: 'keeper', scoringPreset: 'fb_half_ppr', draftType: 'snake' })
    expect(r.ok).toBe(true)
  })
  it('NFL best_ball still resolves', () => {
    const r = resolveConceptPreset({ sport: 'NFL', leagueType: 'best_ball', scoringPreset: 'fb_half_ppr', draftType: 'snake' })
    expect(r.ok).toBe(true)
  })
  it('NFL guillotine still resolves', () => {
    const r = resolveConceptPreset({ sport: 'NFL', leagueType: 'guillotine', scoringPreset: 'fb_half_ppr', draftType: 'snake' })
    expect(r.ok).toBe(true)
  })
  it('NFL tournament still resolves', () => {
    const r = resolveConceptPreset({ sport: 'NFL', leagueType: 'tournament', scoringPreset: 'fb_half_ppr', draftType: 'snake' })
    expect(r.ok).toBe(true)
  })
  it('NFL survivor still resolves', () => {
    const r = resolveConceptPreset({ sport: 'NFL', leagueType: 'survivor', scoringPreset: 'fb_half_ppr', draftType: 'snake' })
    expect(r.ok).toBe(true)
  })
})

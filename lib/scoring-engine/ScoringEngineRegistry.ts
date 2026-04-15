/**
 * lib/scoring-engine/ScoringEngineRegistry.ts
 * Central registry mapping each sport to its scoring service and metadata.
 *
 * Usage:
 *   const registry = getScoringEngineRegistry()
 *   const service  = registry.getService('NFL')
 *   const config   = await service.getConfig(leagueId)
 *
 * Adding a new sport:
 *   1. Create lib/[sport]-scoring/ with Presets + ConfigService + Categories + index
 *   2. Implement ISportScoringService adapter (see NflScoringServiceAdapter below)
 *   3. Register it in REGISTRY
 */

import type { SupportedSport, ISportScoringService, IScoringPreset } from './ScoringEngineTypes'

// ---------------------------------------------------------------------------
// Lazy-import adapters — each wraps an existing sport-specific config service
// so we don't force all 7 sports to load on every import.
// ---------------------------------------------------------------------------

function makeNflAdapter(): ISportScoringService {
  const {
    getLeagueNflScoringConfig, saveLeagueNflScoringConfig, applyDefaultNflScoringOnCreate,
    getNflScoringPresets, getNflScoringPreset, buildFullNflDefaultConfig, detectNflPresetMatch,
  } = require('../nfl-scoring') as typeof import('../nfl-scoring')

  return {
    sport: 'NFL',
    async getConfig(leagueId) {
      const c = await getLeagueNflScoringConfig(leagueId)
      return { sport: 'NFL', presetKey: c.presetKey, presetLabel: c.presetLabel, source: c.source, version: 1, updatedAt: c.lastUpdatedAt, updatedBy: c.lastUpdatedBy, matchesPreset: c.matchesPreset, premiumUsed: c.premiumFeaturesUsed, auditLog: [], compatibilityWarnings: c.warningFlags, rules: c.rules }
    },
    async saveConfig(leagueId, opts) {
      await saveLeagueNflScoringConfig(leagueId, { presetKey: opts.presetKey as never, rules: opts.rules, source: opts.source as never, userId: opts.userId, premiumFeaturesUsed: opts.premiumFeaturesUsed })
    },
    async applyDefaultOnCreate(leagueId) { await applyDefaultNflScoringOnCreate(leagueId) },
    getPresets(): IScoringPreset[] { return getNflScoringPresets() as IScoringPreset[] },
    getPreset(key) { return getNflScoringPreset(key as never) as IScoringPreset },
    buildDefaultRules() { return buildFullNflDefaultConfig() },
    detectPresetMatch(rules) { return detectNflPresetMatch(rules) },
  }
}

function makeNcaafAdapter(): ISportScoringService {
  const {
    getLeagueNcaafScoringConfig, saveLeagueNcaafScoringConfig, applyDefaultNcaafScoringOnCreate,
    getNcaafScoringPresets, getNcaafScoringPreset, buildFullNcaafScoringConfig, detectNcaafPresetMatch,
  } = require('../ncaaf-scoring') as typeof import('../ncaaf-scoring')

  return {
    sport: 'NCAAF',
    async getConfig(leagueId) {
      const c = await getLeagueNcaafScoringConfig(leagueId)
      return { sport: 'NCAAF', presetKey: c.presetKey, presetLabel: c.presetLabel, source: c.source, version: 1, updatedAt: c.lastUpdatedAt, updatedBy: c.lastUpdatedBy, matchesPreset: c.matchesPreset, premiumUsed: c.premiumFeaturesUsed, auditLog: [], compatibilityWarnings: c.warningFlags, rules: c.rules }
    },
    async saveConfig(leagueId, opts) {
      await saveLeagueNcaafScoringConfig(leagueId, { presetKey: opts.presetKey as never, rules: opts.rules, source: opts.source as never, userId: opts.userId, premiumFeaturesUsed: opts.premiumFeaturesUsed })
    },
    async applyDefaultOnCreate(leagueId) { await applyDefaultNcaafScoringOnCreate(leagueId) },
    getPresets(): IScoringPreset[] { return getNcaafScoringPresets() as IScoringPreset[] },
    getPreset(key) { return getNcaafScoringPreset(key as never) as IScoringPreset },
    buildDefaultRules() { return buildFullNcaafScoringConfig('af_default') },
    detectPresetMatch(rules) { return detectNcaafPresetMatch(rules) },
  }
}

function makeNbaAdapter(): ISportScoringService {
  const {
    getLeagueNbaScoringConfig, saveLeagueNbaScoringConfig, applyDefaultNbaScoringOnCreate,
    getNbaScoringPresets, getNbaScoringPreset, buildFullScoringConfig, detectPresetMatch,
  } = require('../nba-scoring') as typeof import('../nba-scoring')

  return {
    sport: 'NBA',
    async getConfig(leagueId) {
      const c = await getLeagueNbaScoringConfig(leagueId)
      return { sport: 'NBA', presetKey: c.presetKey, presetLabel: c.presetLabel, source: c.source as never, version: 1, updatedAt: c.lastUpdatedAt, updatedBy: c.lastUpdatedBy, matchesPreset: c.matchesPreset, premiumUsed: c.premiumFeaturesUsed, auditLog: [], compatibilityWarnings: c.warningFlags, rules: c.rules }
    },
    async saveConfig(leagueId, opts) {
      await saveLeagueNbaScoringConfig(leagueId, { presetKey: opts.presetKey as never, rules: opts.rules, source: opts.source as never, userId: opts.userId, premiumFeaturesUsed: opts.premiumFeaturesUsed })
    },
    async applyDefaultOnCreate(leagueId) { await applyDefaultNbaScoringOnCreate(leagueId) },
    getPresets(): IScoringPreset[] { return getNbaScoringPresets() as IScoringPreset[] },
    getPreset(key) { return getNbaScoringPreset(key as never) as IScoringPreset },
    buildDefaultRules() { return buildFullScoringConfig('af_default') },
    detectPresetMatch(rules) { return detectPresetMatch(rules) },
  }
}

function makeNcaabAdapter(): ISportScoringService {
  const {
    getLeagueNcaabScoringConfig, saveLeagueNcaabScoringConfig, applyDefaultNcaabScoringOnCreate,
    getNcaabScoringPresets, getNcaabScoringPreset, buildFullNcaabScoringConfig, detectNcaabPresetMatch,
  } = require('../ncaab-scoring') as typeof import('../ncaab-scoring')

  return {
    sport: 'NCAAB',
    async getConfig(leagueId) {
      const c = await getLeagueNcaabScoringConfig(leagueId)
      return { sport: 'NCAAB', presetKey: c.presetKey, presetLabel: c.presetLabel, source: c.source as never, version: 1, updatedAt: c.lastUpdatedAt, updatedBy: c.lastUpdatedBy, matchesPreset: c.matchesPreset, premiumUsed: c.premiumFeaturesUsed, auditLog: [], compatibilityWarnings: c.warningFlags, rules: c.rules }
    },
    async saveConfig(leagueId, opts) {
      await saveLeagueNcaabScoringConfig(leagueId, { presetKey: opts.presetKey as never, rules: opts.rules, source: opts.source as never, userId: opts.userId, premiumFeaturesUsed: opts.premiumFeaturesUsed })
    },
    async applyDefaultOnCreate(leagueId) { await applyDefaultNcaabScoringOnCreate(leagueId) },
    getPresets(): IScoringPreset[] { return getNcaabScoringPresets() as IScoringPreset[] },
    getPreset(key) { return getNcaabScoringPreset(key as never) as IScoringPreset },
    buildDefaultRules() { return buildFullNcaabScoringConfig('af_default') },
    detectPresetMatch(rules) { return detectNcaabPresetMatch(rules) },
  }
}

function makeMlbAdapter(): ISportScoringService {
  const {
    getLeagueMlbScoringConfig, saveLeagueMlbScoringConfig, applyDefaultMlbScoringOnCreate,
    getMlbScoringPresets, getMlbScoringPreset, buildFullMlbScoringConfig, detectMlbPresetMatch,
  } = require('../mlb-scoring') as typeof import('../mlb-scoring')

  return {
    sport: 'MLB',
    async getConfig(leagueId) {
      const c = await getLeagueMlbScoringConfig(leagueId)
      return { sport: 'MLB', presetKey: c.presetKey, presetLabel: c.presetLabel, source: c.source as never, version: 1, updatedAt: c.lastUpdatedAt, updatedBy: c.lastUpdatedBy, matchesPreset: c.matchesPreset, premiumUsed: c.premiumFeaturesUsed, auditLog: [], compatibilityWarnings: c.warningFlags, rules: c.rules }
    },
    async saveConfig(leagueId, opts) {
      await saveLeagueMlbScoringConfig(leagueId, { presetKey: opts.presetKey as never, rules: opts.rules, source: opts.source as never, userId: opts.userId, premiumFeaturesUsed: opts.premiumFeaturesUsed })
    },
    async applyDefaultOnCreate(leagueId) { await applyDefaultMlbScoringOnCreate(leagueId) },
    getPresets(): IScoringPreset[] { return getMlbScoringPresets() as IScoringPreset[] },
    getPreset(key) { return getMlbScoringPreset(key as never) as IScoringPreset },
    buildDefaultRules() { return buildFullMlbScoringConfig('af_default') },
    detectPresetMatch(rules) { return detectMlbPresetMatch(rules) },
  }
}

function makeNhlAdapter(): ISportScoringService {
  const {
    getLeagueNhlScoringConfig, saveLeagueNhlScoringConfig, applyDefaultNhlScoringOnCreate,
    getNhlScoringPresets, getNhlScoringPreset, buildFullNhlScoringConfig, detectNhlPresetMatch,
  } = require('../nhl-scoring') as typeof import('../nhl-scoring')

  return {
    sport: 'NHL',
    async getConfig(leagueId) {
      const c = await getLeagueNhlScoringConfig(leagueId)
      return { sport: 'NHL', presetKey: c.presetKey, presetLabel: c.presetLabel, source: c.source as never, version: 1, updatedAt: c.lastUpdatedAt, updatedBy: c.lastUpdatedBy, matchesPreset: c.matchesPreset, premiumUsed: c.premiumFeaturesUsed, auditLog: [], compatibilityWarnings: c.warningFlags, rules: c.rules }
    },
    async saveConfig(leagueId, opts) {
      await saveLeagueNhlScoringConfig(leagueId, { presetKey: opts.presetKey as never, rules: opts.rules, source: opts.source as never, userId: opts.userId, premiumFeaturesUsed: opts.premiumFeaturesUsed })
    },
    async applyDefaultOnCreate(leagueId) { await applyDefaultNhlScoringOnCreate(leagueId) },
    getPresets(): IScoringPreset[] { return getNhlScoringPresets() as IScoringPreset[] },
    getPreset(key) { return getNhlScoringPreset(key as never) as IScoringPreset },
    buildDefaultRules() { return buildFullNhlScoringConfig('af_default') },
    detectPresetMatch(rules) { return detectNhlPresetMatch(rules) },
  }
}

function makeSoccerAdapter(): ISportScoringService {
  const {
    getLeagueSoccerScoringConfig, saveLeagueSoccerScoringConfig, applyDefaultSoccerScoringOnCreate,
    getSoccerScoringPresets, getSoccerScoringPreset, buildFullSoccerScoringConfig, detectSoccerPresetMatch,
  } = require('../soccer-scoring') as typeof import('../soccer-scoring')

  return {
    sport: 'SOCCER',
    async getConfig(leagueId) {
      const c = await getLeagueSoccerScoringConfig(leagueId)
      return { sport: 'SOCCER', presetKey: c.presetKey, presetLabel: c.presetLabel, source: c.source as never, version: 1, updatedAt: c.lastUpdatedAt, updatedBy: c.lastUpdatedBy, matchesPreset: c.matchesPreset, premiumUsed: c.premiumFeaturesUsed, auditLog: [], compatibilityWarnings: c.warningFlags, rules: c.rules }
    },
    async saveConfig(leagueId, opts) {
      await saveLeagueSoccerScoringConfig(leagueId, { presetKey: opts.presetKey as never, rules: opts.rules, source: opts.source as never, userId: opts.userId, premiumFeaturesUsed: opts.premiumFeaturesUsed })
    },
    async applyDefaultOnCreate(leagueId) { await applyDefaultSoccerScoringOnCreate(leagueId) },
    getPresets(): IScoringPreset[] { return getSoccerScoringPresets() as IScoringPreset[] },
    getPreset(key) { return getSoccerScoringPreset(key as never) as IScoringPreset },
    buildDefaultRules() { return buildFullSoccerScoringConfig('af_default') },
    detectPresetMatch(rules) { return detectSoccerPresetMatch(rules) },
  }
}

// ---------------------------------------------------------------------------
// Registry singleton
// ---------------------------------------------------------------------------

class ScoringEngineRegistry {
  private readonly services: Map<SupportedSport, ISportScoringService>

  constructor() {
    this.services = new Map([
      ['NFL',    makeNflAdapter()],
      ['NCAAF',  makeNcaafAdapter()],
      ['NBA',    makeNbaAdapter()],
      ['NCAAB',  makeNcaabAdapter()],
      ['MLB',    makeMlbAdapter()],
      ['NHL',    makeNhlAdapter()],
      ['SOCCER', makeSoccerAdapter()],
    ])
  }

  /** Returns the sport-specific service or throws if the sport is unsupported. */
  getService(sport: string): ISportScoringService {
    const svc = this.services.get(sport.toUpperCase() as SupportedSport)
    if (!svc) throw new Error(`Unsupported sport for scoring engine: ${sport}`)
    return svc
  }

  isSupported(sport: string): boolean {
    return this.services.has(sport.toUpperCase() as SupportedSport)
  }

  getAllSports(): SupportedSport[] {
    return [...this.services.keys()]
  }
}

// Module-level singleton — safe to import across the app
let _registry: ScoringEngineRegistry | null = null

export function getScoringEngineRegistry(): ScoringEngineRegistry {
  if (!_registry) _registry = new ScoringEngineRegistry()
  return _registry
}

// ---------------------------------------------------------------------------
// Convenience top-level functions (primary API surface)
// ---------------------------------------------------------------------------

/**
 * Create and store the AF default scoring config for a newly created league.
 *
 * Call this as part of the create-league flow for ANY sport:
 *   await createDefaultScoringConfig('NFL', leagueId)
 *
 * For C2C leagues that use two sports (e.g. NCAAF + NFL), call twice:
 *   await createDefaultScoringConfig('NCAAF', leagueId)
 *   await createDefaultScoringConfig('NFL',   leagueId)
 */
export async function createDefaultScoringConfig(
  sport: SupportedSport,
  leagueId: string,
  presetKey?: string,
): Promise<void> {
  const svc = getScoringEngineRegistry().getService(sport)
  if (presetKey && presetKey !== 'af_default') {
    const preset = svc.getPreset(presetKey)
    const defaults = svc.buildDefaultRules()
    await svc.saveConfig(leagueId, {
      presetKey,
      rules: { ...defaults, ...preset.rules },
      source: preset.source,
    })
  } else {
    await svc.applyDefaultOnCreate(leagueId)
  }
}

/**
 * Fetch the unified scoring config for a league.
 * The `sport` parameter is required because the config is keyed per-sport.
 */
export async function getLeagueScoringConfig(
  sport: SupportedSport,
  leagueId: string,
): Promise<import('./ScoringEngineTypes').UnifiedScoringConfig> {
  return getScoringEngineRegistry().getService(sport).getConfig(leagueId)
}

/**
 * Update the league's scoring config.
 */
export async function updateLeagueScoringConfig(
  sport: SupportedSport,
  leagueId: string,
  opts: {
    presetKey: string
    rules: Record<string, number>
    userId?: string
    source?: import('./ScoringEngineTypes').ScoringSource
    premiumFeaturesUsed?: boolean
  },
): Promise<void> {
  return getScoringEngineRegistry().getService(sport).saveConfig(leagueId, opts)
}

/**
 * Return all presets for a sport.
 */
export function getScoringPresetsForSport(
  sport: SupportedSport,
): import('./ScoringEngineTypes').IScoringPreset[] {
  return getScoringEngineRegistry().getService(sport).getPresets()
}

/**
 * Return a single preset.
 */
export function getScoringPreset(
  sport: SupportedSport,
  presetKey: string,
): import('./ScoringEngineTypes').IScoringPreset {
  return getScoringEngineRegistry().getService(sport).getPreset(presetKey)
}

/**
 * lib/scoring-engine/UnifiedScoringConfigService.ts
 *
 * Top-level facade over the scoring engine.
 *
 *  - Auto-detects a league's sport from Prisma so callers don't need to pass it
 *  - Delegates to sport-specific services via the registry
 *  - Injects audit entries on every config save
 *  - Validates scoring rules before persisting
 *  - Provides a versioned recalculation trigger architecture
 *
 * Import from `@/lib/scoring-engine` — this module is re-exported by index.ts
 */

import { prisma } from '../prisma'
import {
  getScoringEngineRegistry,
  getLeagueScoringConfig,
  updateLeagueScoringConfig,
  getScoringPresetsForSport,
} from './ScoringEngineRegistry'
import {
  appendScoringAuditEntry,
  diffScoringConfigs,
  getScoringConfigVersion,
} from './ScoringAuditService'
import type {
  SupportedSport,
  UnifiedScoringConfig,
  ScoringAuditEntry,
  IScoringPreset,
  RecalcResult,
} from './ScoringEngineTypes'

// ---------------------------------------------------------------------------
// Sport auto-detection
// ---------------------------------------------------------------------------

/**
 * Read the league's sport from Postgres and resolve it to a SupportedSport.
 * Throws if the league is not found or the sport is unsupported.
 */
export async function detectLeagueSport(leagueId: string): Promise<SupportedSport> {
  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    select: { sport: true },
  })
  if (!league) throw new Error(`League not found: ${leagueId}`)
  const registry = getScoringEngineRegistry()
  if (!registry.isSupported(league.sport)) {
    throw new Error(`Unsupported sport for league ${leagueId}: ${league.sport}`)
  }
  return league.sport as SupportedSport
}

// ---------------------------------------------------------------------------
// Fetch config (auto-detective sport)
// ---------------------------------------------------------------------------

/**
 * Fetch unified scoring config for a league without knowing the sport.
 * Performs one extra SQL look-up to read `league.sport`.
 *
 * Prefer `getLeagueScoringConfig(sport, leagueId)` from the registry when
 * you already know the sport — it avoids the extra round-trip.
 */
export async function getLeagueScoringConfigAutoDetect(
  leagueId: string,
): Promise<UnifiedScoringConfig> {
  const sport = await detectLeagueSport(leagueId)
  return getLeagueScoringConfig(sport, leagueId)
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export interface ScoringValidationResult {
  valid: boolean
  errors: string[]
}

const VALUE_MIN = -99
const VALUE_MAX = 99

export function validateScoringConfig(
  _sport: SupportedSport,
  rules: Record<string, number>,
): ScoringValidationResult {
  const errors: string[] = []

  if (!rules || typeof rules !== 'object' || Array.isArray(rules)) {
    errors.push('Scoring rules must be a plain object.')
    return { valid: false, errors }
  }

  for (const [key, value] of Object.entries(rules)) {
    if (typeof value !== 'number' || Number.isNaN(value) || !Number.isFinite(value)) {
      errors.push(`Rule "${key}" must be a finite number, got: ${value}`)
      continue
    }
    if (value < VALUE_MIN || value > VALUE_MAX) {
      errors.push(
        `Rule "${key}" value ${value} is out of range [${VALUE_MIN}, ${VALUE_MAX}].`,
      )
    }
  }

  return { valid: errors.length === 0, errors }
}

// ---------------------------------------------------------------------------
// Save config with audit
// ---------------------------------------------------------------------------

export interface UpdateScoringConfigOpts {
  presetKey: string
  rules: Record<string, number>
  /** If omitted, sport is auto-detected from DB */
  sport?: SupportedSport
  userId?: string
  premiumFeaturesUsed?: boolean
  note?: string
}

/**
 * Persist a scoring config update and append an audit entry.
 *
 * Returns the diff so callers can trigger downstream recalculation if needed.
 */
export async function updateLeagueScoringConfigWithAudit(
  leagueId: string,
  opts: UpdateScoringConfigOpts,
): Promise<{ sport: SupportedSport; changedKeys: string[] }> {
  const sport = opts.sport ?? (await detectLeagueSport(leagueId))

  const validation = validateScoringConfig(sport, opts.rules)
  if (!validation.valid) {
    throw new Error(
      `Invalid scoring config for ${sport}: ${validation.errors.join('; ')}`,
    )
  }

  // Fetch current state for audit diff
  const registry = getScoringEngineRegistry()
  const svc = registry.getService(sport)
  let previousConfig: UnifiedScoringConfig | null = null
  try {
    previousConfig = await svc.getConfig(leagueId)
  } catch {
    // New league — no previous config
  }

  const previousRules = previousConfig?.rules ?? {}
  const previousPreset = previousConfig?.presetKey
  const diff = diffScoringConfigs(sport, previousRules, opts.rules, previousPreset, opts.presetKey)

  // Persist
  await updateLeagueScoringConfig(sport, leagueId, {
    presetKey: opts.presetKey,
    rules: opts.rules,
    userId: opts.userId,
    source: opts.premiumFeaturesUsed ? 'CUSTOM' : 'PLATFORM_PRESET',
    premiumFeaturesUsed: opts.premiumFeaturesUsed,
  })

  // Audit
  const action: ScoringAuditEntry['action'] = previousConfig
    ? diff.presetChanged
      ? 'preset_changed'
      : 'updated'
    : 'created'

  const entry: ScoringAuditEntry = {
    timestamp: new Date().toISOString(),
    userId: opts.userId ?? null,
    action,
    previousPresetKey: previousPreset,
    newPresetKey: opts.presetKey,
    changedKeys: diff.changedKeys,
    premiumEnabled: opts.premiumFeaturesUsed,
    note: opts.note,
  }
  await appendScoringAuditEntry(leagueId, sport, entry)

  return { sport, changedKeys: diff.changedKeys }
}

// ---------------------------------------------------------------------------
// Reset to AF default
// ---------------------------------------------------------------------------

export async function resetLeagueScoringConfig(
  leagueId: string,
  userId?: string,
): Promise<void> {
  const sport = await detectLeagueSport(leagueId)
  const svc = getScoringEngineRegistry().getService(sport)

  await svc.applyDefaultOnCreate(leagueId)

  const entry: ScoringAuditEntry = {
    timestamp: new Date().toISOString(),
    userId: userId ?? null,
    action: 'reset',
    newPresetKey: 'af_default',
    note: 'Reset to AllFantasy default',
  }
  await appendScoringAuditEntry(leagueId, sport, entry)
}

// ---------------------------------------------------------------------------
// Compatibility warnings
// ---------------------------------------------------------------------------

const IMPORT_WARNINGS: Partial<Record<string, Record<string, string>>> = {
  NFL: {
    sleeper_standard: 'Sleeper Standard uses 0.00 PPR. Adjust if your league uses fractional PPR.',
    espn_standard: 'ESPN Standard may differ slightly in stat precision from AF defaults.',
  },
  SOCCER: {
    fpl_compatible:
      'FPL uses a bonus point system (BPS) that is not directly portable to AllFantasy scoring.',
  },
}

export function getScoringCompatibilityWarnings(
  sport: SupportedSport,
  presetKey: string,
): string[] {
  return (IMPORT_WARNINGS[sport]?.[presetKey]
    ? [IMPORT_WARNINGS[sport]![presetKey]!]
    : [])
}

// ---------------------------------------------------------------------------
// Recalculation trigger — architecture stub
// ---------------------------------------------------------------------------

/**
 * Versioned recalculation trigger.
 *
 * When a commissioner saves new scoring rules, call this function after
 * persisting the config. It checks whether the rule version actually changed
 * and, if so, enqueues a background job to recompute all fantasy point totals
 * for the current scoring period.
 *
 * Implementation notes for production:
 *   - The actual recalc worker should read matchup/roster records from
 *     Postgres, recalculate using ScoringCalculator.calculateFantasyPoints(),
 *     and update the stored points columns.
 *   - The job should be idempotent (re-runnable on the same version).
 *   - Use Supabase Edge Functions or a pg_cron job for the fan-out.
 */
export async function recalculateLeagueScoringIfChanged(
  leagueId: string,
  previousVersion: number,
): Promise<RecalcResult> {
  const sport = await detectLeagueSport(leagueId)
  const currentVersion = await getScoringConfigVersion(leagueId, sport)
  const triggeredAt = new Date().toISOString()

  if (currentVersion <= previousVersion) {
    return {
      leagueId,
      sport,
      status: 'complete',
      affectedPlayers: 0,
      affectedMatchups: 0,
      triggeredAt,
      completedAt: triggeredAt,
    }
  }

  // TODO: Replace stub with actual recalculation worker invocation.
  // Example:
  //   await fetch('/api/internal/scoring/recalculate', {
  //     method: 'POST',
  //     body: JSON.stringify({ leagueId, sport, fromVersion: previousVersion }),
  //   })

  return {
    leagueId,
    sport,
    status: 'pending',
    affectedPlayers: 0,    // worker will populate
    affectedMatchups: 0,   // worker will populate
    triggeredAt,
  }
}

// ---------------------------------------------------------------------------
// Preset helpers
// ---------------------------------------------------------------------------

export function getPresetsForLeagueSport(sport: SupportedSport): IScoringPreset[] {
  return getScoringPresetsForSport(sport)
}

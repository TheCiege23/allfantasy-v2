/**
 * lib/scoring-engine/ScoringEngineTypes.ts
 * Shared TypeScript types and interfaces for the AllFantasy Unified Scoring Engine.
 *
 * Every sport's scoring system shares these contracts.
 * Sport-specific modules implement them; the engine orchestrates them.
 */

// ---------------------------------------------------------------------------
// Supported sports
// ---------------------------------------------------------------------------

export type SupportedSport =
  | 'NFL'
  | 'NCAAF'
  | 'NBA'
  | 'NCAAB'
  | 'MLB'
  | 'NHL'
  | 'SOCCER'

/** Maps to Prisma LeagueSport enum values */
export const ALL_SUPPORTED_SPORTS: SupportedSport[] = [
  'NFL', 'NCAAF', 'NBA', 'NCAAB', 'MLB', 'NHL', 'SOCCER',
]

// ---------------------------------------------------------------------------
// Scoring source / provenance
// ---------------------------------------------------------------------------

export type ScoringSource =
  | 'AF_DEFAULT'          // AllFantasy's curated default
  | 'PLATFORM_PRESET'     // Sleeper / ESPN / Yahoo / FPL baseline
  | 'IMPORTED_EXACT'      // Pulled verbatim from an imported league
  | 'IMPORTED_MAPPED'     // Imported and field-mapped (some approximation)
  | 'CUSTOM'              // Commissioner custom edit

// ---------------------------------------------------------------------------
// Audit entry — one entry per change event
// ---------------------------------------------------------------------------

export interface ScoringAuditEntry {
  /** ISO timestamp */
  timestamp: string
  userId: string | null
  action: 'created' | 'updated' | 'reset' | 'preset_changed' | 'import'
  previousPresetKey?: string
  newPresetKey?: string
  /** Stat keys that changed (for 'updated' action) */
  changedKeys?: string[]
  premiumEnabled?: boolean
  note?: string
}

// ---------------------------------------------------------------------------
// Unified league scoring config shape
// ---------------------------------------------------------------------------

export interface UnifiedScoringConfig {
  sport: SupportedSport
  presetKey: string
  presetLabel: string
  source: ScoringSource
  /** Monotonically increasing integer — bumped on every save */
  version: number
  updatedAt: string | null
  updatedBy: string | null
  /** true if current rules exactly match the named preset */
  matchesPreset: boolean
  premiumUsed: boolean
  /** Ordered oldest-first */
  auditLog: ScoringAuditEntry[]
  compatibilityWarnings: string[]
  /** Flat map of stat_key -> fantasy point value */
  rules: Record<string, number>
}

// ---------------------------------------------------------------------------
// Scoring preset
// ---------------------------------------------------------------------------

export interface IScoringPreset {
  key: string
  label: string
  source: ScoringSource
  description: string
  warning?: string
  rules: Record<string, number>
}

// ---------------------------------------------------------------------------
// Sport scoring service — every sport-specific service must satisfy this
// ---------------------------------------------------------------------------

export interface ISportScoringService {
  sport: SupportedSport

  /** Return the league's current scoring config. Falls back to AF default. */
  getConfig(leagueId: string): Promise<UnifiedScoringConfig>

  /** Persist a scoring config update for the league. */
  saveConfig(
    leagueId: string,
    opts: {
      presetKey: string
      rules: Record<string, number>
      source?: ScoringSource
      userId?: string
      premiumFeaturesUsed?: boolean
    },
  ): Promise<void>

  /** Write AF default config to a brand-new league. */
  applyDefaultOnCreate(leagueId: string): Promise<void>

  /** Return all presets for this sport. */
  getPresets(): IScoringPreset[]

  /** Return a single preset by key. */
  getPreset(key: string): IScoringPreset

  /** Build a full zeroed config from the AF default preset. */
  buildDefaultRules(): Record<string, number>

  /** Check if `rules` exactly matches a known preset. Returns preset key or null. */
  detectPresetMatch(rules: Record<string, number>): string | null
}

// ---------------------------------------------------------------------------
// Calculator interface
// ---------------------------------------------------------------------------

export interface IScoringCalculator {
  /**
   * Calculate fantasy points for a single player's stat line using the
   * provided scoring rules. Both `stats` and `rules` are flat key->value maps.
   */
  calculatePoints(
    stats: Record<string, number>,
    rules: Record<string, number>,
  ): number
}

// ---------------------------------------------------------------------------
// Recalculation job status
// ---------------------------------------------------------------------------

export type RecalcStatus = 'pending' | 'running' | 'complete' | 'failed'

export interface RecalcResult {
  leagueId: string
  sport: SupportedSport
  status: RecalcStatus
  affectedPlayers: number
  affectedMatchups: number
  triggeredAt: string
  completedAt?: string
  error?: string
}

// ---------------------------------------------------------------------------
// Permission check results
// ---------------------------------------------------------------------------

export interface PermissionCheckResult {
  allowed: boolean
  reason?: string
}

// ---------------------------------------------------------------------------
// Config comparison (diff)
// ---------------------------------------------------------------------------

export interface ScoringConfigDiff {
  sport: SupportedSport
  changedKeys: string[]
  /** Rules in the new config that differ from the previous/preset */
  changes: Record<string, { from: number; to: number }>
  presetChanged: boolean
  previousPreset?: string
  newPreset?: string
}

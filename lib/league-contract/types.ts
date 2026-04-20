/**
 * Canonical league contract — aligns with Prisma `League` + `settings` JSON + `LeagueSettings` draft row.
 *
 * - Core queryable fields: see `League` model (`presetKey`, `scoringPresetId`, `settingsSnapshotVersion`, `leagueType`).
 * - Full snapshot: `League.settings` should conform to `SettingsSnapshot` (versioned via `settingsSnapshotVersion`).
 * - Draft operations: `LeagueSettings` holds live draft room fields; mirror critical defaults in `settings.draftSettings`.
 */

import type { LeagueSport } from '@prisma/client'

/** Matches `League.leagueType` / wizard concept ids */
export type LeagueConceptId = string

export const SETTINGS_SNAPSHOT_VERSION = 1 as const

export interface SettingsSnapshot {
  /** Redundant with `League.settingsSnapshotVersion` when stored on row; useful for exported JSON bundles */
  snapshotVersion?: number

  rosterSettings?: RosterSettingsSlice
  scoringSettings?: ScoringSettingsSlice
  draftSettings?: DraftSettingsSlice
  waiverSettings?: WaiverSettingsSlice
  playoffSettings?: PlayoffSettingsSlice
  commissionerSettings?: CommissionerSettingsSlice
  mediaSettings?: MediaSettingsSlice
  visualTheme?: VisualThemeSlice

  /** Create-time specialty answers (minimal); optional after shell exists */
  conceptSetup?: ConceptSetupSlice
  /** Generated specialty rules; optional */
  conceptRules?: ConceptRulesSlice

  metadata?: {
    createdFromFlow?: string
    creationPresetSnapshot?: Record<string, unknown>
    importNormalizationVersion?: string
    lastSyncedAt?: string
    [key: string]: unknown
  }

  /** Legacy flat keys coexist during migration — do not strip arbitrarily */
  [key: string]: unknown
}

export interface RosterSettingsSlice {
  starterSlots?: Record<string, number>
  benchSlots?: number
  irSlots?: number
  taxiSlots?: number
  devyCollegeSlots?: number
  positionEligibility?: Record<string, unknown>
}

export interface ScoringSettingsSlice {
  format?: string
  scoringTemplateId?: string
  /** Passed to `server/services/scoringEngine` — supports `thresholdBonuses`, `positionMultipliers`, `idpStatAllowlist`, `matchupTiebreaker`, `standingsTiebreakerOrder`. */
  rules?: Record<string, unknown>
  source?: string
  preset?: string
  [key: string]: unknown
}

export interface DraftSettingsSlice {
  draftType?: string
  rounds?: number
  pickOrderRules?: string
  timerSeconds?: number
  thirdRoundReversal?: boolean
  auctionBudgetPerTeam?: number
  [key: string]: unknown
}

export interface WaiverSettingsSlice {
  waiverType?: string
  faabBudget?: number
  processingDays?: number[]
  processingTimeUtc?: string
  [key: string]: unknown
}

export interface PlayoffSettingsSlice {
  playoffTeams?: number
  playoffStartWeek?: number
  seedingRule?: string
  [key: string]: unknown
}

export interface CommissionerSettingsSlice {
  tradeReviewMode?: string
  tradeDeadlineWeek?: number
  [key: string]: unknown
}

export interface MediaSettingsSlice {
  introVideo?: { url?: string; key?: string }
  [key: string]: unknown
}

export interface VisualThemeSlice {
  accent?: string
  logoUrl?: string
  [key: string]: unknown
}

/** Minimum create-time specialty payload — extend per concept without new tables */
export type ConceptSetupSlice = Record<string, unknown>

export interface ConceptRulesSlice {
  concept?: LeagueConceptId
  version?: number
  extensions?: Record<string, unknown>
  [key: string]: unknown
}

export function parseSettingsSnapshot(raw: unknown): SettingsSnapshot | null {
  if (raw == null || typeof raw !== 'object' || Array.isArray(raw)) return null
  return raw as SettingsSnapshot
}

/** Build stable preset fingerprint for `League.presetKey` */
export function buildPresetKey(parts: {
  concept: string
  sport: LeagueSport | string
  scoringPresetId: string
  draftType: string
  teamCount?: number
}): string {
  const t = parts.teamCount != null ? `|teams=${parts.teamCount}` : ''
  return `af:v${SETTINGS_SNAPSHOT_VERSION}|concept=${parts.concept}|sport=${parts.sport}|scoring=${parts.scoringPresetId}|draft=${parts.draftType}${t}`
}

/**
 * Central sport configuration registry — DB seed, API, and adapters should reference this layer.
 */

import type { ScoringCategory, RosterSlot, SettingDef, SportConfigFull } from './types'
import { CRICKET_CONFIG } from './configs/cricket'
import { GOLF_CONFIG } from './configs/golf'
import { HORSE_RACING_CONFIG } from './configs/horse_racing'
import { MLB_CONFIG } from './configs/mlb'
import { NASCAR_CONFIG } from './configs/nascar'
import { NBA_CONFIG } from './configs/nba'
import { NCAAF_CONFIG } from './configs/ncaaf'
import { NCAAB_CONFIG } from './configs/ncaab'
import { NFL_CONFIG } from './configs/nfl'
import { NHL_CONFIG } from './configs/nhl'
import { SOCCER_CONFIG } from './configs/soccer'
import { TENNIS_CONFIG } from './configs/tennis'
import { WWE_CONFIG } from './configs/wwe'

export type { ScoringCategory, ScoringPreset, RosterSlot, SettingDef, SportConfigFull } from './types'

const SPORT_ALIASES: Record<string, string> = {
  NCAAFB: 'NCAAF',
  NCAABB: 'NCAAB',
}

export const SPORT_CONFIGS: Record<string, SportConfigFull> = {
  NFL: NFL_CONFIG,
  NBA: NBA_CONFIG,
  MLB: MLB_CONFIG,
  NHL: NHL_CONFIG,
  NCAAF: NCAAF_CONFIG,
  NCAAB: NCAAB_CONFIG,
  SOCCER: SOCCER_CONFIG,
  GOLF: GOLF_CONFIG,
  NASCAR: NASCAR_CONFIG,
  WWE: WWE_CONFIG,
  CRICKET: CRICKET_CONFIG,
  HORSE_RACING: HORSE_RACING_CONFIG,
  TENNIS: TENNIS_CONFIG,
}

export function resolveSportConfigKey(sport: string): string {
  const u = sport.trim().toUpperCase()
  return SPORT_ALIASES[u] ?? u
}

export function getSportConfig(sport: string): SportConfigFull {
  const key = resolveSportConfigKey(sport)
  const config = SPORT_CONFIGS[key]
  if (!config) throw new Error(`Unknown sport: ${sport}`)
  return config
}

export function tryGetSportConfig(sport: string): SportConfigFull | null {
  try {
    return getSportConfig(sport)
  } catch {
    return null
  }
}

export function getScoringCategories(sport: string, activeToggles: string[] = []): ScoringCategory[] {
  const config = getSportConfig(sport)
  return config.scoringCategories.filter((cat) => {
    if (!cat.requiresToggle) return true
    return activeToggles.includes(cat.requiresToggle)
  })
}

export function getRosterSlots(sport: string, activeToggles: string[] = []): RosterSlot[] {
  const config = getSportConfig(sport)
  return config.defaultRosterSlots.filter((slot) => {
    if (!slot.requiresToggle) return true
    return activeToggles.includes(slot.requiresToggle)
  })
}

/** Maps category toggles (IDP, SUPERFLEX) to commissioner SettingDef requiresToggle keys (enableIDP, …). */
export function expandSportConfigToggles(activeToggles: string[]): string[] {
  const s = new Set(activeToggles)
  if (s.has('IDP')) {
    s.add('enableIDP')
  }
  if (s.has('SUPERFLEX')) {
    s.add('enableSuperflex')
  }
  if (s.has('TE_PREMIUM')) {
    s.add('enableTEPremium')
  }
  return [...s]
}

export function getCommissionerSettings(sport: string, activeToggles: string[] = []): SettingDef[] {
  const config = getSportConfig(sport)
  const expanded = expandSportConfigToggles(activeToggles)
  return config.commissionerSettings.filter((setting) => {
    if (!setting.requiresToggle) return true
    return expanded.includes(setting.requiresToggle)
  })
}

export type ScheduleDefaults = {
  seasonWeeks: number
  playoffStartWeek: number
  playoffTeams: number
  matchupPeriodDays: number
  lineupLockType: string
}

/** Defaults for schedule + lineup lock — use at league / redraft season creation. */
export function getScheduleDefaults(sport: string): ScheduleDefaults {
  const c = getSportConfig(sport)
  return {
    seasonWeeks: c.defaultSeasonWeeks,
    playoffStartWeek: c.defaultPlayoffStartWeek,
    playoffTeams: c.defaultPlayoffTeams,
    matchupPeriodDays: c.defaultMatchupPeriodDays,
    lineupLockType: c.lineupLockType,
  }
}

/**
 * Validates lineup slots vs sport roster config.
 * If `playerPositions` is set, `lineup` maps slotKey → playerId and positions are resolved from `playerPositions`.
 * Otherwise `lineup` maps slotKey → position (legacy).
 */
export function validateLineup(
  sport: string,
  lineup: Record<string, string>,
  playerPositions: Record<string, string> | undefined,
  activeToggles: string[] = [],
): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  const slots = getRosterSlots(sport, activeToggles)
  const slotKeys = new Set(slots.map((s) => s.key))
  for (const [slotKey, raw] of Object.entries(lineup)) {
    if (!raw?.trim()) continue
    if (!slotKeys.has(slotKey)) {
      errors.push(`Unknown lineup slot "${slotKey}"`)
      continue
    }
    const slot = slots.find((s) => s.key === slotKey)!
    const pos = playerPositions ? playerPositions[raw] : raw
    if (!pos?.trim()) {
      errors.push(`Missing position for player in slot "${slot.label}" (${slotKey})`)
      continue
    }
    const ok = slot.eligiblePositions.some((e) => e === pos || e === '*')
    if (!ok) errors.push(`Position "${pos}" is not eligible for slot "${slot.label}" (${slotKey})`)
  }
  return { valid: errors.length === 0, errors }
}

/** Prisma `statCategories` row shape used by `calculateFantasyPoints`. */
export function toLegacyStatCategories(config: SportConfigFull): { key: string; label: string; points: number }[] {
  return config.scoringCategories.map((c) => ({
    key: c.key,
    label: c.label,
    points: c.defaultPoints,
  }))
}

/** Legacy `defaultPositions` rows for redraft seed. */
export function toLegacyDefaultPositions(config: SportConfigFull): { slot: string; eligible: string[]; count: number }[] {
  const rows: { slot: string; eligible: string[]; count: number }[] = config.defaultRosterSlots.map((s) => ({
    slot: s.key,
    eligible: s.eligiblePositions,
    count: s.defaultCount,
  }))
  rows.push({ slot: 'BN', eligible: ['*'], count: config.defaultBenchSlots })
  if (config.defaultIRSlots > 0) {
    rows.push({ slot: config.sport === 'MLB' ? 'IL' : 'IR', eligible: ['*'], count: config.defaultIRSlots })
  }
  return rows
}

export function estimateMaxRosterSize(config: SportConfigFull): number {
  const starters = config.defaultRosterSlots.reduce((sum, s) => sum + s.defaultCount, 0)
  return starters + config.defaultBenchSlots + config.defaultIRSlots + config.defaultTaxiSlots + config.defaultDevySlots
}

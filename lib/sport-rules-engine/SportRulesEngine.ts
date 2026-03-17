/**
 * Sport-Specific Settings Engine.
 * Controls valid roster slots, scoring settings, player pools, and draft options per sport.
 * Supported: NFL, NHL, NBA, MLB, NCAAB, NCAAF, SOCCER.
 */

import type { LeagueSport } from '@prisma/client'
import { SUPPORTED_SPORTS, isSupportedSport } from '@/lib/sport-scope'
import { getRosterDefaults, getScoringDefaults, getDraftDefaults } from '@/lib/sport-defaults/SportDefaultsRegistry'
import { getVariantsForSport } from '@/lib/sport-defaults/LeagueVariantRegistry'
import { getPositionsForSport } from '@/lib/multi-sport/SportRegistry'
import { getSportConfig } from '@/lib/multi-sport/SportRegistry'
import { getFormatTypeForVariant } from '@/lib/sport-defaults/LeagueVariantRegistry'
import type { SportType } from '@/lib/multi-sport/sport-types'
import { toSportType } from '@/lib/multi-sport/sport-types'
import type {
  SportRules,
  RosterRules,
  RosterSlotRule,
  ScoringRules,
  PlayerPoolRules,
  DraftOptionRules,
} from './types'

const FLEX_SLOT_NAMES = new Set(['FLEX', 'UTIL', 'G', 'F', 'SUPERFLEX', 'P', 'DL', 'DB', 'IDP_FLEX'])

/** Default pool size per sport for draft/waiver. */
const POOL_SIZE_BY_SPORT: Record<string, number> = {
  NFL: 300,
  NBA: 200,
  MLB: 400,
  NHL: 200,
  NCAAF: 250,
  NCAAB: 200,
  SOCCER: 300,
}

/** Sports that support devy/college pool. */
const DEVY_ELIGIBLE_SPORTS = new Set(['NFL', 'NCAAF'])

function toSportTypeSafe(sport: string): SportType {
  const u = sport?.trim().toUpperCase()
  if (!u) return 'NFL'
  return toSportType(u)
}

/**
 * Build roster rules from sport-defaults roster defaults.
 */
function buildRosterRules(sport: SportType, formatType: string): RosterRules {
  const format = formatType || (sport === 'NFL' ? 'STANDARD' : 'standard')
  const isIdp = getFormatTypeForVariant(sport, format) === 'IDP'
  const def = getRosterDefaults(sport, isIdp ? 'IDP' : undefined)
  const allPositions = getPositionsForSport(sport, isIdp ? 'IDP' : undefined)
  const slots: RosterSlotRule[] = []
  let order = 0
  for (const [slotName, count] of Object.entries(def.starter_slots)) {
    if (count <= 0) continue
    const flexDef = def.flex_definitions.find((f) => f.slotName === slotName)
    const allowedPositions = flexDef?.allowedPositions ?? [slotName]
    const isFlex = !!flexDef || FLEX_SLOT_NAMES.has(slotName)
    slots.push({
      slotName,
      allowedPositions,
      starterCount: count,
      benchCount: 0,
      reserveCount: 0,
      isFlexibleSlot: isFlex,
      slotOrder: order++,
    })
  }
  slots.push({
    slotName: 'BENCH',
    allowedPositions: allPositions,
    starterCount: 0,
    benchCount: def.bench_slots,
    reserveCount: 0,
    isFlexibleSlot: false,
    slotOrder: order++,
  })
  if (def.IR_slots > 0) {
    slots.push({
      slotName: 'IR',
      allowedPositions: allPositions,
      starterCount: 0,
      benchCount: 0,
      reserveCount: def.IR_slots,
      isFlexibleSlot: false,
      slotOrder: order++,
    })
  }
  return {
    sport,
    formatType: format,
    slots,
    allPositions,
    benchSlots: def.bench_slots,
    irSlots: def.IR_slots,
  }
}

/**
 * Build scoring rules from sport-defaults and variant registry.
 */
function buildScoringRules(sport: SportType): ScoringRules {
  const def = getScoringDefaults(sport)
  const variants = getVariantsForSport(sport)
  const validFormats = variants.map((v) => ({ value: v.value, label: v.label }))
  return {
    sport,
    defaultFormat: def.scoring_format,
    validFormats: validFormats.length > 0 ? validFormats : [{ value: 'STANDARD', label: 'Standard' }],
    categoryType: def.category_type ?? 'points',
  }
}

/**
 * Build player pool rules for a sport.
 */
function buildPlayerPoolRules(sport: SportType): PlayerPoolRules {
  const positions = getPositionsForSport(sport)
  const poolSize = POOL_SIZE_BY_SPORT[sport] ?? 300
  const devyEligible = DEVY_ELIGIBLE_SPORTS.has(sport)
  return {
    sport,
    source: sport === 'NFL' ? 'sleeper' : 'sports_player',
    validPositions: positions,
    poolSizeLimit: poolSize,
    devyEligible,
  }
}

/**
 * Build draft option rules from sport-defaults draft defaults.
 */
function buildDraftOptionRules(sport: SportType, formatType: string): DraftOptionRules {
  const format = getFormatTypeForVariant(sport, formatType || null) === 'IDP' ? 'IDP' : undefined
  const def = getDraftDefaults(sport, format)
  const roundsDefault = def.rounds_default ?? 15
  return {
    sport,
    formatType: formatType || 'standard',
    allowedDraftTypes: ['snake', 'linear', 'auction', 'slow_draft'],
    defaultDraftType: (def.draft_type as 'snake' | 'linear' | 'auction') ?? 'snake',
    roundsDefault,
    roundsMin: Math.max(1, Math.floor(roundsDefault * 0.5)),
    roundsMax: Math.min(50, Math.ceil(roundsDefault * 2)),
    timerSecondsDefault: def.timer_seconds_default ?? 90,
    pickOrderRules: def.pick_order_rules ?? 'snake',
    thirdRoundReversalSupported: def.third_round_reversal ?? false,
    keeperDynastyCarryoverSupported: def.keeper_dynasty_carryover_supported ?? true,
    queueSizeLimit: def.queue_size_limit ?? 50,
    preDraftRankingSource: def.pre_draft_ranking_source ?? 'adp',
  }
}

/** In-memory cache for getRulesForSport to avoid recomputing on repeated calls (e.g. wizard step changes). */
const rulesCache = new Map<string, SportRules>()
const RULES_CACHE_MAX = 32

function rulesCacheKey(sport: SportType, format: string): string {
  return `${sport}:${format}`
}

/**
 * Get full sport rules for a sport and optional format/variant.
 * Use this to drive league creation UI and validate settings.
 * Results are cached by (sport, formatType) to reduce work during league creation.
 */
export function getRulesForSport(sport: SportType | string, formatType?: string | null): SportRules {
  const s = typeof sport === 'string' ? toSportTypeSafe(sport) : (sport as SportType)
  const format = formatType?.trim() || (s === 'NFL' ? 'STANDARD' : 'standard')
  const key = rulesCacheKey(s, format)
  const cached = rulesCache.get(key)
  if (cached) return cached
  const config = getSportConfig(s)
  const displayName = config.displayName ?? s
  const rules: SportRules = {
    sport: s,
    formatType: format,
    displayName,
    roster: buildRosterRules(s, format),
    scoring: buildScoringRules(s),
    playerPool: buildPlayerPoolRules(s),
    draft: buildDraftOptionRules(s, format),
  }
  if (rulesCache.size >= RULES_CACHE_MAX) {
    const firstKey = rulesCache.keys().next().value
    if (firstKey != null) rulesCache.delete(firstKey)
  }
  rulesCache.set(key, rules)
  return rules
}

/**
 * Get valid roster slot names for display (e.g. "QB, RB, WR, TE, FLEX, DST").
 */
export function getValidRosterSlotNames(sport: SportType | string, formatType?: string | null): string[] {
  const rules = getRulesForSport(sport, formatType)
  return rules.roster.slots
    .filter((slot) => slot.starterCount > 0 || slot.slotName === 'BENCH' || slot.slotName === 'IR')
    .map((slot) => slot.slotName)
}

/**
 * Get valid positions for a sport (for player pool and validation).
 */
export function getValidPositions(sport: SportType | string, formatType?: string | null): string[] {
  const rules = getRulesForSport(sport, formatType)
  return [...rules.roster.allPositions]
}

/**
 * Check if a sport is supported.
 */
export function isSportSupported(sport: string): sport is LeagueSport {
  return isSupportedSport(sport)
}

/**
 * List all supported sports (from sport-scope).
 */
export function getSupportedSports(): LeagueSport[] {
  return [...SUPPORTED_SPORTS]
}

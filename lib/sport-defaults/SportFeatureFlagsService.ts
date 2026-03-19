/**
 * [NEW] lib/sport-defaults/SportFeatureFlagsService.ts
 * Resolves sport feature flags from DB (seeded); fallback to in-memory defaults (PROMPT 2/4).
 * Validation ensures sport-incompatible flags cannot be enabled by commissioner.
 */

import { prisma } from '@/lib/prisma'
import type { SportType } from './types'
import { toSportType } from './sport-type-utils'

export interface SportFeatureFlagsDto {
  sportType: SportType
  supportsBestBall: boolean
  supportsSuperflex: boolean
  supportsTePremium: boolean
  supportsKickers: boolean
  supportsTeamDefense: boolean
  supportsIdp: boolean
  supportsWeeklyLineups: boolean
  supportsDailyLineups: boolean
  supportsBracketMode: boolean
  supportsDevy: boolean
  supportsTaxi: boolean
  supportsIr: boolean
}

const IN_MEMORY_FLAGS: Record<SportType, SportFeatureFlagsDto> = {
  NFL: {
    sportType: 'NFL',
    supportsBestBall: true,
    supportsSuperflex: true,
    supportsTePremium: true,
    supportsKickers: true,
    supportsTeamDefense: true,
    supportsIdp: true,
    supportsWeeklyLineups: true,
    supportsDailyLineups: false,
    supportsBracketMode: false,
    supportsDevy: true,
    supportsTaxi: true,
    supportsIr: true,
  },
  MLB: {
    sportType: 'MLB',
    supportsBestBall: false,
    supportsSuperflex: false,
    supportsTePremium: false,
    supportsKickers: false,
    supportsTeamDefense: false,
    supportsIdp: false,
    supportsWeeklyLineups: true,
    supportsDailyLineups: true,
    supportsBracketMode: false,
    supportsDevy: false,
    supportsTaxi: false,
    supportsIr: false,
  },
  NHL: {
    sportType: 'NHL',
    supportsBestBall: false,
    supportsSuperflex: false,
    supportsTePremium: false,
    supportsKickers: false,
    supportsTeamDefense: false,
    supportsIdp: false,
    supportsWeeklyLineups: true,
    supportsDailyLineups: false,
    supportsBracketMode: false,
    supportsDevy: false,
    supportsTaxi: false,
    supportsIr: true,
  },
  NBA: {
    sportType: 'NBA',
    supportsBestBall: true,
    supportsSuperflex: false,
    supportsTePremium: false,
    supportsKickers: false,
    supportsTeamDefense: false,
    supportsIdp: false,
    supportsWeeklyLineups: true,
    supportsDailyLineups: true,
    supportsBracketMode: false,
    supportsDevy: true,
    supportsTaxi: true,
    supportsIr: true,
  },
  SOCCER: {
    sportType: 'SOCCER',
    supportsBestBall: false,
    supportsSuperflex: false,
    supportsTePremium: false,
    supportsKickers: false,
    supportsTeamDefense: false,
    supportsIdp: false,
    supportsWeeklyLineups: true,
    supportsDailyLineups: false,
    supportsBracketMode: false,
    supportsDevy: false,
    supportsTaxi: false,
    supportsIr: false,
  },
  NCAAB: {
    sportType: 'NCAAB',
    supportsBestBall: true,
    supportsSuperflex: false,
    supportsTePremium: false,
    supportsKickers: false,
    supportsTeamDefense: false,
    supportsIdp: false,
    supportsWeeklyLineups: true,
    supportsDailyLineups: false,
    supportsBracketMode: true,
    supportsDevy: true,
    supportsTaxi: false,
    supportsIr: true,
  },
  NCAAF: {
    sportType: 'NCAAF',
    supportsBestBall: true,
    supportsSuperflex: true,
    supportsTePremium: false,
    supportsKickers: false,
    supportsTeamDefense: false,
    supportsIdp: false,
    supportsWeeklyLineups: true,
    supportsDailyLineups: false,
    supportsBracketMode: false,
    supportsDevy: true,
    supportsTaxi: false,
    supportsIr: true,
  },
}

/**
 * Get feature flags for a sport. Uses DB if seeded; otherwise in-memory defaults.
 */
export async function getSportFeatureFlags(sportType: SportType | string): Promise<SportFeatureFlagsDto> {
  const sport = toSportType(typeof sportType === 'string' ? sportType : sportType) as SportType
  const row = await prisma.sportFeatureFlags.findUnique({
    where: { sportType: sport },
  })
  if (row) {
    return {
      sportType: sport,
      supportsBestBall: row.supportsBestBall,
      supportsSuperflex: row.supportsSuperflex,
      supportsTePremium: row.supportsTePremium,
      supportsKickers: row.supportsKickers,
      supportsTeamDefense: row.supportsTeamDefense,
      supportsIdp: row.supportsIdp,
      supportsWeeklyLineups: row.supportsWeeklyLineups,
      supportsDailyLineups: row.supportsDailyLineups,
      supportsBracketMode: row.supportsBracketMode,
      supportsDevy: row.supportsDevy,
      supportsTaxi: row.supportsTaxi,
      supportsIr: row.supportsIr,
    }
  }
  return IN_MEMORY_FLAGS[sport] ?? IN_MEMORY_FLAGS.NFL
}

/**
 * Validate that requested league/settings flags are allowed for this sport.
 * Returns { valid: true } or { valid: false, disallowed: string[] }.
 */
export async function validateLeagueFeatureFlags(
  sportType: SportType | string,
  requested: Partial<Record<keyof Omit<SportFeatureFlagsDto, 'sportType'>, boolean>>
): Promise<{ valid: boolean; disallowed?: string[] }> {
  const flags = await getSportFeatureFlags(sportType)
  const disallowed: string[] = []
  if (requested.supportsBestBall === true && !flags.supportsBestBall) disallowed.push('supportsBestBall')
  if (requested.supportsSuperflex === true && !flags.supportsSuperflex) disallowed.push('supportsSuperflex')
  if (requested.supportsTePremium === true && !flags.supportsTePremium) disallowed.push('supportsTePremium')
  if (requested.supportsKickers === true && !flags.supportsKickers) disallowed.push('supportsKickers')
  if (requested.supportsTeamDefense === true && !flags.supportsTeamDefense) disallowed.push('supportsTeamDefense')
  if (requested.supportsIdp === true && !flags.supportsIdp) disallowed.push('supportsIdp')
  if (requested.supportsDailyLineups === true && !flags.supportsDailyLineups) disallowed.push('supportsDailyLineups')
  if (requested.supportsBracketMode === true && !flags.supportsBracketMode) disallowed.push('supportsBracketMode')
  if (requested.supportsDevy === true && !flags.supportsDevy) disallowed.push('supportsDevy')
  if (requested.supportsTaxi === true && !flags.supportsTaxi) disallowed.push('supportsTaxi')
  if (requested.supportsIr === true && !flags.supportsIr) disallowed.push('supportsIr')
  return disallowed.length === 0 ? { valid: true } : { valid: false, disallowed }
}

/**
 * Check a single flag for the sport (e.g. before enabling IDP for a league).
 */
export async function isFeatureAllowed(
  sportType: SportType | string,
  flag: keyof Omit<SportFeatureFlagsDto, 'sportType'>
): Promise<boolean> {
  const flags = await getSportFeatureFlags(sportType)
  return Boolean(flags[flag])
}

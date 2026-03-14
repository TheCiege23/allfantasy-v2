/**
 * Universal player pool service for multi-sport systems.
 * Exposes a single player DTO (UniversalPlayerRecord) and sport/league-scoped pools
 * for draft room, waiver wire, and roster validation.
 */
import type { LeagueSport } from '@prisma/client'
import type { UniversalPlayerRecord } from './types'
import { getPlayerPoolForSport, getPlayerPoolForLeague as getPoolForLeague } from './SportPlayerPoolResolver'

export type { UniversalPlayerRecord }

export interface UniversalPlayerPoolOptions {
  limit?: number
  teamId?: string
  position?: string
}

/**
 * Get universal player pool for a sport (NFL, NHL, MLB, NBA, NCAAF, NCAAB, SOCCER).
 * Use for draft room filtering and waiver eligibility by sport.
 */
export async function getUniversalPlayerPoolForSport(
  sportType: string,
  options?: UniversalPlayerPoolOptions
): Promise<UniversalPlayerRecord[]> {
  return getPlayerPoolForSport(sportType, options) as Promise<UniversalPlayerRecord[]>
}

/**
 * Get universal player pool for a league (sport = league.sport).
 * Use for draft room and waiver wire when leagueId is known.
 */
export async function getUniversalPlayerPoolForLeague(
  leagueId: string,
  leagueSport: LeagueSport,
  options?: UniversalPlayerPoolOptions
): Promise<UniversalPlayerRecord[]> {
  return getPoolForLeague(leagueId, leagueSport, options) as Promise<UniversalPlayerRecord[]>
}

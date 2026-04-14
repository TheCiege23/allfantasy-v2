/**
 * Sport-specific qualification → next-round advancement targets for tournament hubs.
 * Pool sizes are fixed tiers: 72, 144, 216 managers (6 / 12 / 18 leagues × 12 teams).
 *
 * NFL example: 60 of 72 managers advance after qualification round 1 (product rule).
 * Other sports use the same 5/6 retention ratio unless overridden below.
 */

import { normalizeToSupportedSport } from '@/lib/sport-scope'
import type { LeagueSport } from '@prisma/client'

/** Allowed tournament participant pool sizes (must equal 12 × feeder league count). */
export const TOURNAMENT_POOL_TIERS = [72, 144, 216] as const

/** Feeder league counts for each tier (12 teams per league). */
export const FEEDER_LEAGUES_BY_POOL: Record<(typeof TOURNAMENT_POOL_TIERS)[number], number> = {
  72: 6,
  144: 12,
  216: 18,
}

/** Fixed teams per feeder league for tournament qualification. */
export const TOURNAMENT_TEAMS_PER_LEAGUE = 12

/**
 * How many managers advance out of qualification into the next tournament phase (sport-aware).
 * Stored on `LegacyTournament.settings.qualificationAdvancementTotal` at create time.
 */
export function getQualificationAdvancementTotal(sport: string, participantPoolSize: number): number {
  const s = (normalizeToSupportedSport(sport) ?? 'NFL') as LeagueSport
  const pool = participantPoolSize

  // Explicit NFL targets for the standard 72-manager tier (60 advance).
  if (pool === 72 && s === 'NFL') {
    return 60
  }

  // Same ratio as NFL 72-tier for other sports at 72: 60 advance.
  if (pool === 72) {
    return 60
  }

  // Scale proportionally for 144 and 216 (5/6 of pool advance).
  if (pool === 144 || pool === 216) {
    return Math.floor((pool * 5) / 6)
  }

  // Fallback: nearest 5/6 rule for any legacy pool size.
  return Math.max(12, Math.floor((pool * 5) / 6))
}

export function getFeederLeagueCountForPool(participantPoolSize: number): number {
  const n = FEEDER_LEAGUES_BY_POOL[participantPoolSize as keyof typeof FEEDER_LEAGUES_BY_POOL]
  if (typeof n === 'number') return n
  return Math.max(2, Math.floor(participantPoolSize / TOURNAMENT_TEAMS_PER_LEAGUE))
}

/**
 * Managers that advance from qualification per conference (e.g. 60 total / 2 conferences = 30 each).
 */
export function getQualificationCutSlotsPerConference(
  sport: string,
  participantPoolSize: number,
  qualificationAdvancementTotal: number | undefined,
  conferenceCount: number
): number {
  const total = qualificationAdvancementTotal ?? getQualificationAdvancementTotal(sport, participantPoolSize)
  return Math.max(1, Math.floor(total / Math.max(1, conferenceCount)))
}

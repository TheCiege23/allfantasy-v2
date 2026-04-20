/**
 * Zombie leagues: all 7 platform league sports (NFL, NBA, NHL, MLB, NCAAF,
 * NCAAB, SOCCER). Soccer was previously excluded as a product rule but the
 * current spec calls for full coverage — sportRulesConfig already ships a
 * soccer rules document so the engine has everything it needs.
 */
import type { LeagueSport } from '@prisma/client'
import { SUPPORTED_SPORTS } from '@/lib/sport-scope'

export const ZOMBIE_ELIGIBLE_LEAGUE_SPORTS: LeagueSport[] = [...SUPPORTED_SPORTS]

export function isZombieEligibleLeagueSport(sport: string | null | undefined): sport is LeagueSport {
  if (!sport) return false
  const u = sport.toUpperCase() as LeagueSport
  return ZOMBIE_ELIGIBLE_LEAGUE_SPORTS.includes(u)
}

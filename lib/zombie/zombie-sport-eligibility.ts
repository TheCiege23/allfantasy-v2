/**
 * Zombie leagues support all 7 platform league sports: NFL, NBA, NHL, MLB,
 * NCAAF, NCAAB, SOCCER. sportRulesConfig ships a rules document per sport.
 */
import type { LeagueSport } from '@prisma/client'
import { SUPPORTED_SPORTS } from '@/lib/sport-scope'

export const ZOMBIE_ELIGIBLE_LEAGUE_SPORTS: LeagueSport[] = [...SUPPORTED_SPORTS]

export function isZombieEligibleLeagueSport(sport: string | null | undefined): sport is LeagueSport {
  if (!sport) return false
  const u = sport.toUpperCase() as LeagueSport
  return ZOMBIE_ELIGIBLE_LEAGUE_SPORTS.includes(u)
}

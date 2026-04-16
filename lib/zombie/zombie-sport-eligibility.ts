/**
 * Zombie leagues: all platform league sports except Soccer (product rule).
 * Uses Prisma `LeagueSport` — extended sports (PGA, etc.) require enum + registry updates.
 */
import type { LeagueSport } from '@prisma/client'
import { SUPPORTED_SPORTS } from '@/lib/sport-scope'

export const ZOMBIE_ELIGIBLE_LEAGUE_SPORTS: LeagueSport[] = SUPPORTED_SPORTS.filter((s) => s !== 'SOCCER')

export function isZombieEligibleLeagueSport(sport: string | null | undefined): sport is LeagueSport {
  if (!sport) return false
  const u = sport.toUpperCase() as LeagueSport
  return ZOMBIE_ELIGIBLE_LEAGUE_SPORTS.includes(u)
}

/**
 * Ensures a league has LeagueWaiverSettings with sport- and variant-aware defaults.
 * Idempotent: creates settings only when missing so commissioner overrides are preserved.
 */
import { prisma } from '@/lib/prisma'
import { getWaiverDefaults } from '@/lib/sport-defaults/SportDefaultsRegistry'
import type { SportType } from '@/lib/sport-defaults/types'
import { toSportType } from '@/lib/sport-defaults/sport-type-utils'

export interface LeagueWaiverBootstrapResult {
  leagueId: string
  waiverSettingsApplied: boolean
  sport: string
  variant: string | null
}

/**
 * Ensure league has LeagueWaiverSettings. If missing, create with sport/variant defaults.
 * Does not overwrite existing settings.
 */
export async function bootstrapLeagueWaiverSettings(leagueId: string): Promise<LeagueWaiverBootstrapResult> {
  const league = await (prisma as any).league.findUnique({
    where: { id: leagueId },
    select: { id: true, sport: true, leagueVariant: true },
  })
  if (!league) {
    return { leagueId, waiverSettingsApplied: false, sport: '', variant: null }
  }

  const existing = await (prisma as any).leagueWaiverSettings.findUnique({
    where: { leagueId },
  })
  if (existing) {
    return {
      leagueId,
      waiverSettingsApplied: false,
      sport: (league.sport as string) || 'NFL',
      variant: league.leagueVariant ?? null,
    }
  }

  const sport = (league.sport as string) || 'NFL'
  const variant = league.leagueVariant ?? null
  const sportType = toSportType(sport) as SportType
  const waiverDef = getWaiverDefaults(sportType, variant ?? undefined)

  await (prisma as any).leagueWaiverSettings.create({
    data: {
      leagueId,
      waiverType: waiverDef.waiver_type,
      faabBudget: waiverDef.FAAB_budget_default,
      processingDayOfWeek: waiverDef.processing_days?.[0] ?? null,
      processingTimeUtc: waiverDef.processing_time_utc ?? null,
      claimLimitPerPeriod: waiverDef.max_claims_per_period ?? null,
      tiebreakRule: (waiverDef.claim_priority_behavior as string) ?? null,
      lockType: (waiverDef.game_lock_behavior as string) ?? null,
      instantFaAfterClear: waiverDef.free_agent_unlock_behavior === 'instant',
    },
  })

  return { leagueId, waiverSettingsApplied: true, sport, variant }
}

/**
 * Resolves waiver processing config for a league: days, time, lock, claim limits.
 * Reads from LeagueWaiverSettings when present; falls back to sport/variant waiver defaults.
 */
import { prisma } from '@/lib/prisma'
import { getWaiverDefaults } from '@/lib/sport-defaults/SportDefaultsRegistry'
import type { SportType } from '@/lib/sport-defaults/types'
import { toSportType } from '@/lib/sport-defaults/sport-type-utils'

export interface WaiverProcessingConfig {
  waiver_type: string
  processing_days: number[]
  processing_time_utc: string | null
  claim_limit_per_period: number | null
  game_lock_behavior: string | null
  free_agent_unlock_behavior: string
  continuous_waivers: boolean
  sport: string
  variant: string | null
}

/**
 * Get waiver processing config for a league (for processor and UI).
 * Uses LeagueWaiverSettings when present; otherwise sport/variant defaults.
 */
export async function getWaiverProcessingConfigForLeague(
  leagueId: string
): Promise<WaiverProcessingConfig | null> {
  const [league, settings] = await Promise.all([
    (prisma as any).league.findUnique({
      where: { id: leagueId },
      select: { sport: true, leagueVariant: true },
    }),
    (prisma as any).leagueWaiverSettings.findUnique({
      where: { leagueId },
    }),
  ])
  if (!league) return null

  const sport = (league.sport as string) || 'NFL'
  const variant = league.leagueVariant ?? null
  const sportType = toSportType(sport) as SportType
  const defaults = getWaiverDefaults(sportType, variant ?? undefined)

  const useStored = settings != null

  const processing_days = useStored && settings.processingDayOfWeek != null
    ? [settings.processingDayOfWeek]
    : (defaults.processing_days ?? [])

  return {
    waiver_type: useStored ? (settings.waiverType ?? defaults.waiver_type) : defaults.waiver_type,
    processing_days: (Array.isArray(processing_days) ? processing_days : [processing_days]).filter((d: unknown): d is number => typeof d === 'number'),
    processing_time_utc: useStored ? (settings.processingTimeUtc ?? defaults.processing_time_utc ?? null) : (defaults.processing_time_utc ?? null),
    claim_limit_per_period: useStored ? settings.claimLimitPerPeriod : (defaults.max_claims_per_period ?? null),
    game_lock_behavior: useStored ? (settings.lockType ?? defaults.game_lock_behavior as string) : (defaults.game_lock_behavior as string ?? null),
    free_agent_unlock_behavior: useStored && settings.instantFaAfterClear ? 'instant' : (defaults.free_agent_unlock_behavior as string ?? 'after_waiver_run'),
    continuous_waivers: defaults.continuous_waivers_behavior ?? false,
    sport,
    variant,
  }
}

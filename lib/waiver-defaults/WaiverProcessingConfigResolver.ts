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
  claim_priority_behavior: string | null
  game_lock_behavior: string | null
  drop_lock_behavior: string | null
  same_day_add_drop_rules: string | null
  free_agent_unlock_behavior: string
  continuous_waivers: boolean
  max_claims_per_period: number | null
  faab_enabled: boolean
  faab_budget: number | null
  faab_reset_rules: string | null
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

  const fromSettings = <T>(value: T | null | undefined, fallback: T): T =>
    value === undefined || value === null ? fallback : value

  const processing_days = settings?.processingDayOfWeek != null
    ? [settings.processingDayOfWeek]
    : (defaults.processing_days ?? [])

  const waiverType = fromSettings<string | null>(settings?.waiverType ?? null, defaults.waiver_type) ?? defaults.waiver_type
  const claimPriorityBehavior = fromSettings<string | null>(settings?.tiebreakRule ?? null, String(defaults.claim_priority_behavior ?? 'faab_highest'))
  const gameLockBehavior = fromSettings<string | null>(settings?.lockType ?? null, (defaults.game_lock_behavior as string) ?? null)
  const freeAgentUnlockBehavior = settings?.instantFaAfterClear === true
    ? 'instant'
    : settings?.instantFaAfterClear === false
      ? String(defaults.free_agent_unlock_behavior ?? 'after_waiver_run')
      : String(defaults.free_agent_unlock_behavior ?? 'after_waiver_run')
  const faabEnabled = waiverType === 'faab'
  const faabBudget = fromSettings<number | null>(settings?.faabBudget ?? null, defaults.FAAB_budget_default ?? null)

  return {
    waiver_type: waiverType,
    processing_days: (Array.isArray(processing_days) ? processing_days : [processing_days]).filter((d: unknown): d is number => typeof d === 'number'),
    processing_time_utc: fromSettings<string | null>(settings?.processingTimeUtc ?? null, defaults.processing_time_utc ?? null),
    claim_limit_per_period: fromSettings<number | null>(settings?.claimLimitPerPeriod ?? null, defaults.max_claims_per_period ?? null),
    claim_priority_behavior: claimPriorityBehavior,
    game_lock_behavior: gameLockBehavior,
    drop_lock_behavior: String(defaults.drop_lock_behavior ?? 'lock_with_game'),
    same_day_add_drop_rules: String(defaults.same_day_add_drop_rules ?? 'allow_if_not_played'),
    free_agent_unlock_behavior: freeAgentUnlockBehavior,
    continuous_waivers: defaults.continuous_waivers_behavior ?? false,
    max_claims_per_period: defaults.max_claims_per_period ?? null,
    faab_enabled: faabEnabled,
    faab_budget: faabBudget,
    faab_reset_rules: String(defaults.faab_reset_rules ?? 'never'),
    sport,
    variant,
  }
}

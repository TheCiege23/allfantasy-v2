/**
 * Resolves FAAB config for a league: enabled, budget, reset rules.
 * Used by waiver UI, claim submission, and AI waiver recommendations.
 */
import { prisma } from '@/lib/prisma'
import { DEFAULT_SPORT } from '@/lib/sport-scope'
import { getWaiverDefaults } from '@/lib/sport-defaults/SportDefaultsRegistry'
import type { SportType } from '@/lib/sport-defaults/types'
import { toSportType } from '@/lib/sport-defaults/sport-type-utils'

export interface FAABConfig {
  faab_enabled: boolean
  faab_budget: number | null
  faab_reset_rules: string | null
  faab_reset_date: Date | null
  sport: string
  variant: string | null
}

/**
 * Get FAAB config for a league. Uses LeagueWaiverSettings when present; otherwise sport/variant defaults.
 */
export async function getFAABConfigForLeague(leagueId: string): Promise<FAABConfig | null> {
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

  const sport = (league.sport as string) || DEFAULT_SPORT
  const variant = league.leagueVariant ?? null
  const sportType = toSportType(sport) as SportType
  const defaults = getWaiverDefaults(sportType, variant ?? undefined)

  const fromSettings = <T>(value: T | null | undefined, fallback: T): T =>
    value === undefined || value === null ? fallback : value

  const waiverType = fromSettings<string | null>(settings?.waiverType ?? null, defaults.waiver_type) ?? defaults.waiver_type
  const faab_enabled = waiverType === 'faab'

  return {
    faab_enabled,
    faab_budget: fromSettings<number | null>(settings?.faabBudget ?? null, defaults.FAAB_budget_default ?? null),
    faab_reset_rules: defaults.faab_reset_rules ?? null,
    faab_reset_date: settings?.faabResetDate ?? null,
    sport,
    variant,
  }
}

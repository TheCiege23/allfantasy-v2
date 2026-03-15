/**
 * Resolves standings tiebreaker order for a league. Used by standings display and playoff seeding.
 */
import { prisma } from '@/lib/prisma'
import { getDefaultLeagueSettings } from '@/lib/sport-defaults/LeagueDefaultSettingsService'
import { toSportType } from '@/lib/sport-defaults/sport-type-utils'

export interface StandingsTiebreakerConfig {
  tiebreakers: string[]
  sport: string
  variant: string | null
}

/**
 * Get standings tiebreaker order for a league. Uses League.settings.standings_tiebreakers when present; else sport defaults.
 */
export async function getStandingsTiebreakersForLeague(leagueId: string): Promise<StandingsTiebreakerConfig | null> {
  const league = await (prisma as any).league.findUnique({
    where: { id: leagueId },
    select: { sport: true, leagueVariant: true, settings: true },
  })
  if (!league) return null

  const settings = (league.settings as Record<string, unknown>) ?? {}
  const sport = (league.sport as string) || 'NFL'
  const variant = league.leagueVariant ?? null

  const stored = settings.standings_tiebreakers
  const tiebreakers = Array.isArray(stored) && stored.length > 0
    ? (stored as string[])
    : getDefaultLeagueSettings(sport).standings_tiebreakers

  return {
    tiebreakers,
    sport,
    variant,
  }
}

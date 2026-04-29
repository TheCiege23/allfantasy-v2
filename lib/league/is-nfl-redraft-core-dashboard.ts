import type { UserLeague } from '@/app/dashboard/types'
import { DEFAULT_SPORT, normalizeToSupportedSport } from '@/lib/sport-scope'

/** League-like shape for dashboard gating (Prisma `League` or `UserLeague` subset). */
export type NflRedraftCoreLeagueShape = {
  sport: string
  leagueType?: string | null
  isDynasty?: boolean | null
  leagueVariant?: string | null
  bestBallMode?: boolean | null
  guillotineMode?: boolean | null
  keeperPhaseActive?: boolean | null
}

const SPECIALTY_VARIANTS = new Set([
  'survivor',
  'zombie',
  'big_brother',
  'idp',
  'dynasty_idp',
  'merged_devy_c2c',
  'devy_dynasty',
])

/**
 * True when the league should use the simplified NFL redraft shell (Home / Roster / Matchups / …).
 * Excludes specialty formats, dynasty/keeper/devy/C2C, best ball, guillotine, etc.
 */
export function isNflRedraftCoreDashboardLeague(league: NflRedraftCoreLeagueShape): boolean {
  const sport = normalizeToSupportedSport(String(league.sport)) ?? DEFAULT_SPORT
  if (sport !== 'NFL') return false
  if (league.isDynasty) return false
  if (league.bestBallMode) return false
  if (league.guillotineMode) return false
  if (league.keeperPhaseActive) return false

  const lt = String(league.leagueType ?? 'redraft').toLowerCase()
  if (lt !== 'redraft') return false

  const v = String(league.leagueVariant ?? '').trim().toLowerCase()
  if (v && SPECIALTY_VARIANTS.has(v)) return false

  return true
}

/** Client tabs receive `UserLeague`; mirror Prisma gates using optional fields from `prismaLeagueToUserLeague`. */
export function isNflRedraftCoreDashboardFromUserLeague(league: UserLeague): boolean {
  return isNflRedraftCoreDashboardLeague({
    sport: league.sport,
    leagueType: league.leagueType ?? 'redraft',
    isDynasty: league.isDynasty ?? false,
    leagueVariant: league.leagueVariant ?? null,
    bestBallMode: league.bestBallMode ?? false,
    guillotineMode: league.guillotineMode ?? false,
    keeperPhaseActive: league.keeperPhaseActive ?? false,
  })
}

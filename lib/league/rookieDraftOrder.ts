/**
 * lib/league/rookieDraftOrder.ts
 * Computes rookie draft order for dynasty/C2C/devy leagues (future seasons).
 *
 * Two modes:
 * 1. WORST_TO_FIRST: Non-playoff teams by worst record (fewest wins, then fewest PF).
 *    Playoff teams by seeding. Champion picks last, runner-up picks 2nd to last.
 *
 * 2. REVERSE_MAX_PF: Non-playoff teams by lowest Max PF (points for, last week of
 *    regular season). Playoff teams by seeding. Champion last, runner-up 2nd to last.
 *
 * The system auto-calculates using end-of-regular-season data (before playoffs start)
 * for non-playoff teams and playoff seeding/results for playoff teams.
 *
 * AF Commissioner Subscription required.
 */

import { prisma } from '@/lib/prisma'

export type RookieDraftOrderMode = 'worst_to_first' | 'reverse_max_pf'

export interface RookieDraftSlot {
  slot: number
  teamId: string
  teamName: string
  ownerName: string
  avatarUrl: string | null
  /** Stat used for ordering: wins (worst_to_first) or maxPF (reverse_max_pf) */
  orderValue: number
  orderLabel: string
  isPlayoffTeam: boolean
  playoffFinish: string | null // 'Champion', 'Runner-Up', 'Seed 3', etc.
}

export interface RookieDraftOrderResult {
  mode: RookieDraftOrderMode
  season: number // The season this draft order is FOR (next season)
  basedOnSeason: number // The season data is FROM
  slots: RookieDraftSlot[]
  playoffTeamCount: number
  nonPlayoffTeamCount: number
  warning: string | null
}

/**
 * Compute rookie draft order for the next season.
 * Uses current season's data: end-of-regular-season standings for non-playoff,
 * and playoff results for playoff teams.
 */
export async function computeRookieDraftOrder(
  leagueId: string,
  mode: RookieDraftOrderMode
): Promise<RookieDraftOrderResult> {
  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    select: {
      id: true, season: true, leagueSize: true, settings: true,
      teams: {
        select: {
          id: true, teamName: true, ownerName: true, avatarUrl: true,
          wins: true, losses: true, ties: true, pointsFor: true,
          currentRank: true, isOrphan: true,
        },
        orderBy: { pointsFor: 'desc' },
      },
    },
  })

  if (!league) {
    return emptyResult(mode, 0, 'League not found')
  }

  const currentSeason = league.season ?? new Date().getFullYear()
  const nextSeason = currentSeason + 1
  const settings = (league.settings as Record<string, unknown>) ?? {}

  // Get active (non-orphan) teams
  const activeTeams = league.teams.filter(t => !t.isOrphan)
  if (activeTeams.length === 0) {
    return emptyResult(mode, nextSeason, 'No active teams')
  }

  // Determine playoff team count from settings
  const playoffTeamCount = resolvePlayoffTeamCount(settings, activeTeams.length)

  // Sort all teams by wins desc, then points for desc to determine playoff teams
  const sorted = [...activeTeams].sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins
    return (b.pointsFor ?? 0) - (a.pointsFor ?? 0)
  })

  const playoffTeamIds = new Set(sorted.slice(0, playoffTeamCount).map(t => t.id))

  // Separate into non-playoff and playoff groups
  const nonPlayoff = activeTeams.filter(t => !playoffTeamIds.has(t.id))
  const playoff = activeTeams.filter(t => playoffTeamIds.has(t.id))

  // ─── Sort non-playoff teams ───
  if (mode === 'worst_to_first') {
    // Worst record first: fewest wins, then fewest PF as tiebreaker
    nonPlayoff.sort((a, b) => {
      if (a.wins !== b.wins) return a.wins - b.wins
      return (a.pointsFor ?? 0) - (b.pointsFor ?? 0)
    })
  } else {
    // Reverse Max PF: lowest points for first (end of regular season)
    nonPlayoff.sort((a, b) => (a.pointsFor ?? 0) - (b.pointsFor ?? 0))
  }

  // ─── Sort playoff teams by seeding (worst seed first, champion last) ───
  // Use currentRank if available, otherwise wins desc
  playoff.sort((a, b) => {
    const rankA = a.currentRank ?? 999
    const rankB = b.currentRank ?? 999
    // Higher rank number = worse seed = picks earlier
    // Reverse: worst playoff seed picks first, champion (rank 1) picks last
    return rankB - rankA
  })

  // ─── Build ordered slots ───
  const slots: RookieDraftSlot[] = []
  let slotNum = 1

  // Non-playoff teams first
  for (const team of nonPlayoff) {
    slots.push({
      slot: slotNum++,
      teamId: team.id,
      teamName: team.teamName,
      ownerName: team.ownerName,
      avatarUrl: team.avatarUrl,
      orderValue: mode === 'worst_to_first' ? team.wins : (team.pointsFor ?? 0),
      orderLabel: mode === 'worst_to_first'
        ? `${team.wins}-${team.losses}${team.ties ? `-${team.ties}` : ''}`
        : `${(team.pointsFor ?? 0).toFixed(1)} PF`,
      isPlayoffTeam: false,
      playoffFinish: null,
    })
  }

  // Playoff teams (champion last, runner-up 2nd to last)
  for (let i = 0; i < playoff.length; i++) {
    const team = playoff[i]
    const isLast = i === playoff.length - 1
    const isSecondLast = i === playoff.length - 2

    let playoffFinish: string
    if (isLast) playoffFinish = 'Champion'
    else if (isSecondLast) playoffFinish = 'Runner-Up'
    else playoffFinish = `Seed ${team.currentRank ?? (playoffTeamCount - i)}`

    slots.push({
      slot: slotNum++,
      teamId: team.id,
      teamName: team.teamName,
      ownerName: team.ownerName,
      avatarUrl: team.avatarUrl,
      orderValue: mode === 'worst_to_first' ? team.wins : (team.pointsFor ?? 0),
      orderLabel: playoffFinish,
      isPlayoffTeam: true,
      playoffFinish,
    })
  }

  return {
    mode,
    season: nextSeason,
    basedOnSeason: currentSeason,
    slots,
    playoffTeamCount: playoff.length,
    nonPlayoffTeamCount: nonPlayoff.length,
    warning: null,
  }
}

/**
 * Save the rookie draft order mode to league settings.
 */
export async function saveRookieDraftOrderConfig(
  leagueId: string,
  config: {
    mode: RookieDraftOrderMode
    enabled: boolean
    userId: string
  }
): Promise<void> {
  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    select: { settings: true },
  })
  const settings = (league?.settings as Record<string, unknown>) ?? {}

  await prisma.league.update({
    where: { id: leagueId },
    data: {
      settings: {
        ...settings,
        rookie_draft_order: {
          mode: config.mode,
          enabled: config.enabled,
          lastUpdatedAt: new Date().toISOString(),
          lastUpdatedBy: config.userId,
        },
      },
    },
  })
}

/**
 * Get saved rookie draft order config from league settings.
 */
export async function getRookieDraftOrderConfig(
  leagueId: string
): Promise<{ mode: RookieDraftOrderMode; enabled: boolean } | null> {
  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    select: { settings: true },
  })
  const settings = (league?.settings as Record<string, unknown>) ?? {}
  const config = settings.rookie_draft_order as { mode?: string; enabled?: boolean } | undefined
  if (!config) return null
  return {
    mode: (config.mode === 'reverse_max_pf' ? 'reverse_max_pf' : 'worst_to_first') as RookieDraftOrderMode,
    enabled: Boolean(config.enabled),
  }
}

// ─── Helpers ───

function resolvePlayoffTeamCount(settings: Record<string, unknown>, teamCount: number): number {
  const explicit = settings.playoff_teams ?? settings.playoffTeamCount ?? settings.playoff_team_count
  if (typeof explicit === 'number' && explicit > 0) return Math.min(explicit, teamCount)
  // Default: top half, max 6
  return Math.min(6, Math.ceil(teamCount / 2))
}

function emptyResult(mode: RookieDraftOrderMode, season: number, warning: string): RookieDraftOrderResult {
  return { mode, season, basedOnSeason: season - 1, slots: [], playoffTeamCount: 0, nonPlayoffTeamCount: 0, warning }
}

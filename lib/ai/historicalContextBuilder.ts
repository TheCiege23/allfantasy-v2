/**
 * Historical Context Builder — aggregates past season data for AI prompts.
 *
 * Used by: Chimmy, draft AI, survivor AI, zombie AI, power rankings, weekly rankings.
 * Reads from: LeagueSeason, MatchupFact, DraftFact, SeasonStandingFact, league_manager_profiles.
 */

import { prisma } from '@/lib/prisma'

export interface ManagerProfile {
  managerId: string
  managerName: string
  managerAvatar: string | null
  totalSeasons: number
  totalWins: number
  totalLosses: number
  totalTies: number
  totalPointsFor: number
  championships: number
  playoffAppearances: number
  avgFinish: number | null
  winPct: number
  draftStyle: Record<string, unknown>
  favoritePositions: string[]
  firstRoundHistory: Array<{ season: number; pick: string; position: string }>
  headToHeadRecords: Record<string, { wins: number; losses: number }>
}

export interface LeagueHistoricalContext {
  leagueId: string
  leagueName: string
  sport: string
  totalSeasons: number
  seasons: Array<{
    season: number
    champion: string | null
    runnerUp: string | null
    teamCount: number
    scoringFormat: string | null
  }>
  managers: ManagerProfile[]
  rivalries: Array<{ manager1: string; manager2: string; totalGames: number; record: string }>
  leagueTrends: {
    avgPointsPerSeason: number
    scoringChanges: string[]
    dynastyOrRedraft: string
  }
}

/**
 * Build full historical context for a league.
 * This is the main function AI services should call.
 */
export async function buildLeagueHistoricalContext(leagueId: string): Promise<LeagueHistoricalContext> {
  const league = await (prisma as any).league.findUnique({
    where: { id: leagueId },
    select: { id: true, name: true, sport: true, isDynasty: true },
  })
  if (!league) throw new Error('League not found')

  // Get all seasons
  const seasons = await (prisma as any).leagueSeason.findMany({
    where: { leagueId },
    orderBy: { season: 'desc' },
    select: {
      season: true, platformLeagueId: true, championTeamId: true,
      runnerUpName: true, teamCount: true, teamRecords: true,
      scoringFormat: true, isDynasty: true,
    },
  })

  // Build manager profiles from teamRecords across all seasons
  const managerMap = new Map<string, ManagerProfile>()
  const h2hMap = new Map<string, Record<string, { wins: number; losses: number }>>()

  for (const s of seasons) {
    const records = (s.teamRecords ?? []) as Array<{
      rosterId?: string | number; ownerId?: string; managerName?: string; managerAvatar?: string
      wins?: number; losses?: number; ties?: number; pointsFor?: number; pointsAgainst?: number
      playoffFinish?: string; isChampion?: boolean; isRunnerUp?: boolean
    }>

    for (const r of records) {
      const mid = String(r.ownerId ?? r.rosterId ?? 'unknown')
      let profile = managerMap.get(mid)
      if (!profile) {
        profile = {
          managerId: mid,
          managerName: r.managerName ?? mid,
          managerAvatar: r.managerAvatar ?? null,
          totalSeasons: 0, totalWins: 0, totalLosses: 0, totalTies: 0,
          totalPointsFor: 0, championships: 0, playoffAppearances: 0,
          avgFinish: null, winPct: 0, draftStyle: {}, favoritePositions: [],
          firstRoundHistory: [], headToHeadRecords: {},
        }
        managerMap.set(mid, profile)
      }
      profile.totalSeasons++
      profile.totalWins += r.wins ?? 0
      profile.totalLosses += r.losses ?? 0
      profile.totalTies += r.ties ?? 0
      profile.totalPointsFor += r.pointsFor ?? 0
      if (r.isChampion) profile.championships++
      if (r.playoffFinish && r.playoffFinish !== 'missed') profile.playoffAppearances++
      if (r.managerAvatar) profile.managerAvatar = r.managerAvatar
    }
  }

  // Calculate win percentages
  for (const profile of managerMap.values()) {
    const totalGames = profile.totalWins + profile.totalLosses + profile.totalTies
    profile.winPct = totalGames > 0 ? Math.round((profile.totalWins / totalGames) * 1000) / 10 : 0
  }

  // Get head-to-head records from MatchupFact
  const matchups = await (prisma as any).matchupFact?.findMany?.({
    where: { leagueId },
    select: { teamA: true, teamB: true, scoreA: true, scoreB: true, winnerTeamId: true, season: true },
  }).catch(() => []) ?? []

  for (const m of matchups) {
    if (!m.teamA || !m.teamB) continue
    const key = [m.teamA, m.teamB].sort().join('|')
    if (!h2hMap.has(key)) h2hMap.set(key, {})
    const rec = h2hMap.get(key)!
    if (!rec[m.teamA]) rec[m.teamA] = { wins: 0, losses: 0 }
    if (!rec[m.teamB]) rec[m.teamB] = { wins: 0, losses: 0 }
    if (m.winnerTeamId === m.teamA) {
      rec[m.teamA]!.wins++; rec[m.teamB]!.losses++
    } else if (m.winnerTeamId === m.teamB) {
      rec[m.teamB]!.wins++; rec[m.teamA]!.losses++
    }
  }

  // Get draft tendencies from DraftFact
  const draftFacts = await (prisma as any).draftFact?.findMany?.({
    where: { leagueId },
    select: { managerId: true, round: true, pickNumber: true, playerId: true, season: true },
    orderBy: { pickNumber: 'asc' },
  }).catch(() => []) ?? []

  for (const df of draftFacts) {
    const profile = managerMap.get(df.managerId)
    if (profile && df.round === 1) {
      profile.firstRoundHistory.push({
        season: df.season,
        pick: df.playerId ?? 'unknown',
        position: '', // would need player lookup
      })
    }
  }

  // Build rivalries (most frequent matchups)
  const rivalries: Array<{ manager1: string; manager2: string; totalGames: number; record: string }> = []
  for (const [key, records] of h2hMap.entries()) {
    const [m1, m2] = key.split('|')
    if (!m1 || !m2) continue
    const r1 = records[m1]
    const r2 = records[m2]
    const total = (r1?.wins ?? 0) + (r1?.losses ?? 0)
    if (total >= 4) {
      const name1 = managerMap.get(m1)?.managerName ?? m1
      const name2 = managerMap.get(m2)?.managerName ?? m2
      rivalries.push({
        manager1: name1,
        manager2: name2,
        totalGames: total,
        record: `${r1?.wins ?? 0}-${r1?.losses ?? 0}`,
      })
    }
  }
  rivalries.sort((a, b) => b.totalGames - a.totalGames)

  // Scoring trend
  const scoringFormats = seasons.map((s: any) => s.scoringFormat).filter(Boolean)
  const scoringChanges: string[] = []
  for (let i = 1; i < scoringFormats.length; i++) {
    if (scoringFormats[i] !== scoringFormats[i - 1]) {
      scoringChanges.push(`${seasons[i].season}: ${scoringFormats[i - 1]} → ${scoringFormats[i]}`)
    }
  }

  return {
    leagueId,
    leagueName: league.name ?? 'League',
    sport: league.sport ?? 'NFL',
    totalSeasons: seasons.length,
    seasons: seasons.map((s: any) => ({
      season: s.season,
      champion: s.championTeamId,
      runnerUp: s.runnerUpName,
      teamCount: s.teamCount,
      scoringFormat: s.scoringFormat,
    })),
    managers: [...managerMap.values()],
    rivalries: rivalries.slice(0, 10),
    leagueTrends: {
      avgPointsPerSeason: managerMap.size > 0
        ? [...managerMap.values()].reduce((s, m) => s + m.totalPointsFor, 0) / Math.max(1, seasons.length)
        : 0,
      scoringChanges,
      dynastyOrRedraft: league.isDynasty ? 'dynasty' : 'redraft',
    },
  }
}

/**
 * Build a compact context string for AI prompts (token-efficient).
 */
export async function buildHistoricalContextForPrompt(leagueId: string): Promise<string> {
  try {
    const ctx = await buildLeagueHistoricalContext(leagueId)
    const lines: string[] = [
      `League: ${ctx.leagueName} (${ctx.sport}, ${ctx.totalSeasons} seasons, ${ctx.leagueTrends.dynastyOrRedraft})`,
    ]

    // Top managers
    const sorted = [...ctx.managers].sort((a, b) => b.championships - a.championships || b.winPct - a.winPct)
    lines.push(`\nManager Profiles (${ctx.managers.length} managers):`)
    for (const m of sorted.slice(0, 10)) {
      lines.push(`- ${m.managerName}: ${m.totalWins}-${m.totalLosses}-${m.totalTies} (${m.winPct}% win rate), ${m.championships} championships, ${m.playoffAppearances} playoff appearances`)
    }

    // Recent champions
    lines.push('\nRecent Champions:')
    for (const s of ctx.seasons.slice(0, 5)) {
      lines.push(`- ${s.season}: ${s.champion ?? 'Unknown'} (${s.teamCount} teams, ${s.scoringFormat ?? 'standard'})`)
    }

    // Top rivalries
    if (ctx.rivalries.length > 0) {
      lines.push('\nKey Rivalries:')
      for (const r of ctx.rivalries.slice(0, 5)) {
        lines.push(`- ${r.manager1} vs ${r.manager2}: ${r.totalGames} games (${r.record})`)
      }
    }

    // Scoring changes
    if (ctx.leagueTrends.scoringChanges.length > 0) {
      lines.push(`\nScoring Changes: ${ctx.leagueTrends.scoringChanges.join('; ')}`)
    }

    return lines.join('\n')
  } catch {
    return 'No historical data available for this league.'
  }
}

/**
 * Rebuild the league_manager_profiles table for a league after import.
 */
export async function rebuildManagerProfiles(leagueId: string): Promise<number> {
  const ctx = await buildLeagueHistoricalContext(leagueId)
  let count = 0

  for (const m of ctx.managers) {
    await (prisma as any).leagueManagerProfile?.upsert?.({
      where: { leagueId_managerId: { leagueId, managerId: m.managerId } },
      create: {
        leagueId,
        managerId: m.managerId,
        managerName: m.managerName,
        managerAvatar: m.managerAvatar,
        totalSeasons: m.totalSeasons,
        totalWins: m.totalWins,
        totalLosses: m.totalLosses,
        totalTies: m.totalTies,
        totalPointsFor: m.totalPointsFor,
        championships: m.championships,
        playoffAppearances: m.playoffAppearances,
        avgFinish: m.avgFinish,
        winPct: m.winPct,
        draftStyle: m.draftStyle,
        favoritePositions: m.favoritePositions,
        firstRoundHistory: m.firstRoundHistory,
        headToHeadRecords: m.headToHeadRecords,
        lastUpdatedAt: new Date(),
      },
      update: {
        managerName: m.managerName,
        managerAvatar: m.managerAvatar,
        totalSeasons: m.totalSeasons,
        totalWins: m.totalWins,
        totalLosses: m.totalLosses,
        totalTies: m.totalTies,
        totalPointsFor: m.totalPointsFor,
        championships: m.championships,
        playoffAppearances: m.playoffAppearances,
        avgFinish: m.avgFinish,
        winPct: m.winPct,
        draftStyle: m.draftStyle,
        favoritePositions: m.favoritePositions,
        firstRoundHistory: m.firstRoundHistory,
        headToHeadRecords: m.headToHeadRecords,
        lastUpdatedAt: new Date(),
      },
    }).catch(() => {})
    count++
  }

  return count
}

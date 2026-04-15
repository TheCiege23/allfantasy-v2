/**
 * Historical Context Builder
 *
 * Aggregates LeagueSeason + DraftFact + MatchupFact into per-manager profiles,
 * league trends, head-to-head matrix, and draft tendencies for AI prompts.
 */

import { prisma } from '@/lib/prisma'

export type ManagerProfile = {
  managerId: string
  managerName: string | null
  managerAvatar: string | null
  totalSeasons: number
  totalWins: number
  totalLosses: number
  totalTies: number
  totalPointsFor: number
  championships: number
  playoffAppearances: number
  avgFinish: number | null
  draftStyle: Record<string, unknown>
  tradeFrequency: number | null
  favoritePositions: string[]
}

export type HistoricalContext = {
  leagueId: string
  seasons: number[]
  managers: ManagerProfile[]
  leagueTrends: {
    seasons: number[]
    avgPointsBySeason: Record<number, number>
    scoringChange: number | null
  }
  headToHead: Record<string, Record<string, { wins: number; losses: number; pointsFor: number }>>
  draftTendencies: Record<string, { firstRoundPositions: string[]; positionCounts: Record<string, number> }>
  summaryText: string
}

type TeamRecordJson = {
  rosterId?: number | string
  ownerId?: string | null
  managerName?: string | null
  managerAvatar?: string | null
  wins?: number
  losses?: number
  ties?: number
  pointsFor?: number
  pointsAgainst?: number
  isChampion?: boolean
  isRunnerUp?: boolean
}

const EMPTY_CONTEXT = (leagueId: string): HistoricalContext => ({
  leagueId,
  seasons: [],
  managers: [],
  leagueTrends: { seasons: [], avgPointsBySeason: {}, scoringChange: null },
  headToHead: {},
  draftTendencies: {},
  summaryText: '',
})

function managerKey(r: TeamRecordJson): string {
  return String(r.ownerId ?? r.rosterId ?? r.managerName ?? 'unknown')
}

export async function buildHistoricalContext(
  leagueId: string,
  _opts?: { maxSeasons?: number },
): Promise<HistoricalContext> {
  try {
    const seasons = await prisma.leagueSeason.findMany({
      where: { leagueId },
      orderBy: { season: 'asc' },
      select: {
        season: true,
        teamRecords: true,
        championName: true,
        scoringFormat: true,
      },
    })

    if (!seasons.length) return EMPTY_CONTEXT(leagueId)

    const [draftFacts, matchupFacts] = await Promise.all([
      prisma.draftFact.findMany({
        where: { leagueId },
        select: { managerId: true, playerId: true, round: true, pickNumber: true, season: true },
      }),
      prisma.matchupFact.findMany({
        where: { leagueId },
        select: { teamA: true, teamB: true, scoreA: true, scoreB: true, winnerTeamId: true, season: true },
      }),
    ])

    const managersMap = new Map<string, ManagerProfile>()
    const finishAccumulator = new Map<string, number[]>()
    const avgPointsBySeason: Record<number, number> = {}
    const seasonYears: number[] = []

    for (const s of seasons) {
      seasonYears.push(s.season)
      const recs = (s.teamRecords as unknown as TeamRecordJson[] | null) ?? []
      if (!recs.length) continue

      const sorted = [...recs].sort((a, b) => (b.wins ?? 0) - (a.wins ?? 0) || (b.pointsFor ?? 0) - (a.pointsFor ?? 0))
      let totalPts = 0
      sorted.forEach((r, idx) => {
        const key = managerKey(r)
        const prof = managersMap.get(key) ?? {
          managerId: key,
          managerName: r.managerName ?? null,
          managerAvatar: r.managerAvatar ?? null,
          totalSeasons: 0,
          totalWins: 0,
          totalLosses: 0,
          totalTies: 0,
          totalPointsFor: 0,
          championships: 0,
          playoffAppearances: 0,
          avgFinish: null,
          draftStyle: {},
          tradeFrequency: null,
          favoritePositions: [],
        }
        prof.managerName = prof.managerName ?? r.managerName ?? null
        prof.managerAvatar = prof.managerAvatar ?? r.managerAvatar ?? null
        prof.totalSeasons += 1
        prof.totalWins += r.wins ?? 0
        prof.totalLosses += r.losses ?? 0
        prof.totalTies += r.ties ?? 0
        prof.totalPointsFor += r.pointsFor ?? 0
        if (r.isChampion) prof.championships += 1
        if (idx < Math.ceil(sorted.length / 2)) prof.playoffAppearances += 1
        managersMap.set(key, prof)
        const arr = finishAccumulator.get(key) ?? []
        arr.push(idx + 1)
        finishAccumulator.set(key, arr)
        totalPts += r.pointsFor ?? 0
      })
      if (recs.length > 0) avgPointsBySeason[s.season] = totalPts / recs.length
    }

    for (const [key, prof] of managersMap.entries()) {
      const finishes = finishAccumulator.get(key) ?? []
      if (finishes.length) prof.avgFinish = finishes.reduce((a, b) => a + b, 0) / finishes.length
    }

    // Draft tendencies
    const draftTendencies: Record<string, { firstRoundPositions: string[]; positionCounts: Record<string, number> }> = {}
    for (const pick of draftFacts) {
      if (!pick.managerId) continue
      const entry = draftTendencies[pick.managerId] ?? { firstRoundPositions: [], positionCounts: {} }
      // We lack player position without joining; store playerId as surrogate
      if (pick.round === 1) entry.firstRoundPositions.push(pick.playerId)
      entry.positionCounts[pick.playerId] = (entry.positionCounts[pick.playerId] ?? 0) + 1
      draftTendencies[pick.managerId] = entry
    }

    // Head-to-head
    const headToHead: Record<string, Record<string, { wins: number; losses: number; pointsFor: number }>> = {}
    for (const m of matchupFacts) {
      if (!m.teamA || !m.teamB) continue
      const aKey = m.teamA
      const bKey = m.teamB
      headToHead[aKey] = headToHead[aKey] ?? {}
      headToHead[bKey] = headToHead[bKey] ?? {}
      headToHead[aKey][bKey] = headToHead[aKey][bKey] ?? { wins: 0, losses: 0, pointsFor: 0 }
      headToHead[bKey][aKey] = headToHead[bKey][aKey] ?? { wins: 0, losses: 0, pointsFor: 0 }
      headToHead[aKey][bKey].pointsFor += m.scoreA ?? 0
      headToHead[bKey][aKey].pointsFor += m.scoreB ?? 0
      if (m.winnerTeamId === aKey) {
        headToHead[aKey][bKey].wins += 1
        headToHead[bKey][aKey].losses += 1
      } else if (m.winnerTeamId === bKey) {
        headToHead[bKey][aKey].wins += 1
        headToHead[aKey][bKey].losses += 1
      }
    }

    // Scoring change trend
    const sortedSeasonYears = [...seasonYears].sort((a, b) => a - b)
    let scoringChange: number | null = null
    if (sortedSeasonYears.length >= 2) {
      const firstYear = sortedSeasonYears[0]
      const lastYear = sortedSeasonYears[sortedSeasonYears.length - 1]
      const firstAvg = avgPointsBySeason[firstYear]
      const lastAvg = avgPointsBySeason[lastYear]
      if (firstAvg != null && lastAvg != null && firstAvg > 0) {
        scoringChange = (lastAvg - firstAvg) / firstAvg
      }
    }

    const managers = Array.from(managersMap.values())
    managers.sort((a, b) => b.championships - a.championships || b.totalWins - a.totalWins)

    const topLine = managers
      .slice(0, 6)
      .map((m) => `${m.managerName ?? m.managerId}: ${m.totalWins}-${m.totalLosses} (${m.championships} titles)`)
      .join('; ')
    const summaryText = `League has ${seasons.length} seasons of history. Top managers: ${topLine}.`

    return {
      leagueId,
      seasons: sortedSeasonYears,
      managers,
      leagueTrends: { seasons: sortedSeasonYears, avgPointsBySeason, scoringChange },
      headToHead,
      draftTendencies,
      summaryText,
    }
  } catch (err) {
    console.error('[historicalContextBuilder] buildHistoricalContext failed', err)
    return EMPTY_CONTEXT(leagueId)
  }
}

export async function rebuildManagerProfiles(leagueId: string): Promise<{ updated: number }> {
  try {
    const ctx = await buildHistoricalContext(leagueId)
    let updated = 0
    for (const m of ctx.managers) {
      try {
        await prisma.$executeRawUnsafe(
          `INSERT INTO league_manager_profiles (
             league_id, manager_id, manager_name, manager_avatar,
             total_seasons, total_wins, total_losses, total_ties,
             total_points_for, championships, playoff_appearances, avg_finish,
             draft_style, trade_frequency, favorite_positions, updated_at
           ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13::jsonb,$14,$15::jsonb, now())
           ON CONFLICT (league_id, manager_id) DO UPDATE SET
             manager_name = EXCLUDED.manager_name,
             manager_avatar = EXCLUDED.manager_avatar,
             total_seasons = EXCLUDED.total_seasons,
             total_wins = EXCLUDED.total_wins,
             total_losses = EXCLUDED.total_losses,
             total_ties = EXCLUDED.total_ties,
             total_points_for = EXCLUDED.total_points_for,
             championships = EXCLUDED.championships,
             playoff_appearances = EXCLUDED.playoff_appearances,
             avg_finish = EXCLUDED.avg_finish,
             draft_style = EXCLUDED.draft_style,
             trade_frequency = EXCLUDED.trade_frequency,
             favorite_positions = EXCLUDED.favorite_positions,
             updated_at = now()`,
          leagueId,
          m.managerId,
          m.managerName,
          m.managerAvatar,
          m.totalSeasons,
          m.totalWins,
          m.totalLosses,
          m.totalTies,
          m.totalPointsFor,
          m.championships,
          m.playoffAppearances,
          m.avgFinish,
          JSON.stringify(m.draftStyle ?? {}),
          m.tradeFrequency,
          JSON.stringify(m.favoritePositions ?? []),
        )
        updated += 1
      } catch (rowErr) {
        console.error('[historicalContextBuilder] upsert manager failed', rowErr)
      }
    }
    return { updated }
  } catch (err) {
    console.error('[historicalContextBuilder] rebuildManagerProfiles failed', err)
    return { updated: 0 }
  }
}

export async function getManagerProfile(
  leagueId: string,
  managerId: string,
): Promise<ManagerProfile | null> {
  try {
    const rows = await prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
      `SELECT manager_id, manager_name, manager_avatar, total_seasons, total_wins, total_losses,
              total_ties, total_points_for, championships, playoff_appearances, avg_finish,
              draft_style, trade_frequency, favorite_positions
         FROM league_manager_profiles
        WHERE league_id = $1 AND manager_id = $2
        LIMIT 1`,
      leagueId,
      managerId,
    )
    const row = rows?.[0]
    if (!row) return null
    return {
      managerId: String(row.manager_id),
      managerName: (row.manager_name as string | null) ?? null,
      managerAvatar: (row.manager_avatar as string | null) ?? null,
      totalSeasons: Number(row.total_seasons ?? 0),
      totalWins: Number(row.total_wins ?? 0),
      totalLosses: Number(row.total_losses ?? 0),
      totalTies: Number(row.total_ties ?? 0),
      totalPointsFor: Number(row.total_points_for ?? 0),
      championships: Number(row.championships ?? 0),
      playoffAppearances: Number(row.playoff_appearances ?? 0),
      avgFinish: row.avg_finish != null ? Number(row.avg_finish) : null,
      draftStyle: (row.draft_style as Record<string, unknown>) ?? {},
      tradeFrequency: row.trade_frequency != null ? Number(row.trade_frequency) : null,
      favoritePositions: Array.isArray(row.favorite_positions) ? (row.favorite_positions as string[]) : [],
    }
  } catch (err) {
    console.error('[historicalContextBuilder] getManagerProfile failed', err)
    return null
  }
}

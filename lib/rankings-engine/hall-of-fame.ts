import { prisma } from "@/lib/prisma"
import { getMergedHistoricalSeasonResultsForLeague } from "@/lib/season-results/HistoricalSeasonResultService"

function clamp01(x: number) {
  if (!Number.isFinite(x)) return 0
  return Math.max(0, Math.min(1, x))
}

export async function upsertSeasonResults(args: {
  leagueId: string
  season: string
  rows: Array<{
    rosterId: string
    wins?: number | null
    losses?: number | null
    pointsFor?: number | null
    pointsAgainst?: number | null
    champion?: boolean
  }>
}) {
  await prisma.$transaction(
    args.rows.map((r) =>
      prisma.seasonResult.upsert({
        where: {
          uniq_season_result_league_season_roster: {
            leagueId: args.leagueId,
            season: args.season,
            rosterId: r.rosterId
          }
        },
        update: {
          wins: r.wins ?? null,
          losses: r.losses ?? null,
          pointsFor: r.pointsFor ?? null,
          pointsAgainst: r.pointsAgainst ?? null,
          champion: !!r.champion
        },
        create: {
          leagueId: args.leagueId,
          season: args.season,
          rosterId: r.rosterId,
          wins: r.wins ?? null,
          losses: r.losses ?? null,
          pointsFor: r.pointsFor ?? null,
          pointsAgainst: r.pointsAgainst ?? null,
          champion: !!r.champion
        }
      })
    )
  )
}

export async function rebuildHallOfFame(args: { leagueId: string }) {
  const seasons = await getMergedHistoricalSeasonResultsForLeague({
    leagueId: args.leagueId,
  })

  if (seasons.length === 0) {
    await prisma.hallOfFameRow.deleteMany({
      where: { leagueId: args.leagueId },
    })
    return { ok: true, count: 0 }
  }

  const bySeason: Record<string, typeof seasons> = {}
  for (const row of seasons) {
    bySeason[row.season] = bySeason[row.season] ?? []
    bySeason[row.season].push(row)
  }

  const dominanceByRoster: Record<string, number[]> = {}
  const champCount: Record<string, number> = {}
  const seasonsPlayed: Record<string, number> = {}
  const efficiencyByRoster: Record<string, number[]> = {}

  for (const season of Object.keys(bySeason)) {
    const rows = bySeason[season]

    const sorted = [...rows].sort((a, b) => {
      if ((a.champion ?? false) !== (b.champion ?? false)) {
        return a.champion ? -1 : 1
      }
      if ((a.madePlayoffs ?? false) !== (b.madePlayoffs ?? false)) {
        return a.madePlayoffs ? -1 : 1
      }
      const af = a.bestFinish ?? 999
      const bf = b.bestFinish ?? 999
      if (af !== bf) return af - bf
      const aw = a.wins ?? -999
      const bw = b.wins ?? -999
      if (bw !== aw) return bw - aw
      const ap = Number(a.pointsFor ?? 0)
      const bp = Number(b.pointsFor ?? 0)
      return bp - ap
    })

    const n = sorted.length || 1
    sorted.forEach((r, idx) => {
      const rosterId = r.rosterId
      const baseFinishScore = 1 - idx / Math.max(1, n - 1)
      const playoffBonus = r.champion ? 0.2 : r.bestFinish === 2 ? 0.12 : r.madePlayoffs ? 0.05 : 0
      const finishScore = clamp01(baseFinishScore + playoffBonus)
      dominanceByRoster[rosterId] = dominanceByRoster[rosterId] ?? []
      dominanceByRoster[rosterId].push(finishScore)

      champCount[rosterId] = (champCount[rosterId] ?? 0) + (r.champion ? 1 : 0)
      seasonsPlayed[rosterId] = (seasonsPlayed[rosterId] ?? 0) + 1
      const totalGames = (r.wins ?? 0) + (r.losses ?? 0)
      const winPct = totalGames > 0 ? (r.wins ?? 0) / totalGames : 0
      efficiencyByRoster[rosterId] = efficiencyByRoster[rosterId] ?? []
      efficiencyByRoster[rosterId].push(winPct)
    })
  }

  const rosterIds = Object.keys(seasonsPlayed)
  const hofRows = rosterIds.map((rosterId) => {
    const champs = champCount[rosterId] ?? 0
    const played = seasonsPlayed[rosterId] ?? 0

    const domArr = dominanceByRoster[rosterId] ?? []
    const dominance = domArr.length ? domArr.reduce((a, b) => a + b, 0) / domArr.length : 0

    const efficiencyArr = efficiencyByRoster[rosterId] ?? []
    const efficiency = efficiencyArr.length
      ? efficiencyArr.reduce((a, b) => a + b, 0) / efficiencyArr.length
      : 0

    const longevity = clamp01(played / Math.max(1, Object.keys(bySeason).length))

    const score =
      0.48 * clamp01(champs / Math.max(1, Math.max(...Object.values(champCount)))) +
      0.28 * dominance +
      0.14 * longevity +
      0.10 * efficiency

    return {
      rosterId,
      championships: champs,
      seasonsPlayed: played,
      dominance,
      efficiency,
      longevity,
      score
    }
  })

  await prisma.$transaction(async (tx) => {
    await tx.hallOfFameRow.deleteMany({
      where: { leagueId: args.leagueId },
    })

    if (hofRows.length === 0) {
      return
    }

    await tx.hallOfFameRow.createMany({
      data: hofRows.map((r) => ({
        leagueId: args.leagueId,
        rosterId: r.rosterId,
        championships: r.championships,
        seasonsPlayed: r.seasonsPlayed,
        dominance: r.dominance,
        efficiency: r.efficiency,
        longevity: r.longevity,
        score: r.score,
      })),
    })
  })

  return { ok: true, count: hofRows.length }
}

export async function getHallOfFame(args: { leagueId: string }) {
  return prisma.hallOfFameRow.findMany({
    where: { leagueId: args.leagueId },
    orderBy: [{ score: "desc" }, { championships: "desc" }]
  })
}

export async function getSeasonLeaderboard(args: { leagueId: string; season: string }) {
  const rows = await getMergedHistoricalSeasonResultsForLeague({
    leagueId: args.leagueId,
    season: args.season,
  })

  return rows.sort((a, b) => {
    if (a.champion !== b.champion) {
      return a.champion ? -1 : 1
    }
    if (a.madePlayoffs !== b.madePlayoffs) {
      return a.madePlayoffs ? -1 : 1
    }
    if ((a.bestFinish ?? 999) !== (b.bestFinish ?? 999)) {
      return (a.bestFinish ?? 999) - (b.bestFinish ?? 999)
    }
    if (a.wins !== b.wins) {
      return b.wins - a.wins
    }

    return b.pointsFor - a.pointsFor
  })
}

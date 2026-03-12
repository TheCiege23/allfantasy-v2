import { prisma } from "@/lib/prisma"

export type LeaderboardRowInput = {
  tournamentId: string
  leagueId: string | null
  entryId: string
  score: number
}

export type LeaderboardRowRanked = LeaderboardRowInput & {
  rank: number
  tieGroup: number
  previousRank: number | null
}

export function assignRanks(
  rows: LeaderboardRowInput[],
  previousByEntry: Map<string, number> = new Map(),
): LeaderboardRowRanked[] {
  const sorted = [...rows].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    return a.entryId.localeCompare(b.entryId)
  })

  let currentRank = 0
  let currentTie = 0
  let lastScore: number | null = null

  return sorted.map((row, idx) => {
    if (idx === 0) {
      currentRank = 1
      currentTie = 1
      lastScore = row.score
    } else if (row.score !== lastScore) {
      currentRank = idx + 1
      currentTie += 1
      lastScore = row.score
    }
    const key = `${row.tournamentId}:${row.leagueId ?? "global"}:${row.entryId}`
    const previousRank = previousByEntry.get(key) ?? null
    return {
      ...row,
      rank: currentRank,
      tieGroup: currentTie,
      previousRank,
    }
  })
}

export async function rebuildLeaderboardForScope(args: {
  tournamentId: string
  leagueId?: string | null
}) {
  const { tournamentId } = args
  const leagueId = args.leagueId ?? null

  const whereEntry: any = {
    league: { tournamentId },
    status: { notIn: ["DRAFT", "INVALIDATED"] },
  }
  if (leagueId) {
    whereEntry.leagueId = leagueId
  }

  const entries = await prisma.bracketEntry.findMany({
    where: whereEntry,
    select: {
      id: true,
      leagueId: true,
      picks: { select: { points: true } },
    },
  })

  if (!entries.length) {
    return { updated: 0 }
  }

  const scores: LeaderboardRowInput[] = entries.map((e) => ({
    tournamentId,
    leagueId: leagueId ?? e.leagueId,
    entryId: e.id,
    score: e.picks.reduce((sum, p) => sum + (p.points ?? 0), 0),
  }))

  const existing = await prisma.bracketLeaderboard.findMany({
    where: {
      tournamentId,
      leagueId,
    },
    select: { entryId: true, rank: true },
  })
  const previousByEntry = new Map<string, number>()
  for (const row of existing) {
    const key = `${tournamentId}:${leagueId ?? "global"}:${row.entryId}`
    previousByEntry.set(key, row.rank)
  }

  const ranked = assignRanks(scores, previousByEntry)

  const ops = ranked.map((row) =>
    prisma.bracketLeaderboard.upsert({
      where: {
        tournamentId_leagueId_entryId: {
          tournamentId: row.tournamentId,
          // leagueId can be null for global scope; cast to satisfy TS while
          // preserving the underlying Prisma type from the schema.
          leagueId: row.leagueId as any,
          entryId: row.entryId,
        },
      },
      update: {
        score: row.score,
        rank: row.rank,
        previousRank: row.previousRank,
        tieGroup: row.tieGroup,
      },
      create: {
        tournamentId: row.tournamentId,
        leagueId: row.leagueId as any,
        entryId: row.entryId,
        score: row.score,
        rank: row.rank,
        previousRank: row.previousRank,
        tieGroup: row.tieGroup,
      },
    }),
  )

  await prisma.$transaction(ops)
  return { updated: ranked.length }
}


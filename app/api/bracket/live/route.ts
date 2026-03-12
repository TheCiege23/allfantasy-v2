import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import {
  scoreEntry,
  type ScoringMode,
  type PickResult,
  type LeaguePickDistribution,
  type BonusFlags,
} from "@/lib/brackets/scoring"

export const dynamic = "force-dynamic"

function normalizeRoundPoints(input: unknown): Record<number, number> | undefined {
  if (!input || typeof input !== "object") return undefined
  const out: Record<number, number> = {}
  for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
    const round = Number(k)
    const value = Number(v)
    if (Number.isFinite(round) && Number.isFinite(value) && round >= 1 && round <= 6) {
      out[round] = Math.max(0, value)
    }
  }
  return Object.keys(out).length ? out : undefined
}

function getNodeWinner(node: any, game: any): string | null {
  if (!game || game.homeScore == null || game.awayScore == null) return null
  const status = String(game.status || "").toLowerCase()
  const isFinal = ["final", "completed", "closed", "finished"].some((k) => status.includes(k))
  if (!isFinal || game.homeScore === game.awayScore) return null
  return game.homeScore > game.awayScore ? node.homeTeamName : node.awayTeamName
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const tournamentId = searchParams.get("tournamentId")
    const leagueId = searchParams.get("leagueId")

    if (!tournamentId) {
      return NextResponse.json({ error: "tournamentId is required" }, { status: 400 })
    }

    const tournament = await prisma.bracketTournament.findUnique({ where: { id: tournamentId } })
    if (!tournament) {
      return NextResponse.json({ error: "Tournament not found" }, { status: 404 })
    }

    const nodes = await prisma.bracketNode.findMany({
      where: { tournamentId },
      orderBy: [{ round: "asc" }, { slot: "asc" }],
    })

    const linkedGameIds = nodes.map((n) => n.sportsGameId).filter((id): id is string => id !== null)
    const games = linkedGameIds.length > 0
      ? await prisma.sportsGame.findMany({
          where: { id: { in: linkedGameIds } },
          select: {
            id: true,
            homeTeam: true,
            awayTeam: true,
            homeScore: true,
            awayScore: true,
            status: true,
            startTime: true,
            venue: true,
            fetchedAt: true,
          },
        })
      : []

    const gameMap = new Map(games.map((g) => [g.id, g]))

    const bracketNodes = nodes.map((node) => {
      const game = node.sportsGameId ? gameMap.get(node.sportsGameId) : null
      return {
        id: node.id,
        slot: node.slot,
        round: node.round,
        region: node.region,
        seedHome: node.seedHome,
        seedAway: node.seedAway,
        homeTeamName: node.homeTeamName,
        awayTeamName: node.awayTeamName,
        nextNodeId: node.nextNodeId,
        nextNodeSide: node.nextNodeSide,
        liveGame: game
          ? {
              homeScore: game.homeScore,
              awayScore: game.awayScore,
              status: game.status,
              startTime: game.startTime,
              venue: game.venue,
              fetchedAt: game.fetchedAt,
            }
          : null,
        winner: getNodeWinner(node, game),
      }
    })

    let standings = null
    let scoringMode: ScoringMode = "momentum"

    if (leagueId) {
      const league = await prisma.bracketLeague.findUnique({
        where: { id: leagueId },
        select: { scoringRules: true },
      })

      const rules = (league?.scoringRules || {}) as any
      scoringMode = (rules.scoringMode || rules.mode || "momentum") as ScoringMode
      const roundPointsOverride = normalizeRoundPoints(rules.roundPoints)
      const bonusFlags: BonusFlags = {
        upsetDeltaEnabled: rules.upsetDeltaEnabled !== false,
        leverageBonusEnabled: rules.leverageBonusEnabled !== false,
        insuranceEnabled: rules.insuranceEnabled === true,
      }

      const entries = await prisma.bracketEntry.findMany({
        where: {
          leagueId,
          status: { notIn: ["DRAFT", "INVALIDATED"] },
        },
        include: {
          user: { select: { id: true, displayName: true, avatarUrl: true } },
          picks: true,
        },
        orderBy: { createdAt: "asc" },
      }) as Array<any>

      const nodeRoundMap = new Map<string, number>()
      for (const n of nodes) nodeRoundMap.set(n.id, n.round)

      const defaultRoundPoints = scoringMode === "fancred_edge"
        ? ({ 1: 1, 2: 2, 3: 5, 4: 10, 5: 18, 6: 30 } as Record<number, number>)
        : ({ 1: 1, 2: 2, 3: 4, 4: 8, 5: 16, 6: 32 } as Record<number, number>)
      const maxPossibleRoundPoints = roundPointsOverride || defaultRoundPoints

      const seedMapLocal = new Map<string, number>()
      for (const n of nodes) {
        if (n.round === 1) {
          if (n.homeTeamName && n.seedHome != null) seedMapLocal.set(n.homeTeamName, n.seedHome)
          if (n.awayTeamName && n.seedAway != null) seedMapLocal.set(n.awayTeamName, n.seedAway)
        }
      }

      const leagueDistribution: LeaguePickDistribution = {}
      if (scoringMode === "accuracy_boldness" || scoringMode === "fancred_edge") {
        for (const entry of entries) {
          for (const pick of entry.picks) {
            if (!pick.pickedTeamName) continue
            if (!leagueDistribution[pick.nodeId]) leagueDistribution[pick.nodeId] = {}
            leagueDistribution[pick.nodeId][pick.pickedTeamName] =
              (leagueDistribution[pick.nodeId][pick.pickedTeamName] || 0) + 1
          }
        }
      }

      const championshipNode = nodes.find((n) => n.round === 6)
      const championshipGame = championshipNode?.sportsGameId ? gameMap.get(championshipNode.sportsGameId) : null
      const actualChampionshipTotalPoints =
        championshipGame?.homeScore != null && championshipGame?.awayScore != null
          ? championshipGame.homeScore + championshipGame.awayScore
          : null
      const tiebreakerEnabled = Boolean(rules.tiebreakerEnabled)

      standings = entries.map((entry) => {
        let correctPicks = 0
        let totalPicks = 0
        const roundCorrect: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 }
        let championPick: string | null = null
        let maxPossible = 0

        const pickResults: PickResult[] = entry.picks.map((pick: any) => {
          const round = nodeRoundMap.get(pick.nodeId) ?? 0
          if (pick.isCorrect === true) {
            correctPicks++
            if (round >= 1 && round <= 6) roundCorrect[round]++
          }
          if (pick.isCorrect !== null) totalPicks++
          if (pick.isCorrect !== false && round >= 1 && round <= 6) {
            maxPossible += maxPossibleRoundPoints[round] ?? 0
          }
          if (round === 6 && pick.pickedTeamName) {
            championPick = pick.pickedTeamName
          }

          const node = nodes.find((n) => n.id === pick.nodeId)
          const gameForNode = node?.sportsGameId ? gameMap.get(node.sportsGameId) : null
          let actualWinnerSeed: number | null = null
          let opponentSeed: number | null = null
          if (gameForNode && gameForNode.homeScore != null && gameForNode.awayScore != null) {
            const winner = gameForNode.homeScore > gameForNode.awayScore ? node?.homeTeamName : node?.awayTeamName
            const loser = gameForNode.homeScore > gameForNode.awayScore ? node?.awayTeamName : node?.homeTeamName
            actualWinnerSeed = winner ? (seedMapLocal.get(winner) ?? null) : null
            opponentSeed = loser ? (seedMapLocal.get(loser) ?? null) : null
          } else if (node && pick.pickedTeamName) {
            const opponent = pick.pickedTeamName === node.homeTeamName ? node.awayTeamName : node.homeTeamName
            opponentSeed = opponent ? (seedMapLocal.get(opponent) ?? null) : null
          }

          return {
            nodeId: pick.nodeId,
            round,
            pickedTeamName: pick.pickedTeamName,
            isCorrect: pick.isCorrect,
            pickedSeed: pick.pickedTeamName ? (seedMapLocal.get(pick.pickedTeamName) ?? null) : null,
            actualWinnerSeed,
            opponentSeed,
          }
        })

        const { total: totalPoints, details } = scoreEntry(
          scoringMode,
          pickResults,
          leagueDistribution,
          bonusFlags.insuranceEnabled ? (entry.insuredNodeId || null) : null,
          bonusFlags,
          roundPointsOverride
        )

        const roundPoints: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 }
        if (details?.breakdown) {
          for (const b of details.breakdown) {
            const r = nodeRoundMap.get(b.nodeId) ?? 0
            if (r >= 1 && r <= 6) roundPoints[r] += b.total
          }
        }

        const tiebreakerPoints = entry.tiebreakerPoints ?? null
        const tiebreakerDelta =
          tiebreakerEnabled && actualChampionshipTotalPoints != null && tiebreakerPoints != null
            ? Math.abs(tiebreakerPoints - actualChampionshipTotalPoints)
            : null

        return {
          entryId: entry.id,
          entryName: entry.name,
          userId: entry.userId,
          displayName: entry.user.displayName,
          avatarUrl: entry.user.avatarUrl,
          totalPoints,
          correctPicks,
          totalPicks,
          roundCorrect,
          roundPoints,
          championPick,
          maxPossible,
          insuredNodeId: entry.insuredNodeId || null,
          scoringDetails: details,
          tiebreakerPoints,
          tiebreakerDelta,
        }
      })

      standings.sort((a, b) => {
        if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints
        if (a.tiebreakerDelta != null && b.tiebreakerDelta != null) {
          if (a.tiebreakerDelta !== b.tiebreakerDelta) return a.tiebreakerDelta - b.tiebreakerDelta
        } else if (a.tiebreakerDelta != null) {
          return -1
        } else if (b.tiebreakerDelta != null) {
          return 1
        }
        return b.correctPicks - a.correctPicks
      })
    }

    const seedMap = new Map<string, number>()
    for (const node of nodes) {
      if (node.round === 1) {
        if (node.homeTeamName && node.seedHome != null) seedMap.set(node.homeTeamName, node.seedHome)
        if (node.awayTeamName && node.seedAway != null) seedMap.set(node.awayTeamName, node.seedAway)
      }
    }

    const SEED_EXPECTED_WINS: Record<number, number> = {
      1: 4, 2: 3, 3: 2, 4: 2, 5: 1, 6: 1, 7: 1, 8: 1,
      9: 0, 10: 0, 11: 0, 12: 0, 13: 0, 14: 0, 15: 0, 16: 0,
    }

    const teamWins = new Map<string, number>()
    for (const bn of bracketNodes) {
      if (bn.winner) {
        teamWins.set(bn.winner, (teamWins.get(bn.winner) ?? 0) + 1)
      }
    }

    const sleeperTeams: string[] = []
    for (const [team, wins] of teamWins.entries()) {
      const seed = seedMap.get(team)
      if (seed == null) continue
      const baseline = SEED_EXPECTED_WINS[seed] ?? 0
      if (wins > baseline) sleeperTeams.push(team)
    }

    const hasLiveGames = bracketNodes.some((n) => n.liveGame?.status === "in_progress")

    const gamesFlat = games.map((g) => ({
      id: g.id,
      homeTeam: g.homeTeam,
      awayTeam: g.awayTeam,
      homeScore: g.homeScore,
      awayScore: g.awayScore,
      status: g.status,
      startTime: g.startTime ? g.startTime.toISOString() : null,
    }))

    return NextResponse.json(
      {
        ok: true,
        tournamentId: tournament.id,
        tournament: {
          id: tournament.id,
          name: tournament.name,
          season: tournament.season,
          sport: tournament.sport,
        },
        games: gamesFlat,
        nodes: bracketNodes,
        standings,
        sleeperTeams,
        hasLiveGames,
        pollIntervalMs: hasLiveGames ? 10000 : 60000,
      },
      {
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
        },
      }
    )
  } catch (err: any) {
    console.error("[BracketLive] Error:", err)
    return NextResponse.json(
      { error: err.message || "Failed to fetch bracket data" },
      { status: 500 }
    )
  }
}

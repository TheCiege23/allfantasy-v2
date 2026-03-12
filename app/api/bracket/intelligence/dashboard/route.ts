import { NextResponse } from "next/server"
import { requireVerifiedUser } from "@/lib/auth-guard"
import { prisma } from "@/lib/prisma"
import { computeHealthScore, computeBracketUniqueness, computePickDistribution, combineHealthComponents } from "@/lib/brackets/intelligence/data-engine"

export const runtime = "nodejs"

export async function POST(req: Request) {
  const auth = await requireVerifiedUser()
  if (!auth.ok) return auth.response

  const body = await req.json().catch(() => ({}))
  const entryId = String(body.entryId || "")

  if (!entryId) {
    return NextResponse.json({ error: "Missing entryId" }, { status: 400 })
  }

  const entry = await prisma.bracketEntry.findUnique({
    where: { id: entryId },
    include: {
      picks: {
        select: { nodeId: true, pickedTeamName: true, points: true, isCorrect: true },
      },
      league: {
        select: {
          id: true,
          tournamentId: true,
        },
      },
    },
  })

  if (!entry || entry.userId !== auth.userId) {
    return NextResponse.json({ error: "Entry not found or forbidden" }, { status: 403 })
  }

  const tournamentId = entry.league.tournamentId
  const health = await computeHealthScore(entryId, tournamentId)

  const totalPicks = entry.picks.length
  const correctPicks = entry.picks.filter((p) => p.isCorrect === true).length

  const remainingPoints = Math.max(0, health.maxPossiblePoints - health.currentPoints)

  const validPicks = entry.picks.filter((p) => p.pickedTeamName != null) as Array<{
    nodeId: string
    pickedTeamName: string
  }>
  const distributions = await computePickDistribution(tournamentId)
  const uniqueness = computeBracketUniqueness(validPicks, distributions)

  const simSnapshot = await prisma.bracketSimulationSnapshot.findUnique({
    where: {
      tournamentId_leagueId_entryId: {
        tournamentId,
        leagueId: entry.league.id,
        entryId,
      },
    },
    select: { winLeagueProbability: true },
  })

  const ffRatio =
    health.finalFourTotal > 0 ? health.finalFourAlive / health.finalFourTotal : 0

  const combined = combineHealthComponents({
    health,
    remainingPoints,
    championAlive: health.championAlive,
    finalFourAliveRatio: ffRatio,
    uniquenessScore: uniqueness.score,
    winLeagueProbability: simSnapshot?.winLeagueProbability ?? 0,
  })

  // Best / worst finish (simple bounds based on pool size)
  const bestPossibleFinish = 1
  const worstPossibleFinish = health.totalEntries || 1

  const likelyLow = Math.max(1, Math.floor((health.currentRank + (health.totalEntries || 1)) / 2 - 1))
  const likelyHigh = Math.min(
    health.totalEntries || 1,
    Math.ceil((health.currentRank + (health.totalEntries || 1)) / 2 + 1),
  )

  return NextResponse.json({
    ok: true,
    entryId,
    leagueId: entry.league.id,
    tournamentId,
    summary: {
      currentRank: health.currentRank,
      totalEntries: health.totalEntries,
      totalPoints: health.currentPoints,
      correctPicks,
      totalPicks,
      remainingPoints,
    },
    health: {
      alivePct: health.alivePct,
      teamsAlive: health.teamsAlive,
      teamsTotal: health.teamsTotal,
      maxPossiblePoints: health.maxPossiblePoints,
      currentPoints: health.currentPoints,
      healthScore: combined.score,
      statusLabel: combined.statusLabel,
      upside: health.upside,
      riskExposure: health.riskExposure,
      championAlive: health.championAlive,
      finalFourAlive: health.finalFourAlive,
      finalFourTotal: health.finalFourTotal,
    },
    outcomes: {
      bestPossibleFinish,
      worstPossibleFinish,
      likelyFinishLow: likelyLow,
      likelyFinishHigh: likelyHigh,
    },
    uniqueness: {
      score: uniqueness.score,
      percentile: uniqueness.percentile,
    },
    note:
      "Bracket Intelligence summarizes health, remaining potential, and uniqueness using current scoring and pool context. It highlights probabilities and ranges; it does not guarantee outcomes.",
  })
}


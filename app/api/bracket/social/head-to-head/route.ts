import { NextResponse } from "next/server"
import { requireVerifiedUser } from "@/lib/auth-guard"
import { prisma } from "@/lib/prisma"
import { computeHealthScore } from "@/lib/brackets/intelligence/data-engine"

export const runtime = "nodejs"

export async function POST(req: Request) {
  const auth = await requireVerifiedUser()
  if (!auth.ok) return auth.response

  const body = await req.json().catch(() => ({}))
  const leagueId = String(body.leagueId || "")
  const entryAId = String(body.entryAId || "")
  const entryBId = String(body.entryBId || "")

  if (!leagueId || !entryAId || !entryBId) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 })
  }

  const [entryA, entryB] = await Promise.all([
    prisma.bracketEntry.findUnique({
      where: { id: entryAId },
      include: { league: { select: { tournamentId: true } }, picks: true },
    }),
    prisma.bracketEntry.findUnique({
      where: { id: entryBId },
      include: { league: { select: { tournamentId: true } }, picks: true },
    }),
  ])

  if (!entryA || !entryB) {
    return NextResponse.json({ error: "Entries not found" }, { status: 404 })
  }
  if (entryA.leagueId !== leagueId || entryB.leagueId !== leagueId) {
    return NextResponse.json({ error: "Entries must be in same league" }, { status: 400 })
  }
  if (entryA.userId !== auth.userId && entryB.userId !== auth.userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const tournamentId = entryA.league.tournamentId
  const [healthA, healthB] = await Promise.all([
    computeHealthScore(entryAId, tournamentId),
    computeHealthScore(entryBId, tournamentId),
  ])

  const correctA = entryA.picks.filter((p) => p.isCorrect === true).length
  const correctB = entryB.picks.filter((p) => p.isCorrect === true).length

  const remainingA = Math.max(0, healthA.maxPossiblePoints - healthA.currentPoints)
  const remainingB = Math.max(0, healthB.maxPossiblePoints - healthB.currentPoints)

  return NextResponse.json({
    ok: true,
    leagueId,
    entryA: {
      entryId: entryAId,
      name: entryA.name,
      totalPoints: healthA.currentPoints,
      correctPicks: correctA,
      remainingPoints: remainingA,
      currentRank: healthA.currentRank,
    },
    entryB: {
      entryId: entryBId,
      name: entryB.name,
      totalPoints: healthB.currentPoints,
      correctPicks: correctB,
      remainingPoints: remainingB,
      currentRank: healthB.currentRank,
    },
  })
}


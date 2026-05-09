import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import {
  assertWorldCupSimulationAccess,
  requireWorldCupApiUser,
} from "@/app/api/brackets/world-cup/_utils"
import { verifyWorldCupDevQaRequest } from "@/lib/world-cup/worldCupDevQaAccess"
import { simulateWorldCupMatchResult } from "@/lib/world-cup/worldCupSimulationService"

export const runtime = "nodejs"

const bodySchema = z.object({
  challengeId: z.string().min(1),
  /** Defaults to the challenge's `final` round match. */
  matchId: z.string().min(1).optional(),
  winnerTeamId: z.string().min(1).nullable().optional(),
  homeScore: z.number().int().min(0).max(20).optional(),
  awayScore: z.number().int().min(0).max(20).optional(),
  dryRun: z.boolean().optional().default(false),
  confirmSimulation: z.literal(true),
})

export async function POST(request: Request) {
  if (!verifyWorldCupDevQaRequest(request)) {
    return NextResponse.json({ error: "World Cup QA helpers are disabled" }, { status: 404 })
  }

  const auth = await requireWorldCupApiUser(request)
  if (!auth.ok) return auth.response

  const body = await request.json().catch(() => ({}))
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", issues: parsed.error.flatten() }, { status: 400 })
  }

  const access = await assertWorldCupSimulationAccess({
    request,
    challengeId: parsed.data.challengeId,
    user: auth.user,
    confirmSimulation: parsed.data.confirmSimulation,
  })
  if (!access.ok) return access.response

  const matchId =
    parsed.data.matchId ??
    (
      await prisma.worldCupBracketMatch.findFirst({
        where: { challengeId: parsed.data.challengeId, round: "final" },
        select: { id: true, homeTeamId: true, awayTeamId: true },
      })
    )?.id

  if (!matchId) {
    return NextResponse.json({ error: "No final match found for this challenge" }, { status: 404 })
  }

  const matchRow = await prisma.worldCupBracketMatch.findUnique({
    where: { id: matchId },
    select: { homeTeamId: true, awayTeamId: true, challengeId: true },
  })

  if (!matchRow || matchRow.challengeId !== parsed.data.challengeId) {
    return NextResponse.json({ error: "Match not part of this challenge" }, { status: 400 })
  }

  if (!matchRow.homeTeamId || !matchRow.awayTeamId) {
    return NextResponse.json(
      {
        error:
          "Final match does not have both teams yet — advance earlier rounds (picks or simulation) before finishing the final.",
      },
      { status: 422 }
    )
  }

  const homeScore = parsed.data.homeScore ?? 2
  const awayScore = parsed.data.awayScore ?? 1

  const winnerTeamId =
    parsed.data.winnerTeamId ??
    (homeScore === awayScore
      ? matchRow.homeTeamId
      : homeScore > awayScore
        ? matchRow.homeTeamId
        : matchRow.awayTeamId)

  try {
    const result = await simulateWorldCupMatchResult({
      challengeId: parsed.data.challengeId,
      matchId,
      winnerTeamId,
      homeScore,
      awayScore,
      dryRun: parsed.data.dryRun,
      status: "final",
    })

    return NextResponse.json({ ok: true, matchId, result })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Simulation failed"
    return NextResponse.json({ error: message }, { status: 400 })
  }
}

import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { userHasBracketBrainAi } from "@/lib/bracket-brain/bracketBrainAccess"
import { prisma } from "@/lib/prisma"
import { buildWorldCupMatchupIntelligence } from "@/lib/world-cup/worldCupAIService"
import type { WorldCupAiStrategy, WorldCupMatchView } from "@/lib/world-cup/types"
import { requireWorldCupApiUser } from "../../../../../_utils"

const bodySchema = z.object({
  matchId: z.string().min(1),
  strategy: z.enum(["safe", "balanced", "upset", "chaos"]).optional().default("balanced"),
  intent: z.enum(["panel", "ask_ai", "explain"]).optional().default("panel"),
})

export async function POST(
  req: NextRequest,
  { params }: { params: { challengeId: string; entryId: string } }
) {
  const userResult = await requireWorldCupApiUser()
  if (!userResult.ok) return userResult.response

  const { challengeId, entryId } = params

  let body: z.infer<typeof bodySchema>
  try {
    body = bodySchema.parse(await req.json())
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }

  const { matchId, strategy, intent } = body

  const hasBracketBrainAi = await userHasBracketBrainAi(
    userResult.user.id,
    userResult.user.email ?? null
  )
  if ((intent === "ask_ai" || intent === "explain") && !hasBracketBrainAi) {
    return NextResponse.json({ error: "Bracket Brain requires AF Pro." }, { status: 403 })
  }

  const challenge = await (prisma as any).worldCupBracketChallenge.findUnique({
    where: { id: challengeId },
    select: {
      id: true,
      ownerUserId: true,
      visibility: true,
      participants: {
        where: { userId: userResult.user.id },
        select: { id: true },
        take: 1,
      },
    },
  })

  if (!challenge) {
    return NextResponse.json({ error: "Challenge not found" }, { status: 404 })
  }

  const isOwner = challenge.ownerUserId === userResult.user.id
  const isParticipant = challenge.participants.length > 0
  const isPublic = challenge.visibility === "public"
  if (!isOwner && !isParticipant && !isPublic) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const entry = await (prisma as any).worldCupBracketEntry.findFirst({
    where: { id: entryId, challengeId, userId: userResult.user.id },
    select: { id: true },
  })
  if (!entry) {
    return NextResponse.json({ error: "Entry not found" }, { status: 404 })
  }

  const dbMatch = await (prisma as any).worldCupBracketMatch.findFirst({
    where: { id: matchId, challengeId },
  })

  if (!dbMatch) {
    return NextResponse.json({ error: "Match not found" }, { status: 404 })
  }

  const match: WorldCupMatchView = {
    id: dbMatch.id,
    apiFixtureId: dbMatch.apiFixtureId ?? null,
    round: dbMatch.round,
    roundIndex: dbMatch.roundIndex,
    matchNumber: dbMatch.matchNumber,
    homeSlotKey: dbMatch.homeSlotKey,
    awaySlotKey: dbMatch.awaySlotKey,
    homeTeamId: dbMatch.homeTeamId ?? null,
    awayTeamId: dbMatch.awayTeamId ?? null,
    homeTeamName: dbMatch.homeTeamName ?? "",
    awayTeamName: dbMatch.awayTeamName ?? "",
    homeTeamLogo: dbMatch.homeTeamLogo ?? null,
    awayTeamLogo: dbMatch.awayTeamLogo ?? null,
    homeScore: dbMatch.homeScore ?? null,
    awayScore: dbMatch.awayScore ?? null,
    homePenaltyScore: dbMatch.homePenaltyScore ?? null,
    awayPenaltyScore: dbMatch.awayPenaltyScore ?? null,
    status: dbMatch.status,
    startsAt: dbMatch.startsAt ? (dbMatch.startsAt as Date).toISOString() : null,
    winnerTeamId: dbMatch.winnerTeamId ?? null,
    winnerTeamName: dbMatch.winnerTeamName ?? null,
    nextMatchId: dbMatch.nextMatchId ?? null,
    nextMatchSlot: dbMatch.nextMatchSlot ?? null,
    elapsedMinute: dbMatch.elapsedMinute ?? null,
    injuryTime: dbMatch.injuryTime ?? null,
    period: dbMatch.period ?? null,
    venueName: dbMatch.venueName ?? null,
    venueCity: dbMatch.venueCity ?? null,
    apiStatusShort: dbMatch.apiStatusShort ?? null,
    lastScoreSyncedAt: dbMatch.lastScoreSyncedAt
      ? (dbMatch.lastScoreSyncedAt as Date).toISOString()
      : null,
  }

  const intelligence = await buildWorldCupMatchupIntelligence({
    match,
    strategy: strategy as WorldCupAiStrategy,
    intent,
    bracketBrainAiEntitled: hasBracketBrainAi,
    logContext: {
      userId: userResult.user.id,
      challengeId,
      entryId,
    },
  })

  return NextResponse.json({ success: true, intelligence })
}

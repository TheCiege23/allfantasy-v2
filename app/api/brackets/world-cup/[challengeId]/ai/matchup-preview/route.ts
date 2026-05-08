import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { openaiChatText } from "@/lib/openai-client"
import {
  estimateWorldCupWinProbability,
  getWorldCupPickRecommendation,
  getWorldCupUpsetRisk,
} from "@/lib/world-cup/worldCupAiInsights"
import type { WorldCupAiMatchupPreview, WorldCupAiStrategy, WorldCupMatchView } from "@/lib/world-cup/types"
import { requireWorldCupApiUser } from "../../../_utils"

// ── Request schema ────────────────────────────────────────────────────────────

const bodySchema = z.object({
  entryId: z.string().optional(),
  matchId: z.string().min(1),
  strategy: z.enum(["safe", "balanced", "upset", "chaos"]).optional().default("balanced"),
})

// ── Route ─────────────────────────────────────────────────────────────────────

export async function POST(
  req: NextRequest,
  { params }: { params: { challengeId: string } }
) {
  // Auth
  const userResult = await requireWorldCupApiUser()
  if (!userResult.ok) return userResult.response

  const { challengeId } = params

  // Parse body
  let body: z.infer<typeof bodySchema>
  try {
    body = bodySchema.parse(await req.json())
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }

  const { matchId, entryId, strategy } = body

  // Challenge access
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

  if (entryId) {
    const entry = await (prisma as any).worldCupBracketEntry.findFirst({
      where: { id: entryId, challengeId, userId: userResult.user.id },
      select: { id: true },
    })
    if (!entry) {
      return NextResponse.json({ error: "Entry not found" }, { status: 404 })
    }
  }

  // Load match
  const dbMatch = await (prisma as any).worldCupBracketMatch.findFirst({
    where: { id: matchId, challengeId },
  })

  if (!dbMatch) {
    return NextResponse.json({ error: "Match not found" }, { status: 404 })
  }

  // Build WorldCupMatchView-compatible shape from db record
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

  // ── Deterministic analysis ─────────────────────────────────────────────────

  const winProb = estimateWorldCupWinProbability(match)
  const upsetRisk = getWorldCupUpsetRisk(match)
  const rec = getWorldCupPickRecommendation(match, strategy as WorldCupAiStrategy)

  const keyFactors = winProb.explanationFactors

  // Build deterministic summary (used as fallback if AI is unavailable)
  const homePct = Math.round(winProb.homeWinProbability * 100)
  const awayPct = Math.round(winProb.awayWinProbability * 100)
  const homeName = match.homeTeamName || match.homeSlotKey
  const awayName = match.awayTeamName || match.awaySlotKey

  const deterministicSummary =
    `${rec.recommendedTeamName} recommended (${strategy} strategy). ` +
    `Win probabilities: ${homeName} ${homePct}% vs ${awayName} ${awayPct}%. ` +
    `Upset risk: ${upsetRisk}. ${rec.explanation}`

  // ── Optional AI generative summary ────────────────────────────────────────

  let summary = deterministicSummary
  let generative = false

  const openaiKey = process.env.OPENAI_API_KEY
  if (openaiKey && match.homeTeamId && match.awayTeamId) {
    const venue = match.venueName ? ` at ${match.venueName}${match.venueCity ? `, ${match.venueCity}` : ""}` : ""
    const systemPrompt = `You are a World Cup bracket strategy assistant. Give a concise 2-sentence matchup preview for fantasy bracket picks. Be direct and factual. No caveats about real-time data.`
    const userMessage =
      `Match: ${homeName} vs ${awayName}${venue}.\n` +
      `Win probability: ${homeName} ${homePct}%, ${awayName} ${awayPct}%.\n` +
      `Upset risk: ${upsetRisk}. Strategy: ${strategy}.\n` +
      `Key factors: ${keyFactors.join("; ")}.\n` +
      `Provide a 2-sentence bracket strategy tip. End with the recommended pick: "${rec.recommendedTeamName}".`

    try {
      const aiResult = await openaiChatText({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
        temperature: 0.4,
        maxTokens: 150,
        skipCache: false,
      })

      if (aiResult.ok && aiResult.text.trim().length > 20) {
        summary = aiResult.text.trim()
        generative = true
      }
    } catch {
      // Fall through to deterministic summary
    }
  }

  // ── Build response ─────────────────────────────────────────────────────────

  const preview: WorldCupAiMatchupPreview = {
    matchId,
    recommendedTeamId: rec.recommendedTeamId,
    recommendedTeamName: rec.recommendedTeamName,
    recommendedSide: rec.recommendedSide,
    homeWinProbability: winProb.homeWinProbability,
    awayWinProbability: winProb.awayWinProbability,
    confidence: winProb.confidence,
    upsetRisk,
    keyFactors,
    summary,
    safePick: rec.safePick,
    contrarianPick: rec.contrarianPick,
    projectedScore: null,
    generative,
  }

  return NextResponse.json({ success: true, preview })
}

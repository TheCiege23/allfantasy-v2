import { NextResponse } from "next/server"
import { openaiChatText } from "@/lib/openai-client"
import { getLegacyScoreByEntity } from "@/lib/legacy-score-engine/LegacyRankingService"
import {
  buildLegacyExplanationContext,
  buildLegacyExplanationNarrative,
} from "@/lib/legacy-score-engine/AILegacyExplanationService"
import { DEFAULT_SPORT, normalizeToSupportedSport } from "@/lib/sport-scope"

export const dynamic = "force-dynamic"

/**
 * POST /api/leagues/[leagueId]/legacy-score/explain
 * Body: { entityType, entityId, sport? }. Returns narrative for "Why is this score high?" / AI explain.
 */
export async function POST(
  req: Request,
  ctx: { params: Promise<{ leagueId: string }> }
) {
  try {
    const { leagueId } = await ctx.params
    if (!leagueId) return NextResponse.json({ error: "Missing leagueId" }, { status: 400 })

    const body = await req.json().catch(() => ({}))
    const entityType = body.entityType as string
    const entityId = body.entityId as string
    const sport = normalizeToSupportedSport((body.sport as string) ?? DEFAULT_SPORT)

    if (!entityType || !entityId) {
      return NextResponse.json(
        { error: "entityType and entityId are required" },
        { status: 400 }
      )
    }

    const record = await getLegacyScoreByEntity(
      entityType,
      entityId,
      sport,
      leagueId
    )
    if (!record) {
      return NextResponse.json({
        leagueId,
        entityType,
        entityId,
        narrative:
          "No legacy score yet. Run the legacy score engine in the Legacy tab to generate scores from championships, playoffs, and consistency.",
        source: "none",
      })
    }

    const context = buildLegacyExplanationContext(record)
    const fallback = buildLegacyExplanationNarrative(context)
    const ai = await openaiChatText({
      messages: [
        {
          role: "system",
          content:
            "You are a fantasy competition historian. Explain this legacy score in 3-5 concise sentences. Mention strongest dimensions, one weaker dimension, and one practical way to improve long-term legacy.",
        },
        {
          role: "user",
          content: JSON.stringify({
            leagueId,
            entityType,
            entityId,
            context,
          }),
        },
      ],
      temperature: 0.3,
      maxTokens: 260,
    }).catch(() => null)
    const narrative = ai?.ok && ai.text?.trim() ? ai.text.trim() : fallback

    return NextResponse.json({
      leagueId,
      entityType,
      entityId,
      narrative,
      source: ai?.ok && ai.text?.trim() ? "ai" : "legacy_score_engine",
      overallLegacyScore: record.overallLegacyScore,
      breakdown: context.breakdown,
    })
  } catch (e) {
    console.error("[legacy-score/explain POST]", e instanceof Error ? e.message : e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to explain legacy score" },
      { status: 500 }
    )
  }
}

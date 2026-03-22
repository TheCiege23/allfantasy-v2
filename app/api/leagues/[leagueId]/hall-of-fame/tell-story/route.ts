/**
 * POST /api/leagues/[leagueId]/hall-of-fame/tell-story
 * Body: { type: 'entry' | 'moment', id: string }
 * Returns narrative for "Tell me why this matters" button.
 */
import { NextResponse } from "next/server"
import { openaiChatText } from "@/lib/openai-client"
import {
  getEntryByIdScoped,
  getMomentByIdScoped,
} from "@/lib/hall-of-fame-engine/HallOfFameQueryService"
import {
  entryToNarrativeContext,
  momentToNarrativeContext,
  buildWhyInductedPromptContext,
} from "@/lib/hall-of-fame-engine/AIHallOfFameNarrativeAdapter"

export const dynamic = "force-dynamic"

export async function POST(
  req: Request,
  ctx: { params: Promise<{ leagueId: string }> }
) {
  try {
    const { leagueId } = await ctx.params
    if (!leagueId) return NextResponse.json({ error: "Missing leagueId" }, { status: 400 })

    const body = await req.json().catch(() => ({}))
    const type = body.type as string
    const id = body.id as string
    if (!id || !type || (type !== "entry" && type !== "moment")) {
      return NextResponse.json(
        { error: "Body must include type: 'entry' | 'moment' and id" },
        { status: 400 }
      )
    }

    if (type === "entry") {
      const entry = await getEntryByIdScoped({ entryId: id, leagueId })
      if (!entry) {
        return NextResponse.json({ error: "Entry not found" }, { status: 404 })
      }
      const context = entryToNarrativeContext(entry)
      const prompt = buildWhyInductedPromptContext(context)
      const fallback = [
        context.title,
        context.summary || "",
        `Sport: ${context.sportLabel}. Category: ${context.category}.`,
        `Induction score: ${context.score.toFixed(2)}.`,
      ]
        .filter(Boolean)
        .join(" ")
      const ai = await openaiChatText({
        messages: [
          {
            role: "system",
            content:
              "You are a fantasy sports historian. In 3-5 concise sentences, explain why this Hall of Fame induction matters, referencing category, historical context, and evidence from the payload.",
          },
          {
            role: "user",
            content: JSON.stringify({
              leagueId,
              type: "entry",
              promptContext: prompt,
              narrativeContext: context,
            }),
          },
        ],
        temperature: 0.35,
        maxTokens: 260,
      }).catch(() => null)
      const narrative = ai?.ok && ai.text?.trim() ? ai.text.trim() : fallback
      return NextResponse.json({
        type: "entry",
        id: entry.id,
        leagueId,
        narrative,
        headline: entry.title,
        category: entry.category,
        score: entry.score,
        whyInductedPrompt: prompt,
        source: ai?.ok && ai.text?.trim() ? "ai" : "template",
      })
    }

    const moment = await getMomentByIdScoped({ momentId: id, leagueId })
    if (!moment) {
      return NextResponse.json({ error: "Moment not found" }, { status: 404 })
    }
    const context = momentToNarrativeContext(moment)
    const prompt = buildWhyInductedPromptContext(context)
    const fallback = [
      context.title,
      context.summary || "",
      `Sport: ${context.sportLabel}. Season: ${context.season}.`,
      `Significance: ${context.score.toFixed(2)}.`,
    ]
      .filter(Boolean)
      .join(" ")
    const ai = await openaiChatText({
      messages: [
        {
          role: "system",
          content:
            "You are a fantasy sports historian. In 3-5 concise sentences, explain why this Hall of Fame moment matters, highlighting significance, season context, and long-term impact.",
        },
        {
          role: "user",
          content: JSON.stringify({
            leagueId,
            type: "moment",
            promptContext: prompt,
            narrativeContext: context,
          }),
        },
      ],
      temperature: 0.35,
      maxTokens: 260,
    }).catch(() => null)
    const narrative = ai?.ok && ai.text?.trim() ? ai.text.trim() : fallback
    return NextResponse.json({
      type: "moment",
      id: moment.id,
      leagueId,
      narrative,
      headline: moment.headline,
      season: moment.season,
      significanceScore: moment.significanceScore,
      whyInductedPrompt: prompt,
      source: ai?.ok && ai.text?.trim() ? "ai" : "template",
    })
  } catch (e) {
    console.error("[hall-of-fame/tell-story POST]", e instanceof Error ? e.message : e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to build story" },
      { status: 500 }
    )
  }
}

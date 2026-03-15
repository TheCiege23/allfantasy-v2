import { NextResponse } from "next/server"
import { getEntryById } from "@/lib/hall-of-fame-engine/HallOfFameQueryService"
import { entryToNarrativeContext, buildWhyInductedPromptContext } from "@/lib/hall-of-fame-engine/AIHallOfFameNarrativeAdapter"

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ leagueId: string; entryId: string }> }
) {
  try {
    const { entryId } = await ctx.params
    if (!entryId) return NextResponse.json({ error: "Missing entryId" }, { status: 400 })

    const entry = await getEntryById(entryId)
    if (!entry) return NextResponse.json({ error: "Entry not found" }, { status: 404 })

    const narrativeContext = entryToNarrativeContext(entry)
    const whyInductedPrompt = buildWhyInductedPromptContext(narrativeContext)

    return NextResponse.json({
      entry: {
        id: entry.id,
        entityType: entry.entityType,
        entityId: entry.entityId,
        sport: entry.sport,
        leagueId: entry.leagueId,
        season: entry.season,
        category: entry.category,
        title: entry.title,
        summary: entry.summary,
        inductedAt: entry.inductedAt.toISOString(),
        score: entry.score,
        metadata: entry.metadata,
      },
      narrativeContext,
      whyInductedPrompt,
    })
  } catch (e) {
    console.error("[HallOfFame entry GET]", e instanceof Error ? e.message : e)
    return NextResponse.json(
      { error: "Unable to load Hall of Fame entry." },
      { status: 500 }
    )
  }
}

import { NextResponse } from "next/server"
import { getMomentById } from "@/lib/hall-of-fame-engine/HallOfFameQueryService"
import { momentToNarrativeContext, buildWhyInductedPromptContext } from "@/lib/hall-of-fame-engine/AIHallOfFameNarrativeAdapter"

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ leagueId: string; momentId: string }> }
) {
  try {
    const { momentId } = await ctx.params
    if (!momentId) return NextResponse.json({ error: "Missing momentId" }, { status: 400 })

    const moment = await getMomentById(momentId)
    if (!moment) return NextResponse.json({ error: "Moment not found" }, { status: 404 })

    const narrativeContext = momentToNarrativeContext(moment)
    const whyInductedPrompt = buildWhyInductedPromptContext(narrativeContext)

    return NextResponse.json({
      moment: {
        id: moment.id,
        leagueId: moment.leagueId,
        sport: moment.sport,
        season: moment.season,
        headline: moment.headline,
        summary: moment.summary,
        relatedManagerIds: moment.relatedManagerIds,
        relatedTeamIds: moment.relatedTeamIds,
        relatedMatchupId: moment.relatedMatchupId,
        significanceScore: moment.significanceScore,
        createdAt: moment.createdAt.toISOString(),
      },
      narrativeContext,
      whyInductedPrompt,
    })
  } catch (e) {
    console.error("[HallOfFame moment GET]", e instanceof Error ? e.message : e)
    return NextResponse.json(
      { error: "Unable to load Hall of Fame moment." },
      { status: 500 }
    )
  }
}

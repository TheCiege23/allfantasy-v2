/**
 * POST /api/leagues/[leagueId]/story/create
 * Body: { storyType: StoryType, sport?: string, season?: number }
 * Returns created story (headline, sections, variants) and fact-guard warnings.
 */
import { NextResponse } from "next/server"
import { createLeagueStory } from "@/lib/league-story-creator"
import { normalizeToSupportedSport } from "@/lib/sport-scope"
import type { StoryType } from "@/lib/league-story-creator/types"

const STORY_TYPES: StoryType[] = [
  "weekly_recap",
  "rivalry",
  "upset",
  "playoff_bubble",
  "title_defense",
  "trade_fallout",
  "dynasty",
  "bracket_challenge",
  "platform_sport",
]

export const dynamic = "force-dynamic"

export async function POST(
  req: Request,
  ctx: { params: Promise<{ leagueId: string }> }
) {
  try {
    const { leagueId } = await ctx.params
    if (!leagueId) return NextResponse.json({ error: "Missing leagueId" }, { status: 400 })

    const body = await req.json().catch(() => ({}))
    const storyType = body.storyType as string
    if (!storyType || !STORY_TYPES.includes(storyType as StoryType)) {
      return NextResponse.json(
        { error: "Invalid or missing storyType. Use one of: " + STORY_TYPES.join(", ") },
        { status: 400 }
      )
    }

    const sport = normalizeToSupportedSport(body.sport ?? "NFL")
    const season = body.season != null ? Number(body.season) : null

    const result = await createLeagueStory({
      leagueId,
      sport,
      season,
      storyType: storyType as StoryType,
    })

    if (!result.ok) {
      return NextResponse.json(
        { error: result.error ?? "Failed to create story" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      leagueId,
      storyType,
      sport,
      season,
      story: result.story,
      sections: result.sections,
      factGuardWarnings: result.factGuardWarnings ?? [],
      factGuardErrors: result.factGuardErrors ?? [],
      generatedAt: new Date().toISOString(),
    })
  } catch (e) {
    console.error("[story/create POST]", e instanceof Error ? e.message : e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to create story" },
      { status: 500 }
    )
  }
}

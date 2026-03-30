/**
 * POST /api/leagues/[leagueId]/story/create
 * Body: { storyType: StoryType, sport?: string, season?: number, style?: StoryStyle }
 * Returns created story (headline, sections, variants) and fact-guard warnings.
 */
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { assertLeagueMember } from "@/lib/league-access"
import { createLeagueStory, getStoryVariant, storyToMediaShape } from "@/lib/league-story-creator"
import { normalizeToSupportedSport } from "@/lib/sport-scope"
import { requireFeatureEntitlement } from "@/lib/subscription/entitlement-middleware"
import type { StoryStyle, StoryType } from "@/lib/league-story-creator/types"

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
const STORY_STYLES: StoryStyle[] = ["announcer", "recap", "neutral"]

export async function POST(
  req: Request,
  ctx: { params: Promise<{ leagueId: string }> }
) {
  try {
    const session = (await getServerSession(authOptions as any)) as
      | { user?: { id?: string } }
      | null
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { leagueId } = await ctx.params
    if (!leagueId) return NextResponse.json({ error: "Missing leagueId" }, { status: 400 })
    let access: { leagueSport: string }
    try {
      access = await assertLeagueMember(leagueId, session.user.id)
    } catch {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const gate = await requireFeatureEntitlement({
      userId: session.user.id,
      featureId: "storyline_creation",
      allowTokenFallback: true,
      confirmTokenSpend: true,
      tokenRuleCode: "ai_storyline_creation",
      tokenSourceType: "league_story_create",
      tokenSourceId: `${leagueId}:${Date.now()}`,
      tokenDescription: "League story creation",
      tokenMetadata: {
        leagueId,
      },
    })
    if (!gate.ok) return gate.response

    const body = await req.json().catch(() => ({}))
    const storyType = body.storyType as string
    if (!storyType || !STORY_TYPES.includes(storyType as StoryType)) {
      return NextResponse.json(
        { error: "Invalid or missing storyType. Use one of: " + STORY_TYPES.join(", ") },
        { status: 400 }
      )
    }

    const sport = normalizeToSupportedSport(body.sport ?? access.leagueSport ?? "NFL")
    const season = body.season != null ? Number(body.season) : null
    const style = STORY_STYLES.includes(body.style as StoryStyle)
      ? (body.style as StoryStyle)
      : "neutral"

    const result = await createLeagueStory({
      leagueId,
      sport,
      season,
      storyType: storyType as StoryType,
      style,
    })

    if (!result.ok) {
      return NextResponse.json(
        { error: result.error ?? "Failed to create story" },
        { status: 500 }
      )
    }

    const variants = result.story
      ? {
          short: getStoryVariant(result.story, "short"),
          social: getStoryVariant(result.story, "social"),
          long: getStoryVariant(result.story, "long"),
        }
      : null
    const media =
      result.story != null
        ? storyToMediaShape(result.story, {
            leagueId,
            sport,
            storyType: storyType as StoryType,
          })
        : null

    return NextResponse.json({
      leagueId,
      storyType,
      sport,
      season,
      style,
      story: result.story,
      sections: result.sections,
      variants,
      media,
      factGuardWarnings: result.factGuardWarnings ?? [],
      factGuardErrors: result.factGuardErrors ?? [],
      oneBrainMerge: {
        deterministic: "context_assembler",
        deepseek: "significance",
        grok: "narrative_framing",
        openai: "final_user_story",
      },
      tokenSpend: gate.tokenSpend
        ? {
            ruleCode: gate.tokenPreview?.ruleCode ?? "ai_storyline_creation",
            tokenCost: gate.tokenPreview?.tokenCost ?? null,
            balanceAfter: gate.tokenSpend.balanceAfter,
            ledgerId: gate.tokenSpend.id,
          }
        : null,
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

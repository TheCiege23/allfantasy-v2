import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getContentFeed } from "@/lib/content-feed"
import { isSupportedSport } from "@/lib/sport-scope"
import type { FeedMode, FeedItemType } from "@/lib/content-feed"

export const dynamic = "force-dynamic"

const FEED_TABS: FeedMode[] = ["following", "for_you", "trending"]
const FEED_ITEM_TYPES: FeedItemType[] = [
  "creator_post",
  "ai_story_card",
  "power_rankings_card",
  "trend_alert",
  "blog_preview",
  "league_recap_card",
  "bracket_highlight_card",
  "matchup_card",
  "player_news",
  "league_update",
  "ai_insight",
  "community_highlight",
]

/**
 * GET /api/content-feed
 * Returns personalized platform content feed (creator, AI, blog, trend, recaps, bracket, matchup).
 * Query: tab (following | for_you | trending), sport, contentType, limit (default 30), refresh, track (event name for analytics).
 */
export async function GET(req: NextRequest) {
  try {
    const session = (await getServerSession(authOptions as any)) as {
      user?: { id?: string }
    } | null
    const userId = session?.user?.id ?? null

    const url = new URL(req.url)
    const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get("limit") || "30", 10)))
    const tabParam = url.searchParams.get("tab") ?? "for_you"
    const tab: FeedMode = FEED_TABS.includes(tabParam as FeedMode) ? (tabParam as FeedMode) : "for_you"
    const sportParam = url.searchParams.get("sport") ?? null
    const sport = sportParam && isSupportedSport(sportParam) ? sportParam : null
    const contentTypeParam = url.searchParams.get("contentType") ?? null
    const contentType = contentTypeParam && FEED_ITEM_TYPES.includes(contentTypeParam as FeedItemType)
      ? (contentTypeParam as FeedItemType)
      : null
    const trackEvent = url.searchParams.get("track") ?? null

    if (trackEvent === "feed_view" || trackEvent === "feed_refresh") {
      try {
        await trackFeedEvent(userId, trackEvent, { tab, sport, contentType })
      } catch (_) {
        /* non-fatal */
      }
    }

    const items = await getContentFeed(userId, {
      tab,
      sport,
      contentType,
      limit,
    })

    return NextResponse.json(
      { items, tab, sport: sport ?? undefined, contentType: contentType ?? undefined },
      { headers: { "Cache-Control": "no-store, max-age=0" } }
    )
  } catch (err: any) {
    console.error("[api/content-feed] Error:", err)
    return NextResponse.json(
      { error: err?.message ?? "Failed to load feed" },
      { status: 500 }
    )
  }
}

async function trackFeedEvent(
  userId: string | null,
  event: string,
  meta: { tab?: string; sport?: string | null; contentType?: string | null }
): Promise<void> {
  if (typeof process.env.NEXT_PUBLIC_ANALYTICS_ENABLED !== "undefined" && !process.env.NEXT_PUBLIC_ANALYTICS_ENABLED) return
  // Extend with your analytics backend (e.g. post to /api/analytics/event).
  if (process.env.NODE_ENV === "development") {
    console.debug("[content-feed] event:", event, "userId:", userId ?? "anonymous", meta)
  }
}

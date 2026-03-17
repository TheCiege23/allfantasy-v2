import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { listEpisodes } from "@/lib/fantasy-media/FantasyMediaQueryService"
import { resolvePlaybackUrl } from "@/lib/fantasy-media/MediaPlaybackResolver"

export const dynamic = "force-dynamic"

/**
 * GET /api/fantasy-media/episodes?mediaType=&sport=&leagueId=&limit=
 * List current user's fantasy media episodes with playback URL when completed.
 */
export async function GET(req: Request) {
  const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const mediaType = searchParams.get("mediaType") ?? undefined
  const sport = searchParams.get("sport") ?? undefined
  const leagueId = searchParams.get("leagueId") ?? undefined
  const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!, 10) : 50

  const rows = await listEpisodes({
    userId: session.user.id,
    mediaType,
    sport,
    leagueId: leagueId || null,
    limit,
  })

  const episodes = rows.map((ep) => ({
    id: ep.id,
    sport: ep.sport,
    leagueId: ep.leagueId,
    mediaType: ep.mediaType,
    title: ep.title,
    status: ep.status,
    playbackUrl: resolvePlaybackUrl(ep),
    provider: ep.provider,
    createdAt: ep.createdAt,
    updatedAt: ep.updatedAt,
  }))

  return NextResponse.json({ episodes })
}

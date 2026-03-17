import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getEpisode } from "@/lib/fantasy-media/FantasyMediaQueryService"
import { resolvePlaybackUrl } from "@/lib/fantasy-media/MediaPlaybackResolver"

export const dynamic = "force-dynamic"

/**
 * GET /api/fantasy-media/episodes/[id]
 * Get one episode; includes playbackUrl when status is completed.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const episode = await getEpisode(id, session.user.id)
  if (!episode) return NextResponse.json({ error: "Not found" }, { status: 404 })

  return NextResponse.json({
    id: episode.id,
    sport: episode.sport,
    leagueId: episode.leagueId,
    mediaType: episode.mediaType,
    title: episode.title,
    script: episode.script,
    status: episode.status,
    playbackUrl: resolvePlaybackUrl(episode),
    provider: episode.provider,
    providerJobId: episode.providerJobId,
    meta: episode.meta,
    createdAt: episode.createdAt,
    updatedAt: episode.updatedAt,
  })
}

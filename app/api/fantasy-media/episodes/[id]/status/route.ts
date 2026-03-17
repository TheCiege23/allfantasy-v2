import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getEpisode } from "@/lib/fantasy-media/FantasyMediaQueryService"
import { trackVideoJob } from "@/lib/fantasy-media/VideoGenerationJobTracker"
import { resolvePlaybackUrl } from "@/lib/fantasy-media/MediaPlaybackResolver"

export const dynamic = "force-dynamic"

/**
 * GET /api/fantasy-media/episodes/[id]/status
 * Poll job status: runs tracker once and returns current status and playbackUrl when completed.
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

  if (episode.status === "generating" && episode.providerJobId) {
    const result = await trackVideoJob(id)
    const updated = await getEpisode(id, session.user.id)
    return NextResponse.json({
      status: result.status,
      playbackUrl: result.playbackUrl ?? (updated ? resolvePlaybackUrl(updated) : null),
    })
  }

  return NextResponse.json({
    status: episode.status,
    playbackUrl: resolvePlaybackUrl(episode),
  })
}

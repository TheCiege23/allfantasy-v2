import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getEpisode, getPlaybackUrl, getShareUrl } from "@/lib/podcast-engine/PodcastDistributionService"

export const dynamic = "force-dynamic"

/**
 * GET /api/podcast/episodes/[id]
 * Get one episode (for playback page). Auth: must be owner.
 */
export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = (await getServerSession(authOptions as any)) as {
    user?: { id?: string }
  } | null

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const episode = await getEpisode(params.id, session.user.id)
  if (!episode) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const baseUrl = process.env.NEXTAUTH_URL ?? new URL(req.url).origin
  const shareUrl = getShareUrl(episode.id, baseUrl || "https://allfantasy.ai")
  const playbackUrl = getPlaybackUrl(episode)

  return NextResponse.json({
    id: episode.id,
    title: episode.title,
    script: episode.script,
    playbackUrl,
    shareUrl,
    durationSeconds: episode.durationSeconds,
    createdAt: episode.createdAt,
  })
}

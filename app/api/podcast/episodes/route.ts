import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { listEpisodes } from "@/lib/podcast-engine/PodcastDistributionService"

export const dynamic = "force-dynamic"

/**
 * GET /api/podcast/episodes
 * List current user's podcast episodes.
 */
export async function GET(req: Request) {
  const session = (await getServerSession(authOptions as any)) as {
    user?: { id?: string }
  } | null

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const url = new URL(req.url)
  const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get("limit") || "20", 10)))
  const episodes = await listEpisodes(session.user.id, limit)
  return NextResponse.json({ episodes })
}

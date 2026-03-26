import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { publishFantasyMediaEpisode } from "@/lib/fantasy-media/FantasyMediaPublishService"
import { persistRefreshedYouTubeAccessToken } from "@/lib/fantasy-media/publish-providers/YouTubeTokenPersistence"

export const dynamic = "force-dynamic"

/**
 * POST /api/fantasy-media/episodes/[id]/publish
 * Body: { destinationType?: string }
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  const body = await req.json().catch(() => ({}))
  const destinationType = String(body.destinationType ?? "x")

  const result = await publishFantasyMediaEpisode(id, destinationType, session.user.id, {
    onProviderCredentialRefresh: async (payload) => {
      if (payload.destinationType !== "youtube") return
      await persistRefreshedYouTubeAccessToken({
        userId: payload.userId,
        accessToken: payload.accessToken,
        expiresInSeconds: payload.expiresInSeconds,
      })
    },
  })
  const statusCode = result.publishId ? 200 : 404
  return NextResponse.json(result, { status: statusCode })
}

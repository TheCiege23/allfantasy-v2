import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { createHeyGenVideo } from "@/lib/fantasy-media/HeyGenVideoService"
import { createEpisode } from "@/lib/fantasy-media/FantasyMediaQueryService"
import { trackVideoJob } from "@/lib/fantasy-media/VideoGenerationJobTracker"
import { MEDIA_TYPES } from "@/lib/fantasy-media/types"
import { normalizeToSupportedSport } from "@/lib/sport-scope"

export const dynamic = "force-dynamic"

type MediaType = (typeof MEDIA_TYPES)[number]

/**
 * POST /api/fantasy-media/generate
 * Create episode, send script to HeyGen, store job id; optionally run tracker in background.
 * Body: sport?, leagueId?, leagueName?, week?, contentType?, title?, script?
 * If script/title omitted, a default script is built server-side.
 */
export async function POST(req: Request) {
  const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const sport = normalizeToSupportedSport(body.sport)
  const contentType = MEDIA_TYPES.includes(body.contentType as MediaType) ? body.contentType : "weekly_recap"
  const leagueName = body.leagueName ?? "your league"
  const leagueId = body.leagueId ?? null
  const week = body.week

  const { buildFantasyVideoScript } = await import("@/lib/fantasy-media/FantasyVideoScriptBuilder")
  const built = buildFantasyVideoScript({ sport, leagueName, leagueId, week, contentType: contentType as MediaType })
  const title = body.title ?? built.title
  const script = body.script ?? built.script

  const heygenInput = {
    title,
    sport,
    contentType: contentType as MediaType,
    script,
  }
  const createResult = await createHeyGenVideo(heygenInput)
  if (!createResult) {
    return NextResponse.json({ error: "HeyGen video creation failed" }, { status: 502 })
  }

  const episode = await createEpisode({
    userId: session.user.id,
    sport,
    leagueId,
    mediaType: contentType,
    title,
    script,
    status: "generating",
    provider: "heygen",
    providerJobId: createResult.videoId,
  })

  // Run job tracker in background (poll until complete and update episode)
  void trackVideoJob(episode.id).catch((err) => {
    console.error("[fantasy-media] trackVideoJob failed", episode.id, err)
  })

  return NextResponse.json({
    id: episode.id,
    title: episode.title,
    status: episode.status,
    providerJobId: createResult.videoId,
    createdAt: episode.createdAt,
  })
}

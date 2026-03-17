import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { buildFantasyVideoScript } from "@/lib/fantasy-media"
import { MEDIA_TYPES } from "@/lib/fantasy-media/types"
import { normalizeToSupportedSport } from "@/lib/sport-scope"

export const dynamic = "force-dynamic"

type MediaType = (typeof MEDIA_TYPES)[number]

/**
 * POST /api/fantasy-media/script
 * Generate video script only (no HeyGen). Body: sport?, leagueId?, leagueName?, week?, contentType?
 */
export async function POST(req: Request) {
  const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const sport = normalizeToSupportedSport(body.sport)
  const contentType = MEDIA_TYPES.includes(body.contentType as MediaType) ? body.contentType : "weekly_recap"

  const result = buildFantasyVideoScript({
    sport,
    leagueName: body.leagueName,
    leagueId: body.leagueId,
    week: body.week,
    contentType: contentType as MediaType,
  })

  return NextResponse.json(result)
}

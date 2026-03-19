import { NextRequest, NextResponse } from "next/server"
import { discoverLeagues } from "@/lib/league-discovery"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { resolveUserCareerTier } from "@/lib/ranking/tier-visibility"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  try {
    const session = (await getServerSession(authOptions as any)) as {
      user?: { id?: string }
    } | null
    const viewerTier = await resolveUserCareerTier(prisma as any, session?.user?.id, 1)

    const sp = req.nextUrl.searchParams
    const query = sp.get("q") ?? sp.get("query") ?? null
    const sport = sp.get("sport") ?? null
    const leagueType = sp.get("leagueType") ?? sp.get("scoringMode") ?? null
    const entryFee = sp.get("entryFee") ?? null
    const visibility = sp.get("visibility") ?? null
    const difficulty = sp.get("difficulty") ?? null
    const page = sp.get("page") ?? "1"
    const limit = sp.get("limit") ?? "20"

    const result = await discoverLeagues({
      query,
      sport,
      leagueType,
      entryFee,
      visibility,
      difficulty,
      page: parseInt(page, 10) || 1,
      limit: parseInt(limit, 10) || 20,
      viewerTier,
    })

    return NextResponse.json(result, {
      headers: { "Cache-Control": "no-store, max-age=0" },
    })
  } catch (err: any) {
    console.error("[bracket/discover]", err)
    return NextResponse.json(
      { error: err?.message ?? "Discovery failed" },
      { status: 500 }
    )
  }
}

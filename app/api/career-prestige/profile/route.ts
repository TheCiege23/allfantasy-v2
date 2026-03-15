import { NextResponse } from "next/server"
import { getUnifiedCareerProfile } from "@/lib/career-prestige/UnifiedCareerQueryService"

export const dynamic = "force-dynamic"

/**
 * GET /api/career-prestige/profile?managerId=&leagueId=&sport=
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const managerId = url.searchParams.get("managerId")
    if (!managerId) return NextResponse.json({ error: "Missing managerId" }, { status: 400 })
    const leagueId = url.searchParams.get("leagueId") ?? undefined
    const sport = url.searchParams.get("sport") ?? undefined

    const profile = await getUnifiedCareerProfile(managerId, { leagueId, sport })
    return NextResponse.json(profile)
  } catch (e) {
    console.error("[career-prestige/profile GET]", e instanceof Error ? e.message : e)
    return NextResponse.json(
      { error: "Failed to load career profile" },
      { status: 500 }
    )
  }
}

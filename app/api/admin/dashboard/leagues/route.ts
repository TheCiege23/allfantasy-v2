import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/adminAuth"
import {
  getActiveLeaguesBySport,
  getLargestLeagues,
  getRecentlyCreatedLeagues,
  getFlaggedLeagues,
} from "@/lib/admin-dashboard"
import type { LeagueOverviewKind } from "@/lib/admin-dashboard/types"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const gate = await requireAdmin()
  if (!gate.ok) return gate.res
  const kind = (req.nextUrl.searchParams.get("kind") || "recent") as LeagueOverviewKind
  const limit = Math.min(100, Math.max(1, parseInt(req.nextUrl.searchParams.get("limit") || "25", 10) || 25))
  try {
    if (kind === "by_sport") {
      const bySport = await getActiveLeaguesBySport()
      return NextResponse.json({ kind: "by_sport", data: bySport })
    }
    if (kind === "largest") {
      const list = await getLargestLeagues(limit)
      return NextResponse.json({ kind: "largest", data: list })
    }
    if (kind === "flagged") {
      const list = await getFlaggedLeagues(limit)
      return NextResponse.json({ kind: "flagged", data: list })
    }
    const list = await getRecentlyCreatedLeagues(limit)
    return NextResponse.json({ kind: "recent", data: list })
  } catch (e) {
    console.error("[admin/dashboard/leagues]", e)
    return NextResponse.json({ error: "Failed to load leagues" }, { status: 500 })
  }
}

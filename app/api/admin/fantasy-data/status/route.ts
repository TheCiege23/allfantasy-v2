/**
 * GET /api/admin/fantasy-data/status
 *
 * Returns fantasy data import evidence for NFL and NCAAF:
 * - DB counts (players, ADP, injuries, schedules)
 * - Last import timestamps per provider
 * - Missing env vars
 * - Data availability tier
 * - Freshness report
 *
 * Requires admin session or Bearer token.
 */
import { NextRequest, NextResponse } from "next/server"
import { requireAdminOrBearer } from "@/lib/adminAuth"
import { loadFantasyDataEvidence } from "@/lib/fantasy-data/fantasyDataEvidence"
import { computeFantasyFreshness } from "@/lib/fantasy-data/fantasyFreshness"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const gate = await requireAdminOrBearer(request)
  if (!gate.ok) return gate.res

  const url = new URL(request.url)
  const season = url.searchParams.get("season")
    ? Number(url.searchParams.get("season"))
    : undefined

  const [nfl, ncaaf] = await Promise.all([
    loadFantasyDataEvidence({ sport: "NFL", season }),
    loadFantasyDataEvidence({ sport: "NCAAF", season }),
  ])

  const nflFreshness = computeFantasyFreshness(nfl)
  const ncaafFreshness = computeFantasyFreshness(ncaaf)

  return NextResponse.json({
    ok: true,
    generatedAt: new Date().toISOString(),
    sports: {
      NFL: {
        evidence: nfl,
        freshness: nflFreshness,
      },
      NCAAF: {
        evidence: ncaaf,
        freshness: ncaafFreshness,
      },
    },
  })
}

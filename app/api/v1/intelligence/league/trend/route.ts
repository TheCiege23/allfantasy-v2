import { NextRequest, NextResponse } from 'next/server'
import { leagueTrendIntelligenceHandler } from '@/lib/decision-os/behavioral/api/intelligence-handlers'

export const dynamic = 'force-dynamic'

// GET /api/v1/intelligence/league/trend?leagueId={id}
// Required scope: intelligence:league:read (commissioner + platform tiers)
// Gated by DECISION_OS_INTELLIGENCE_API_ENABLED=true + X-AllFantasy-API-Key header.
// Phase 3.3 — additive: a new route, not a change to /league.
// Returns { available: false, reason: 'insufficient_historical_data' } honestly
// until a league has at least 2 captured intelligence_league_snapshot_history rows.
export async function GET(req: NextRequest) {
  const ctx = {
    headers:      req.headers,
    searchParams: new URL(req.url).searchParams,
  }
  const r = await leagueTrendIntelligenceHandler(ctx)
  return NextResponse.json(r.body, { status: r.status })
}

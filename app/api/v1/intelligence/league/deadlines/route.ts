import { NextRequest, NextResponse } from 'next/server'
import { leagueDeadlineIntelligenceHandler } from '@/lib/decision-os/behavioral/api/intelligence-handlers'

export const dynamic = 'force-dynamic'

// GET /api/v1/intelligence/league/deadlines?leagueId={id}
// Required scope: intelligence:league:read (commissioner + platform tiers)
// Gated by DECISION_OS_INTELLIGENCE_API_ENABLED=true + X-AllFantasy-API-Key header.
// Phase 3.3 — additive: a new route, not a change to /league.
export async function GET(req: NextRequest) {
  const ctx = {
    headers:      req.headers,
    searchParams: new URL(req.url).searchParams,
  }
  const r = await leagueDeadlineIntelligenceHandler(ctx)
  return NextResponse.json(r.body, { status: r.status })
}

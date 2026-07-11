import { NextRequest, NextResponse } from 'next/server'
import { leagueManagersIntelligenceHandler } from '@/lib/decision-os/behavioral/api/intelligence-handlers'
import { resolveDataProvider }                from '@/lib/decision-os/behavioral/api/provider-selector'

export const dynamic = 'force-dynamic'

// GET /api/v1/intelligence/league/managers?leagueId={id}
// Required scope: intelligence:league:read (commissioner + platform tiers)
// Gated by DECISION_OS_INTELLIGENCE_API_ENABLED=true + X-AllFantasy-API-Key header.
// Provider: DECISION_OS_INTELLIGENCE_API_PROVIDER=real → realDataProvider; else stub.
// Phase 3.3 — additive: a new route, not a change to /league or /manager.
export async function GET(req: NextRequest) {
  const ctx = {
    headers:      req.headers,
    searchParams: new URL(req.url).searchParams,
  }
  const r = await leagueManagersIntelligenceHandler(ctx, resolveDataProvider())
  return NextResponse.json(r.body, { status: r.status })
}

import { NextRequest, NextResponse } from 'next/server'
import { managerIntelligenceHandler } from '@/lib/decision-os/behavioral/api/intelligence-handlers'
import { resolveDataProvider }         from '@/lib/decision-os/behavioral/api/provider-selector'

export const dynamic = 'force-dynamic'

// GET /api/v1/intelligence/manager?leagueId={id}&managerId={id}
// Required scope: intelligence:manager:read (manager + platform tiers)
// Gated by DECISION_OS_INTELLIGENCE_API_ENABLED=true + X-AllFantasy-API-Key header.
// Provider: DECISION_OS_INTELLIGENCE_API_PROVIDER=real → realDataProvider; else stub.
export async function GET(req: NextRequest) {
  const ctx = {
    headers:      req.headers,
    searchParams: new URL(req.url).searchParams,
  }
  const r = await managerIntelligenceHandler(ctx, resolveDataProvider())
  return NextResponse.json(r.body, { status: r.status })
}

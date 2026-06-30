import { NextRequest, NextResponse } from 'next/server'
import { platformIntelligenceHandler } from '@/lib/decision-os/behavioral/api/intelligence-handlers'
import { resolveDataProvider }         from '@/lib/decision-os/behavioral/api/provider-selector'

export const dynamic = 'force-dynamic'

// GET /api/v1/intelligence/platform
// Required scope: intelligence:platform:basic (all tiers)
// Platform-tier callers receive full intelligence; all others receive the basic summary.
// Gated by DECISION_OS_INTELLIGENCE_API_ENABLED=true + X-AllFantasy-API-Key header.
// Provider: DECISION_OS_INTELLIGENCE_API_PROVIDER=real → realDataProvider; else stub.
export async function GET(req: NextRequest) {
  const ctx = {
    headers:      req.headers,
    searchParams: new URL(req.url).searchParams,
  }
  const r = await platformIntelligenceHandler(ctx, resolveDataProvider())
  return NextResponse.json(r.body, { status: r.status })
}

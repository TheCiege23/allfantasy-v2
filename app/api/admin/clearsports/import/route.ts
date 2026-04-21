import { withApiUsage } from '@/lib/telemetry/usage'
import { NextRequest, NextResponse } from 'next/server'
import { requireAdminOrBearer } from '@/lib/adminAuth'
import { syncClearSportsToDb } from '@/lib/clear-sports'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

type ImportBody = {
  syncType?: string
  season?: string
  soccerLeagues?: string[]
}

export const POST = withApiUsage({
  endpoint: '/api/admin/clearsports/import',
  tool: 'AdminClearSportsImport',
})(async (request: NextRequest) => {
  const gate = await requireAdminOrBearer(request)
  if (!gate.ok) return gate.res

  try {
    const body = (await request.json().catch(() => ({}))) as ImportBody
    const syncType = typeof body.syncType === 'string' ? body.syncType : 'all'
    const season = typeof body.season === 'string' && body.season.trim() ? body.season.trim() : undefined
    const soccerLeagues = Array.isArray(body.soccerLeagues)
      ? body.soccerLeagues.filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
      : undefined

    const startedAt = Date.now()
    const summary = await syncClearSportsToDb({
      syncType,
      season,
      soccerLeagues,
    })

    return NextResponse.json(
      {
        ok: true,
        syncType,
        season: season ?? 'current',
        durationMs: Date.now() - startedAt,
        summary,
      },
      {
        headers: { 'Cache-Control': 'no-cache, no-store' },
      },
    )
  } catch (err) {
    console.error('[admin/clearsports/import] failed', err)
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : 'ClearSports import failed',
      },
      { status: 500 },
    )
  }
})

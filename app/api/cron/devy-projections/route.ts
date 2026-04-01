import { NextRequest, NextResponse } from 'next/server'

import { requireCronAuth } from '@/app/api/cron/_auth'
import { refreshDraftProjections } from '@/lib/workers/devy-data-worker'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 120

export async function GET(req: NextRequest) {
  if (!requireCronAuth(req, 'CRON_SECRET')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const sport = req.nextUrl.searchParams.get('sport')
    if (sport) {
      const result = await refreshDraftProjections(sport)
      return NextResponse.json({ ok: true, ...result })
    }
    const results = await Promise.all([refreshDraftProjections('NCAAF'), refreshDraftProjections('NCAAB')])
    return NextResponse.json({ ok: true, results })
  } catch (error) {
    console.error('[cron/devy-projections]', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Projection refresh failed' }, { status: 500 })
  }
}

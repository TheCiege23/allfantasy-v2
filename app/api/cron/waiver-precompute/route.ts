import { NextRequest, NextResponse } from 'next/server'

import { requireCronAuth } from '@/app/api/cron/_auth'
import { preloadWaiverRecommendations } from '@/lib/agents/workers/api-health-monitor'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 180

export async function GET(req: NextRequest) {
  if (!requireCronAuth(req, 'CRON_SECRET')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await preloadWaiverRecommendations()
    return NextResponse.json({ ok: true, result })
  } catch (error) {
    console.error('[cron/waiver-precompute]', error)
    return NextResponse.json({ error: 'Waiver precompute failed' }, { status: 500 })
  }
}

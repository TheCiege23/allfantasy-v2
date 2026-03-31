import { NextRequest, NextResponse } from 'next/server'

import { requireCronAuth } from '@/app/api/cron/_auth'
import { runDataFreshnessSweep } from '@/lib/agents/workers/api-health-monitor'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 120

export async function GET(req: NextRequest) {
  if (!requireCronAuth(req, 'CRON_SECRET')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const snapshot = await runDataFreshnessSweep()
    return NextResponse.json({ ok: true, snapshot })
  } catch (error) {
    console.error('[cron/data-freshness]', error)
    return NextResponse.json({ error: 'Data freshness sweep failed' }, { status: 500 })
  }
}

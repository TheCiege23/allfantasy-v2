import { NextRequest, NextResponse } from 'next/server'

import { requireCronAuth } from '@/app/api/cron/_auth'
import { runSystemHealthMonitor } from '@/lib/agents/workers/api-health-monitor'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 120

export async function GET(req: NextRequest) {
  if (!requireCronAuth(req, 'CRON_SECRET')) {
    // Missing/wrong secret is expected for probes — do not log as error
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const snapshot = await runSystemHealthMonitor({
      runImports: false,
      notifyAdmins: true,
      preloadDrafts: true,
    })
    return NextResponse.json({ ok: true, snapshot })
  } catch (error) {
    console.error('[cron/health-check]', error)
    return NextResponse.json({ error: 'Health check failed' }, { status: 500 })
  }
}

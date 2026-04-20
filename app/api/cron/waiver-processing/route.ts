import { NextRequest, NextResponse } from 'next/server'
import { requireCronAuth } from '@/app/api/cron/_auth'
import { runWaiverProcessingWorker } from '@/lib/workers/scoring-worker'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 180

export async function GET(req: NextRequest) {
  if (!requireCronAuth(req, 'CRON_SECRET')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await runWaiverProcessingWorker()
    console.log(
      JSON.stringify({
        ts: new Date().toISOString(),
        source: 'league_engine',
        subsystem: 'cron',
        action: 'waiver_processing',
        ok: true,
        extra: { processedLeagues: result.processedLeagues },
      }),
    )
    return NextResponse.json({ ok: true, result })
  } catch (error) {
    console.error('[cron/waiver-processing]', error)
    return NextResponse.json({ error: 'Waiver processing failed' }, { status: 500 })
  }
}

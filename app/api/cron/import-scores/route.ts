import { NextRequest, NextResponse } from 'next/server'

import { requireCronAuth } from '@/app/api/cron/_auth'
import { SUPPORTED_SPORTS } from '@/lib/workers/api-config'
import { rollingInsightsProvider } from '@/lib/workers/providers/rolling-insights'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * High-frequency live scores import — Rolling Insights only (every 2 min).
 * Other providers are too slow or rate-limited for this cadence.
 */
export async function GET(req: NextRequest) {
  if (!requireCronAuth(req, 'CRON_SECRET')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let imported = 0
  let errors = 0

  for (const sport of SUPPORTED_SPORTS) {
    try {
      const data = await rollingInsightsProvider({ sport, dataType: 'scores', query: {} })
      if (data) imported++
    } catch (e) {
      console.warn(`[import-scores] ${sport} failed:`, e instanceof Error ? e.message : e)
      errors++
    }
  }

  console.log(`[import-scores] imported=${imported} errors=${errors}`)
  return NextResponse.json({ ok: true, imported, errors, source: 'rolling_insights' })
}

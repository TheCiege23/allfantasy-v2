import { NextRequest, NextResponse } from 'next/server'

import { requireCronAuth } from '@/app/api/cron/_auth'
import { runImportMaximizer } from '@/lib/agents/workers/import-maximizer'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

export async function GET(req: NextRequest) {
  if (!requireCronAuth(req, 'LEAGUE_CRON_SECRET')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await runImportMaximizer()
    return NextResponse.json({ ok: true, result })
  } catch (error) {
    console.error('[cron/import-sync]', error)
    return NextResponse.json({ error: 'Import sync failed' }, { status: 500 })
  }
}

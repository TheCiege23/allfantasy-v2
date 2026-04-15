import { NextRequest, NextResponse } from 'next/server'

import { requireCronAuth } from '@/app/api/cron/_auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 120

export async function GET(req: NextRequest) {
  if (!requireCronAuth(req, 'CRON_SECRET')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { syncESPNInjuriesToDb } = await import('@/lib/espn-data')
    const result = await syncESPNInjuriesToDb()
    console.log(`[import-espn-injuries] synced=${result.synced} teams=${result.teams}`)
    return NextResponse.json({ ok: true, ...result })
  } catch (error) {
    console.error('[import-espn-injuries]', error)
    return NextResponse.json({ error: 'ESPN injury sync failed' }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'

import { requireCronAuth } from '@/app/api/cron/_auth'
import { importCollegePlayers } from '@/lib/workers/devy-data-worker'

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
      const result = await importCollegePlayers(sport)
      return NextResponse.json({ ok: true, ...result })
    }
    const results = await Promise.all([importCollegePlayers('NCAAF'), importCollegePlayers('NCAAB')])
    return NextResponse.json({ ok: true, results })
  } catch (error) {
    console.error('[cron/devy-import]', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Devy import failed' }, { status: 500 })
  }
}

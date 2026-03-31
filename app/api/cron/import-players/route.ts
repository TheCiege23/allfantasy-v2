import { NextRequest, NextResponse } from 'next/server'

import { requireCronAuth } from '@/app/api/cron/_auth'
import { runSportsDataImporter } from '@/lib/workers/sports-data-importer'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 120

export async function GET(req: NextRequest) {
  if (!requireCronAuth(req, 'CRON_SECRET')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await runSportsDataImporter()
    return NextResponse.json({ ok: true, ...result })
  } catch (error) {
    console.error('[cron/import-players]', error)
    return NextResponse.json({ error: 'Player import failed' }, { status: 500 })
  }
}

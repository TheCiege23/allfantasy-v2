import { NextRequest, NextResponse } from 'next/server'

import { requireCronAuth } from '@/app/api/cron/_auth'
import { runAdpImporter } from '@/lib/workers/adp-importer'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 120

export async function GET(req: NextRequest) {
  if (!requireCronAuth(req, 'CRON_SECRET')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await runAdpImporter()
    return NextResponse.json({ ok: true, ...result })
  } catch (error) {
    console.error('[cron/import-adp]', error)
    return NextResponse.json({ error: 'ADP import failed' }, { status: 500 })
  }
}

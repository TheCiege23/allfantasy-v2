import { NextRequest, NextResponse } from 'next/server'

import { requireCronAuth } from '@/app/api/cron/_auth'
import { runGrokInjuryDigestWorker } from '@/lib/workers/grok-injury-digest'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 120

export async function GET(req: NextRequest) {
  if (!requireCronAuth(req, 'CRON_SECRET')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await runGrokInjuryDigestWorker()
    return NextResponse.json(result)
  } catch (error) {
    console.error('[cron/grok-injury-digest]', error)
    return NextResponse.json({ error: 'Grok injury digest failed' }, { status: 500 })
  }
}

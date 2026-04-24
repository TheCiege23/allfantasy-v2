import { NextRequest, NextResponse } from 'next/server'

import { requireCronAuth } from '@/app/api/cron/_auth'
import { processExpiredDraftPicks } from '@/lib/live-draft-engine/expired-picks/processExpiredDraftPicks'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 120

/**
 * GET: process all snake/linear drafts whose pick timer has expired (server-side autopick).
 * Secured with cron secret — schedule from hosting (e.g. every minute).
 */
export async function GET(req: NextRequest) {
  if (!requireCronAuth(req, 'CRON_SECRET')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const summary = await processExpiredDraftPicks({ now: new Date(), maxLeagues: 60 })
    return NextResponse.json({ ok: true, ...summary })
  } catch (e) {
    console.error('[cron/draft-expired-picks]', e)
    return NextResponse.json({ error: 'Expired pick processing failed' }, { status: 500 })
  }
}

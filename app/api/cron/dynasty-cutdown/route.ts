import { NextRequest, NextResponse } from 'next/server'
import { requireCronAuth } from '@/app/api/cron/_auth'
import { auditDynastyCutdowns } from '@/lib/league/keeper-engine'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 180

export async function GET(req: NextRequest) {
  if (!requireCronAuth(req, 'CRON_SECRET')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const flagged = await auditDynastyCutdowns()
    return NextResponse.json({
      ok: true,
      flaggedCount: flagged.length,
      flagged,
    })
  } catch (error) {
    console.error('[cron/dynasty-cutdown]', error)
    return NextResponse.json({ error: 'Dynasty cutdown audit failed' }, { status: 500 })
  }
}

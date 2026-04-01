import { NextRequest, NextResponse } from 'next/server'

import { requireCronAuth } from '@/app/api/cron/_auth'
import { seedSleeperPlayers } from '@/lib/sleeper/SleeperPlayerSeedService'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 120

export async function GET(req: NextRequest) {
  if (!requireCronAuth(req, 'CRON_SECRET')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await seedSleeperPlayers({ sport: 'NFL' })
    return NextResponse.json({ ...result, ok: result.ok ?? true })
  } catch (error) {
    console.error('[cron/sync-sleeper-players]', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Sleeper player sync failed' },
      { status: 500 }
    )
  }
}

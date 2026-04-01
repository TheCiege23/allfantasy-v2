import { NextRequest, NextResponse } from 'next/server'
import { requireCronAuth } from '@/app/api/cron/_auth'
import { expireOverdueKeeperDeclarations } from '@/lib/league/keeper-engine'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 180

export async function GET(req: NextRequest) {
  if (!requireCronAuth(req, 'CRON_SECRET')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const expired = await expireOverdueKeeperDeclarations()
    return NextResponse.json({ ok: true, expired })
  } catch (error) {
    console.error('[cron/keeper-deadline]', error)
    return NextResponse.json({ error: 'Keeper deadline processing failed' }, { status: 500 })
  }
}

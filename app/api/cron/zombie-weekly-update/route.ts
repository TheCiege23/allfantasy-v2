import { NextRequest, NextResponse } from 'next/server'
import { requireCronAuth } from '../_auth'
import { triggerAllZombieWeeklyUpdates } from '@/lib/specialty-automation/handlers/zombieWeeklyUpdateHandler'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

/**
 * Orchestrates zombie league weekly updates across all active universes.
 * Runs twice per week:
 * - Monday 10am ET: NBA, MLB, NHL, NCAAB
 * - Tuesday 10am ET: NFL, SOCCER
 * - Sunday 10am ET: NCAAF
 * 
 * Triggers triggerAllZombieWeeklyUpdates() which coordinates multi-league
 * universes, posts announcements to league/universe chat, and updates standings.
 */
export async function GET(req: NextRequest) {
  if (!requireCronAuth(req)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }
  return run()
}

export async function POST(req: NextRequest) {
  if (!requireCronAuth(req)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }
  return run()
}

async function run() {
  const startedAt = new Date()
  
  try {
    const summary = await triggerAllZombieWeeklyUpdates()
    
    return NextResponse.json({
      ok: true,
      startedAt: startedAt.toISOString(),
      finishedAt: new Date().toISOString(),
      totalLeagues: summary.total,
      successful: summary.succeeded,
      failed: summary.failed,
      results: summary.results.slice(0, 100),
    })
  } catch (e) {
    const error = e instanceof Error ? e.message : 'unknown error'
    console.error('[cron/zombie-weekly-update]', error)
    return NextResponse.json({
      ok: false,
      error,
      startedAt: startedAt.toISOString(),
      finishedAt: new Date().toISOString(),
    }, { status: 500 })
  }
}

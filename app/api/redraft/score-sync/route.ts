import { NextResponse } from 'next/server'
import { runZombieAutomationTick } from '@/lib/zombie/zombieAutomation'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function POST() {
  // Placeholder: Rolling Insights / sport stats ingestion → PlayerWeeklyScore upserts.
  let zombie: { leaguesProcessed: number; errors: string[] } | null = null
  try {
    zombie = await runZombieAutomationTick()
  } catch {
    zombie = null
  }
  return NextResponse.json({
    updated: 0,
    matchupsRecalculated: 0,
    message: 'score-sync stub — connect stats provider',
    zombieAutomation: zombie,
  })
}

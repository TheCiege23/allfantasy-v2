import { NextRequest, NextResponse } from 'next/server'
import { requireCronAuth } from '@/app/api/cron/_auth'
import { handleStatCorrection } from '@/lib/guillotine/statCorrectionHandler'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * Full stat-correction *replay* (reverse chop, waiver recall, re-run `runEliminationCheck` with
 * `skipIfAlreadyProcessed: false`) lives in `handleStatCorrection` — wire when scores stabilize.
 */

export async function POST(req: NextRequest) {
  if (!requireCronAuth(req, 'CRON_SECRET')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { seasonId?: string; scoringPeriod?: number; correctedPlayerIds?: string[] }
  try {
    body = (await req.json()) as typeof body
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  if (!body.seasonId || body.scoringPeriod == null || !body.correctedPlayerIds) {
    return NextResponse.json({ error: 'seasonId, scoringPeriod, correctedPlayerIds required' }, { status: 400 })
  }

  const result = await handleStatCorrection(body.seasonId, body.scoringPeriod, body.correctedPlayerIds)
  return NextResponse.json(result)
}

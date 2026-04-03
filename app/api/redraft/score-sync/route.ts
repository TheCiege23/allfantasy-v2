import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function POST() {
  // Placeholder: Rolling Insights / sport stats ingestion → PlayerWeeklyScore upserts.
  return NextResponse.json({
    updated: 0,
    matchupsRecalculated: 0,
    message: 'score-sync stub — connect stats provider',
  })
}

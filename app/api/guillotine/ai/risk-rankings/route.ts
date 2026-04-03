import { NextRequest, NextResponse } from 'next/server'
import { generateLeagueRiskRankings } from '@/lib/guillotine/ai/eliminationRiskModel'
import { requireAfSub } from '@/lib/redraft/ai/requireAfSub'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

export async function POST(req: NextRequest) {
  const gate = await requireAfSub()
  if (gate instanceof Response) return gate

  let body: { seasonId?: string; scoringPeriod?: number }
  try {
    body = (await req.json()) as typeof body
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  if (!body.seasonId || body.scoringPeriod == null) {
    return NextResponse.json({ error: 'seasonId and scoringPeriod required' }, { status: 400 })
  }

  const rankings = await generateLeagueRiskRankings(body.seasonId, body.scoringPeriod)
  return NextResponse.json({ rankings })
}

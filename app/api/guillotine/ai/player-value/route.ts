import { NextRequest, NextResponse } from 'next/server'
import { getGuillotinePlayerValue } from '@/lib/guillotine/ai/playerValueModel'
import { requireAfSub } from '@/lib/redraft/ai/requireAfSub'
import { normalizeToSupportedSport } from '@/lib/sport-scope'

export const dynamic = 'force-dynamic'
export const maxDuration = 15

export async function POST(req: NextRequest) {
  const gate = await requireAfSub()
  if (gate instanceof Response) return gate

  let body: { playerId?: string; sport?: string; teamsActive?: number; scoringPeriod?: number }
  try {
    body = (await req.json()) as typeof body
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  if (!body.playerId || body.teamsActive == null || body.scoringPeriod == null) {
    return NextResponse.json({ error: 'playerId, teamsActive, scoringPeriod required' }, { status: 400 })
  }

  const value = await getGuillotinePlayerValue(
    body.playerId,
    normalizeToSupportedSport(body.sport ?? 'NFL'),
    body.teamsActive,
    body.scoringPeriod,
  )
  return NextResponse.json({ value })
}

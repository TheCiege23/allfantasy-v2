import { NextRequest, NextResponse } from 'next/server'
import { generateFloorLineupRec } from '@/lib/guillotine/ai/lineupFloorOptimizer'
import { requireAfSub } from '@/lib/redraft/ai/requireAfSub'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

export async function POST(req: NextRequest) {
  const gate = await requireAfSub()
  if (gate instanceof Response) return gate

  let body: { rosterId?: string; seasonId?: string; scoringPeriod?: number }
  try {
    body = (await req.json()) as typeof body
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  if (!body.rosterId || !body.seasonId || body.scoringPeriod == null) {
    return NextResponse.json({ error: 'rosterId, seasonId, scoringPeriod required' }, { status: 400 })
  }

  const rec = await generateFloorLineupRec(body.rosterId, body.seasonId, body.scoringPeriod)
  return NextResponse.json({ rec })
}

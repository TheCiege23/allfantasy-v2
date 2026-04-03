import { NextRequest, NextResponse } from 'next/server'
import { generateWeeklyHealthReport } from '@/lib/bestball/ai/weeklyHealthReport'
import { requireAfSub } from '@/lib/redraft/ai/requireAfSub'
import { normalizeToSupportedSport } from '@/lib/sport-scope'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

export async function POST(req: NextRequest) {
  const gate = await requireAfSub()
  if (gate instanceof Response) return gate

  let body: { rosterId?: string; leagueId?: string; week?: number; sport?: string }
  try {
    body = (await req.json()) as typeof body
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!body.rosterId || !body.leagueId || body.week == null) {
    return NextResponse.json({ error: 'rosterId, leagueId, week required' }, { status: 400 })
  }

  const report = await generateWeeklyHealthReport(
    body.rosterId,
    body.leagueId,
    body.week,
    normalizeToSupportedSport(body.sport ?? 'NFL'),
  )
  return NextResponse.json({ report })
}

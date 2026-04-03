import { NextRequest, NextResponse } from 'next/server'
import { generateStartSitRecs } from '@/lib/redraft/ai/startSitAnalyzer'
import { requireAfSub } from '@/lib/redraft/ai/requireAfSub'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

export async function POST(req: NextRequest) {
  const gate = await requireAfSub()
  if (gate instanceof Response) return gate

  let body: { rosterId?: string; week?: number; leagueId?: string }
  try {
    body = (await req.json()) as typeof body
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!body.rosterId || body.week == null || !body.leagueId) {
    return NextResponse.json({ error: 'rosterId, week, leagueId required' }, { status: 400 })
  }

  const recs = await generateStartSitRecs(body.rosterId, body.week, body.leagueId)
  return NextResponse.json({ recommendations: recs })
}

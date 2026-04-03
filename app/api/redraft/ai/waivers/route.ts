import { NextRequest, NextResponse } from 'next/server'
import { generateWaiverRecs } from '@/lib/redraft/ai/waiverAnalyzer'
import { requireAfSub } from '@/lib/redraft/ai/requireAfSub'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

export async function POST(req: NextRequest) {
  const gate = await requireAfSub()
  if (gate instanceof Response) return gate

  let body: { rosterId?: string; seasonId?: string; week?: number }
  try {
    body = (await req.json()) as typeof body
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!body.rosterId || !body.seasonId || body.week == null) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  const recs = await generateWaiverRecs(body.rosterId, body.seasonId, body.week)
  return NextResponse.json({ recommendations: recs })
}

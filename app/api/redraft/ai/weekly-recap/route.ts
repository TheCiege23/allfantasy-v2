import { NextRequest, NextResponse } from 'next/server'
import { generateWeeklyRecap } from '@/lib/redraft/ai/weeklyRecap'
import { requireAfSub } from '@/lib/redraft/ai/requireAfSub'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function POST(req: NextRequest) {
  const gate = await requireAfSub()
  if (gate instanceof Response) return gate

  let body: { seasonId?: string; week?: number }
  try {
    body = (await req.json()) as typeof body
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!body.seasonId || body.week == null) {
    return NextResponse.json({ error: 'seasonId and week required' }, { status: 400 })
  }

  const recap = await generateWeeklyRecap(body.seasonId, body.week)
  return NextResponse.json({ recap })
}

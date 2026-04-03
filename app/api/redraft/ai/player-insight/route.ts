import { NextRequest, NextResponse } from 'next/server'
import { generatePlayerInsight } from '@/lib/redraft/ai/playerInsights'
import { requireAfSub } from '@/lib/redraft/ai/requireAfSub'

export const dynamic = 'force-dynamic'
export const maxDuration = 15

export async function POST(req: NextRequest) {
  const gate = await requireAfSub()
  if (gate instanceof Response) return gate

  let body: { playerId?: string; sport?: string; week?: number }
  try {
    body = (await req.json()) as typeof body
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!body.playerId || !body.sport || body.week == null) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  const insight = await generatePlayerInsight(body.playerId, body.sport, body.week)
  return NextResponse.json({ insight })
}

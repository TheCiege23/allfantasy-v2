import { NextRequest, NextResponse } from 'next/server'
import { generateKeeperWaiverTargets } from '@/lib/keeper/ai/waiverKeeperScout'
import { requireAfSub } from '@/lib/redraft/ai/requireAfSub'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

export async function POST(req: NextRequest) {
  const gate = await requireAfSub()
  if (gate instanceof Response) return gate

  let body: { rosterId?: string; leagueId?: string; week?: number }
  try {
    body = (await req.json()) as typeof body
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!body.rosterId || !body.leagueId || body.week == null) {
    return NextResponse.json({ error: 'rosterId, leagueId, week required' }, { status: 400 })
  }

  const out = await generateKeeperWaiverTargets(body.rosterId, body.leagueId, body.week)
  return NextResponse.json({ recommendations: out })
}

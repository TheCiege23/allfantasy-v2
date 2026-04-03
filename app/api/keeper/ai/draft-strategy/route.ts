import { NextRequest, NextResponse } from 'next/server'
import { generateKeeperAwareDraftStrategy } from '@/lib/keeper/ai/keeperDraftStrategy'
import { requireAfSub } from '@/lib/redraft/ai/requireAfSub'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

export async function POST(req: NextRequest) {
  const gate = await requireAfSub()
  if (gate instanceof Response) return gate

  let body: { rosterId?: string; leagueId?: string; incomingSeasonId?: string }
  try {
    body = (await req.json()) as typeof body
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!body.rosterId || !body.leagueId || !body.incomingSeasonId) {
    return NextResponse.json({ error: 'rosterId, leagueId, incomingSeasonId required' }, { status: 400 })
  }

  const out = await generateKeeperAwareDraftStrategy(body.rosterId, body.leagueId, body.incomingSeasonId)
  return NextResponse.json(out)
}

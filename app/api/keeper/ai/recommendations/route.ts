import { NextRequest, NextResponse } from 'next/server'
import { generateKeeperRecommendations } from '@/lib/keeper/ai/keeperDecisionEngine'
import { requireAfSub } from '@/lib/redraft/ai/requireAfSub'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

export async function POST(req: NextRequest) {
  const gate = await requireAfSub()
  if (gate instanceof Response) return gate

  let body: { rosterId?: string; leagueId?: string; outgoingSeasonId?: string }
  try {
    body = (await req.json()) as typeof body
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!body.rosterId || !body.leagueId || !body.outgoingSeasonId) {
    return NextResponse.json({ error: 'rosterId, leagueId, outgoingSeasonId required' }, { status: 400 })
  }

  const out = await generateKeeperRecommendations(body.rosterId, body.leagueId, body.outgoingSeasonId)
  return NextResponse.json(out)
}

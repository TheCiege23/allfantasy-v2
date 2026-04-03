import { NextRequest, NextResponse } from 'next/server'
import { generateKeeperStrengthRankings } from '@/lib/keeper/ai/powerRankingsKeeper'
import { requireAfSub } from '@/lib/redraft/ai/requireAfSub'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

export async function POST(req: NextRequest) {
  const gate = await requireAfSub()
  if (gate instanceof Response) return gate

  let body: { leagueId?: string; seasonId?: string }
  try {
    body = (await req.json()) as typeof body
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!body.leagueId || !body.seasonId) {
    return NextResponse.json({ error: 'leagueId and seasonId required' }, { status: 400 })
  }

  const out = await generateKeeperStrengthRankings(body.leagueId, body.seasonId)
  return NextResponse.json({ rankings: out })
}

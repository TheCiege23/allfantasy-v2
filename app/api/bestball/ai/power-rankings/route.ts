import { NextRequest, NextResponse } from 'next/server'
import { generateBestBallPowerRankings } from '@/lib/bestball/ai/powerRankings'
import { requireAfSub } from '@/lib/redraft/ai/requireAfSub'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

export async function POST(req: NextRequest) {
  const gate = await requireAfSub()
  if (gate instanceof Response) return gate

  let body: { leagueId?: string; contestId?: string | null; week?: number }
  try {
    body = (await req.json()) as typeof body
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const leagueId = body.leagueId?.trim()
  if (!leagueId) return NextResponse.json({ error: 'leagueId required' }, { status: 400 })
  if (body.week == null) return NextResponse.json({ error: 'week required' }, { status: 400 })

  const rankings = await generateBestBallPowerRankings(leagueId, body.contestId ?? null, body.week)
  return NextResponse.json({ rankings })
}

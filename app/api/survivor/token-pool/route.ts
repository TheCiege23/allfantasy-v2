import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { assertLeagueMember } from '@/lib/league/league-access'
import {
  submitTokenPoolPick,
  getTokenPoolPicks,
  getTokenBalance,
  type TokenPoolPickInput,
} from '@/lib/survivor/tokenPoolEngine'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const leagueId = searchParams.get('leagueId')
  const week = searchParams.get('week')
  if (!leagueId) return NextResponse.json({ error: 'leagueId required' }, { status: 400 })
  const gate = await assertLeagueMember(leagueId, userId)
  if (!gate.ok) return NextResponse.json({ error: 'Forbidden' }, { status: gate.status })

  const [picks, balance] = await Promise.all([
    getTokenPoolPicks(leagueId, userId, week ? Number(week) : undefined),
    getTokenBalance(leagueId, userId),
  ])

  return NextResponse.json({ picks, balance })
}

export async function POST(req: NextRequest) {
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: Record<string, unknown>
  try {
    body = (await req.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const leagueId = typeof body.leagueId === 'string' ? body.leagueId : ''
  const week = typeof body.week === 'number' ? body.week : 0
  const sport = typeof body.sport === 'string' ? body.sport : ''
  const pickType = typeof body.pickType === 'string' ? body.pickType : ''
  const pick = typeof body.pick === 'object' && body.pick != null ? body.pick as Record<string, unknown> : {}

  if (!leagueId || !week || !sport || !pickType) {
    return NextResponse.json({ error: 'leagueId, week, sport, pickType required' }, { status: 400 })
  }
  const gate = await assertLeagueMember(leagueId, userId)
  if (!gate.ok) return NextResponse.json({ error: 'Forbidden' }, { status: gate.status })

  const validTypes = ['win_pick', 'over_under', 'prop_bet', 'exact_score']
  if (!validTypes.includes(pickType)) {
    return NextResponse.json({ error: `pickType must be one of: ${validTypes.join(', ')}` }, { status: 400 })
  }

  try {
    const result = await submitTokenPoolPick({
      leagueId,
      userId,
      week,
      sport,
      pickType: pickType as TokenPoolPickInput['pickType'],
      pick,
    })
    return NextResponse.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to submit pick'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}

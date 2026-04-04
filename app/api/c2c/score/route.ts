import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { assertLeagueMember } from '@/lib/league/league-access'
import { calculateC2CTeamScore } from '@/lib/c2c/scoringEngine'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const leagueId = req.nextUrl.searchParams.get('leagueId')?.trim()
  const matchupId = req.nextUrl.searchParams.get('matchupId')?.trim()
  const rosterId = req.nextUrl.searchParams.get('rosterId')?.trim()
  if (!leagueId || !matchupId || !rosterId) {
    return NextResponse.json({ error: 'leagueId, matchupId, rosterId required' }, { status: 400 })
  }

  const gate = await assertLeagueMember(leagueId, userId)
  if (!gate.ok) return NextResponse.json({ error: 'Forbidden' }, { status: gate.status })

  const row = await prisma.c2CMatchupScore.findUnique({
    where: { leagueId_matchupId_rosterId: { leagueId, matchupId, rosterId } },
  })
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ score: row })
}

export async function POST(req: NextRequest) {
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null
  const leagueId = typeof body?.leagueId === 'string' ? body.leagueId : ''
  const matchupId = typeof body?.matchupId === 'string' ? body.matchupId : ''
  const rosterId = typeof body?.rosterId === 'string' ? body.rosterId : ''
  const week = typeof body?.week === 'number' ? body.week : 1
  const season = typeof body?.season === 'number' ? body.season : new Date().getFullYear()
  if (!leagueId || !matchupId || !rosterId) {
    return NextResponse.json({ error: 'leagueId, matchupId, rosterId required' }, { status: 400 })
  }

  const gate = await assertLeagueMember(leagueId, userId)
  if (!gate.ok) return NextResponse.json({ error: 'Forbidden' }, { status: gate.status })

  try {
    const score = await calculateC2CTeamScore(leagueId, rosterId, matchupId, week, season)
    return NextResponse.json({ score })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}

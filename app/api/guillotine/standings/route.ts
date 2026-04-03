import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { assertLeagueMember } from '@/lib/league/league-access'
import { getSurvivalStandings } from '@/lib/guillotine/survivalStandings'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const seasonId = req.nextUrl.searchParams.get('seasonId')?.trim()
  const sp = Number(req.nextUrl.searchParams.get('scoringPeriod'))
  if (!seasonId || !Number.isFinite(sp)) {
    return NextResponse.json({ error: 'seasonId and scoringPeriod required' }, { status: 400 })
  }

  const g = await prisma.guillotineSeason.findFirst({ where: { id: seasonId } })
  if (!g) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const gate = await assertLeagueMember(g.leagueId, userId)
  if (!gate.ok) return NextResponse.json({ error: 'Forbidden' }, { status: gate.status })

  const standings = await getSurvivalStandings(seasonId, sp)
  return NextResponse.json({ standings })
}

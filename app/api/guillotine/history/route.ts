import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { assertLeagueMember } from '@/lib/league/league-access'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const seasonId = req.nextUrl.searchParams.get('seasonId')?.trim()
  const leagueId = req.nextUrl.searchParams.get('leagueId')?.trim()

  if (seasonId) {
    const g = await prisma.guillotineSeason.findFirst({ where: { id: seasonId } })
    if (!g) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    const gate = await assertLeagueMember(g.leagueId, userId)
    if (!gate.ok) return NextResponse.json({ error: 'Forbidden' }, { status: gate.status })

    const timeline = await prisma.guillotineElimination.findMany({
      where: { seasonId },
      orderBy: { scoringPeriod: 'desc' },
    })
    return NextResponse.json({ timeline })
  }

  if (leagueId) {
    const gate = await assertLeagueMember(leagueId, userId)
    if (!gate.ok) return NextResponse.json({ error: 'Forbidden' }, { status: gate.status })

    const seasons = await prisma.guillotineSeason.findMany({
      where: { leagueId },
      include: { eliminations: true },
    })
    return NextResponse.json({ seasons })
  }

  return NextResponse.json({ error: 'seasonId or leagueId required' }, { status: 400 })
}

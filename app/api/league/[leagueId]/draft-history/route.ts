import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'

import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(
  req: Request,
  { params }: { params: Promise<{ leagueId: string }> },
) {
  try {
    const session = (await getServerSession(authOptions as never)) as {
      user?: { id?: string }
    } | null
    const userId = session?.user?.id?.trim()
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { leagueId } = await params
    const id = leagueId?.trim()
    if (!id) {
      return NextResponse.json({ error: 'leagueId required' }, { status: 400 })
    }

    const url = new URL(req.url)
    const seasonParam = url.searchParams.get('season')
    const season = seasonParam ? Number.parseInt(seasonParam, 10) : null

    const where: { leagueId: string; season?: number } = { leagueId: id }
    if (season && Number.isFinite(season)) where.season = season

    const picks = await prisma.draftFact.findMany({
      where,
      orderBy: [{ season: 'desc' }, { round: 'asc' }, { pickNumber: 'asc' }],
      select: {
        draftId: true,
        season: true,
        round: true,
        pickNumber: true,
        playerId: true,
        managerId: true,
      },
    })

    const grouped = new Map<number, typeof picks>()
    for (const p of picks) {
      const y = p.season ?? 0
      const arr = grouped.get(y) ?? []
      arr.push(p)
      grouped.set(y, arr)
    }

    const seasons = Array.from(grouped.entries())
      .map(([year, ps]) => ({ year, picks: ps }))
      .sort((a, b) => b.year - a.year)

    return NextResponse.json({ seasons })
  } catch (e) {
    console.error('[api/league/[leagueId]/draft-history GET]', e)
    return NextResponse.json({ error: 'Failed to load draft history' }, { status: 500 })
  }
}

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createDemoRoster, DEMO_SOURCE_LABEL } from '@/lib/startSit/shared'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  const userId = typeof session?.user?.id === 'string' ? session.user.id : null

  const { searchParams } = new URL(req.url)
  const leagueId = searchParams.get('leagueId') || ''
  const sport = searchParams.get('sport') || 'nfl'
  const week = searchParams.get('week') || 'current'
  const format = searchParams.get('format') || 'PPR'

  if (!leagueId || leagueId === 'all' || !userId) {
    return NextResponse.json({
      players: createDemoRoster(sport, leagueId || 'demo', week),
      source: DEMO_SOURCE_LABEL,
      meta: { format, week, sport },
    })
  }

  const league = await prisma.league.findFirst({
    where: { id: leagueId, userId },
    select: {
      id: true,
      name: true,
      sport: true,
      rosters: { select: { playerData: true } },
    },
  })

  if (!league?.rosters?.length) {
    return NextResponse.json({
      players: createDemoRoster(sport, league?.name ?? leagueId, week),
      source: DEMO_SOURCE_LABEL,
      meta: { format, week },
    })
  }

  const names: string[] = []
  for (const r of league.rosters) {
    const pd = r.playerData
    if (pd && typeof pd === 'object' && !Array.isArray(pd)) {
      const o = pd as Record<string, unknown>
      const players = o.players
      if (Array.isArray(players)) {
        for (const p of players.slice(0, 24)) {
          if (typeof p === 'string') names.push(p)
          else if (p && typeof p === 'object') {
            const row = p as Record<string, unknown>
            if (typeof row.full_name === 'string') names.push(row.full_name)
            else if (typeof row.name === 'string') names.push(row.name)
          }
        }
      }
    }
  }

  if (names.length === 0) {
    return NextResponse.json({
      players: createDemoRoster(sport, league.name ?? league.id, week),
      source: DEMO_SOURCE_LABEL,
    })
  }

  const players = names.slice(0, 12).map((name, i) => ({
    id: `${league.id}-p-${i}`,
    name,
    position: ['QB', 'RB', 'WR', 'TE', 'FLEX'][i % 5],
    team: '—',
    opponent: 'TBD',
    projected: 12 + (i % 8),
    floor: 6 + (i % 5),
    ceiling: 22 + (i % 15),
    confidence: 60 + (i % 30),
    trend: 'flat' as const,
    status: 'Active',
    note: 'Parsed from linked league roster; projections are illustrative until fully wired.',
    matchupRank: 15 + i,
  }))

  return NextResponse.json({
    players,
    source: 'AllFantasy league roster + demo projections',
    meta: { format, week },
  })
}

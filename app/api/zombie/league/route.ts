import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createZombieLeague } from '@/lib/zombie/setupEngine'
import { normalizeToSupportedSport } from '@/lib/sport-scope'
import { getLeagueRole } from '@/lib/league/permissions'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>
  const leagueId = typeof body.leagueId === 'string' ? body.leagueId : null
  if (!leagueId) return NextResponse.json({ error: 'leagueId required' }, { status: 400 })

  const sport = normalizeToSupportedSport(typeof body.sport === 'string' ? body.sport : 'NFL')
  const universeId = typeof body.universeId === 'string' ? body.universeId : undefined
  const tierId = typeof body.tierId === 'string' ? body.tierId : undefined

  const row = await createZombieLeague(
    {
      leagueId,
      name: typeof body.name === 'string' ? body.name : null,
      sport,
      teamCount: typeof body.teamCount === 'number' ? body.teamCount : 20,
      isPaid: Boolean(body.isPaid),
      buyInAmount: typeof body.buyIn === 'number' ? body.buyIn : null,
      whispererSelectionMode:
        typeof body.whispererSelectionMode === 'string' ? body.whispererSelectionMode : 'random',
      namingMode: typeof body.namingMode === 'string' ? body.namingMode : 'hybrid',
    },
    universeId ?? null,
    tierId ?? null,
  )

  return NextResponse.json({ zombieLeague: row })
}

export async function GET(req: Request) {
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const leagueId = searchParams.get('leagueId')
  if (!leagueId) return NextResponse.json({ error: 'leagueId required' }, { status: 400 })

  const z = await prisma.zombieLeague.findUnique({
    where: { leagueId },
    include: {
      teams: true,
      whispererRecord: true,
      weeklyResolutions: { orderBy: { week: 'desc' }, take: 4 },
      announcements: { orderBy: { createdAt: 'desc' }, take: 24 },
    },
  })
  if (!z) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const horde = z.teams.filter((t) => t.status === 'Zombie').length
  const surv = z.teams.filter((t) => t.status === 'Survivor').length

  const roster = await prisma.roster.findFirst({
    where: { leagueId, platformUserId: session.user.id },
    select: { id: true },
  })
  const myTeam = roster ? (z.teams.find((t) => t.rosterId === roster.id) ?? null) : null

  let myActiveItemCount = 0
  if (myTeam) {
    myActiveItemCount = await prisma.zombieTeamItem.count({
      where: { teamStatusId: myTeam.id, isUsed: false, isExpired: false },
    })
  }

  const role = await getLeagueRole(leagueId, session.user.id)

  return NextResponse.json({
    league: z,
    hordeSize: horde,
    survivorCount: surv,
    myTeam,
    myActiveItemCount,
    viewerIsCommissioner: role === 'commissioner',
  })
}

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
  const leagueId = searchParams?.get('leagueId')
  if (!leagueId) return NextResponse.json({ error: 'leagueId required' }, { status: 400 })

  const z = await prisma.zombieLeague.findUnique({
    where: { leagueId },
    include: {
      teams: true,
      level: true,
      whispererRecord: true,
      paidConfig: true,
      freeRewardConfig: true,
      weeklyResolutions: { orderBy: { week: 'desc' }, take: 4 },
      announcements: { orderBy: { createdAt: 'desc' }, take: 24 },
    },
  })
  if (!z) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const config = await prisma.zombieLeagueConfig.findUnique({
    where: { leagueId },
  })

  const counts = z.teams.reduce(
    (acc, team) => {
      const status = String(team.status ?? '').toLowerCase()
      if (status.includes('whisperer')) acc.whisperer += 1
      else if (status.includes('zombie')) acc.zombie += 1
      else if (status.includes('revived')) acc.revived += 1
      else if (status.includes('eliminat') || status.includes('dead')) acc.eliminated += 1
      else acc.survivor += 1
      return acc
    },
    { survivor: 0, zombie: 0, whisperer: 0, revived: 0, eliminated: 0 },
  )
  const horde = counts.zombie + counts.whisperer
  const surv = counts.survivor + counts.revived

  const roster = await prisma.roster.findFirst({
    where: { leagueId, platformUserId: session.user.id },
    select: { id: true },
  })
  const myTeam = roster ? (z.teams.find((t) => t.rosterId === roster.id) ?? null) : null

  let myActiveItemCount = 0
  let myPendingItemCount = 0
  let mySerumCount = 0
  let myWeaponCount = 0
  if (myTeam) {
    const myItems = await prisma.zombieTeamItem.findMany({
      where: { teamStatusId: myTeam.id },
      select: {
        itemType: true,
        isUsed: true,
        isExpired: true,
        activationState: true,
      },
    })
    const activeItems = myItems.filter((item) => !item.isUsed && !item.isExpired)
    myActiveItemCount = activeItems.length
    myPendingItemCount = activeItems.filter((item) => item.activationState === 'pending_activation').length
    mySerumCount = activeItems.filter((item) => item.itemType.toLowerCase().includes('serum')).length
    myWeaponCount = activeItems.filter((item) => !item.itemType.toLowerCase().includes('serum')).length
  }

  const role = await getLeagueRole(leagueId, session.user.id)
  const commissionerNotifications = role === 'commissioner'
    ? await prisma.zombieCommissionerNotification.findMany({
        where: { leagueId, commissionerId: session.user.id },
        orderBy: { createdAt: 'desc' },
        take: 12,
      })
    : []

  const unreadNotifications = commissionerNotifications.filter((row) => !row.isRead).length
  const actionRequiredNotifications = commissionerNotifications.filter((row) => row.requiresAction).length

  const latestResolution = z.weeklyResolutions[0] ?? null
  const latestWeek = latestResolution?.week ?? Math.max(1, z.currentWeek || 1)
  const recentInfections = await prisma.zombieInfectionEvent.findMany({
    where: { zombieLeagueId: z.id },
    orderBy: { createdAt: 'desc' },
    take: 6,
  })
  const recentBashings = await prisma.zombieBashingEvent.findMany({
    where: { leagueId },
    orderBy: { createdAt: 'desc' },
    take: 4,
  })
  const recentMaulings = await prisma.zombieMaulingEvent.findMany({
    where: { leagueId },
    orderBy: { createdAt: 'desc' },
    take: 4,
  })

  const topPerformers = [...z.teams]
    .sort((a, b) => {
      if (b.pointsFor !== a.pointsFor) return b.pointsFor - a.pointsFor
      return b.wins - a.wins
    })
    .slice(0, 5)

  const dangerZone = [...z.teams]
    .filter((team) => {
      const status = String(team.status ?? '').toLowerCase()
      return status.includes('survivor') || status.includes('revived')
    })
    .sort((a, b) => {
      if (a.wins !== b.wins) return a.wins - b.wins
      if (a.pointsFor !== b.pointsFor) return a.pointsFor - b.pointsFor
      return b.pointsAgainst - a.pointsAgainst
    })
    .slice(0, 5)

  return NextResponse.json({
    league: {
      ...z,
      counts: {
        ...counts,
        horde: horde,
        alive: surv,
        total: z.teams.length,
      },
      level: z.level
        ? {
            id: z.level.id,
            name: z.level.name,
            rankOrder: z.level.rankOrder,
            colorHex: z.level.colorHex,
            difficultyLabel: z.level.difficultyLabel,
            tierTheme: z.level.tierTheme,
          }
        : null,
      config,
      latestResolution,
      topPerformers,
      dangerZone,
      recentInfections,
      recentBashings,
      recentMaulings,
    },
    hordeSize: horde,
    survivorCount: surv,
    myTeam,
    myActiveItemCount,
    myPendingItemCount,
    myResources: {
      serums: mySerumCount,
      weapons: myWeaponCount,
      activeItems: myActiveItemCount,
      pendingItems: myPendingItemCount,
    },
    viewerIsCommissioner: role === 'commissioner',
    latestWeek,
    commissionerNotifications: {
      unread: unreadNotifications,
      actionRequired: actionRequiredNotifications,
      recent: commissionerNotifications,
    },
  })
}


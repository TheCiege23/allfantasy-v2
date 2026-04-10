import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/** Aggregate universe + leagues + leaderboard + movement history for Zombie Hub UI. */
export async function GET(req: Request) {
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const universeId = searchParams.get('universeId')
  if (!universeId) return NextResponse.json({ error: 'universeId required' }, { status: 400 })

  const u = await prisma.zombieUniverse.findUnique({
    where: { id: universeId },
    include: {
      levels: { orderBy: { rankOrder: 'asc' } },
      leagues: {
        include: {
          teams: true,
          whispererRecord: true,
          level: true,
        },
      },
    },
  })
  if (!u) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Aggregate counts
  let survivorCount = 0
  let zombieCount = 0
  let whispererCount = 0
  for (const z of u.leagues) {
    if (z.whispererRecord) whispererCount += 1
    for (const t of z.teams) {
      const s = (t.status ?? '').toLowerCase()
      if (s.includes('zombie')) zombieCount += 1
      else if (s.includes('survivor') || s.includes('revived')) survivorCount += 1
    }
  }

  // Tier breakdown
  const tiers = u.levels.map((level) => {
    const tierLeagues = u.leagues.filter((l) => l.levelId === level.id)
    let tierSurvivors = 0
    let tierZombies = 0
    for (const tl of tierLeagues) {
      for (const t of tl.teams) {
        const s = (t.status ?? '').toLowerCase()
        if (s.includes('zombie')) tierZombies += 1
        else if (s.includes('survivor') || s.includes('revived')) tierSurvivors += 1
      }
    }
    return {
      name: level.tierLabel ?? level.name,
      rankOrder: level.rankOrder,
      leagueCount: tierLeagues.length,
      survivorCount: tierSurvivors,
      zombieCount: tierZombies,
    }
  })

  // Event animations
  const animations = await prisma.zombieEventAnimation.findMany({
    where: { leagueId: { in: u.leagues.map((l) => l.leagueId) } },
    orderBy: { createdAt: 'desc' },
    take: 20,
  })

  // Announcements
  const announcements = await prisma.zombieAnnouncement.findMany({
    where: { universeId },
    orderBy: { createdAt: 'desc' },
    take: 20,
  })

  // Top by PPW (from universe stats)
  const season = new Date().getFullYear()
  const stats = await prisma.zombieUniverseStat.findMany({
    where: { universeId, season },
    orderBy: { currentSeasonPPW: 'desc' },
    take: 30,
  })

  // Build leaderboard from league teams + infection/combat events
  const leaderboard = await buildLeaderboard(u.leagues, universeId, season)

  // Movement history
  const movements = await prisma.zombieMovementRecord.findMany({
    where: { universeId },
    orderBy: { createdAt: 'desc' },
    take: 50,
  }).catch(() => [])

  return NextResponse.json({
    universe: {
      name: u.name,
      sport: u.sport,
      leagues: u.leagues.map((l) => ({
        leagueId: l.leagueId,
        name: l.name,
        levelId: l.levelId,
      })),
    },
    counts: { survivorCount, zombieCount, whispererCount, leagueCount: u.leagues.length },
    animations,
    announcements,
    topByPpw: stats.slice(0, 10).map((s) => ({
      displayName: s.displayName,
      leagueName: s.leagueName ?? '',
      currentSeasonPPW: s.currentSeasonPPW,
      currentStatus: s.currentStatus,
    })),
    leaderboard,
    movements,
    tiers,
  })
}

async function buildLeaderboard(
  leagues: Array<{
    leagueId: string
    name: string | null
    teams: Array<{
      rosterId: string
      status: string | null
      wins: number | null
      losses: number | null
      pointsFor: number | null
      displayName: string | null
      isWhisperer: boolean
    }>
    level: { tierLabel: string | null; name: string } | null
  }>,
  universeId: string,
  _season: number,
) {
  const rows: Array<{
    userId: string
    displayName: string
    leagueName: string
    leagueId: string
    tierLabel: string | null
    currentStatus: string
    isWhisperer: boolean
    wins: number
    losses: number
    pointsFor: number
    ppw: number
    winPct: number
    infectionsInflicted: number
    infectionsReceived: number
    weekSurvived: number
    serumsUsed: number
    weaponsUsed: number
    bashingsWon: number
    maulingsWon: number
    revivals: number
    universeRank: number | null
  }> = []

  // Fetch infection counts per league
  const leagueIds = leagues.map((l) => l.leagueId)
  const infections = await prisma.zombieInfectionEvent.groupBy({
    by: ['infectorUserId'],
    where: { zombieLeagueId: { in: leagueIds } },
    _count: { id: true },
  }).catch(() => [])
  const infectedBy = new Map<string, number>()
  for (const r of infections) {
    if (r.infectorUserId) infectedBy.set(r.infectorUserId, (infectedBy.get(r.infectorUserId) ?? 0) + r._count.id)
  }

  const infectionsReceived = await prisma.zombieInfectionEvent.groupBy({
    by: ['victimUserId'],
    where: { zombieLeagueId: { in: leagueIds } },
    _count: { id: true },
  }).catch(() => [])
  const infRecvMap = new Map<string, number>()
  for (const r of infectionsReceived) {
    if (r.victimUserId) infRecvMap.set(r.victimUserId, (infRecvMap.get(r.victimUserId) ?? 0) + r._count.id)
  }

  // Bashings won
  const bashings = await prisma.zombieBashingEvent.groupBy({
    by: ['winnerUserId'],
    where: { leagueId: { in: leagueIds } },
    _count: { id: true },
  }).catch(() => [])
  const bashMap = new Map<string, number>()
  for (const r of bashings) bashMap.set(r.winnerUserId, (bashMap.get(r.winnerUserId) ?? 0) + r._count.id)

  // Maulings won
  const maulings = await prisma.zombieMaulingEvent.groupBy({
    by: ['maulerUserId'],
    where: { leagueId: { in: leagueIds } },
    _count: { id: true },
  }).catch(() => [])
  const maulMap = new Map<string, number>()
  for (const r of maulings) maulMap.set(r.maulerUserId, (maulMap.get(r.maulerUserId) ?? 0) + r._count.id)

  const rosterIds = leagues.flatMap((z) => z.teams.map((t) => t.rosterId))
  const rosters = await prisma.roster.findMany({
    where: { id: { in: rosterIds } },
    select: { id: true, platformUserId: true },
  }).catch(() => [])
  const rosterUserById = new Map(rosters.map((r) => [r.id, r.platformUserId]))

  for (const z of leagues) {
    for (const t of z.teams) {
      const userId = rosterUserById.get(t.rosterId) ?? t.rosterId
      const wins = t.wins ?? 0
      const losses = t.losses ?? 0
      const played = wins + losses
      const ppw = played > 0 ? (t.pointsFor ?? 0) / played : 0
      const winPct = played > 0 ? wins / played : 0
      const status = (t.status ?? 'Survivor').toLowerCase()
      const weekSurvived = status.includes('zombie') ? 0 : played

      rows.push({
        userId,
        displayName: t.displayName ?? userId,
        leagueName: z.name ?? z.leagueId,
        leagueId: z.leagueId,
        tierLabel: z.level?.tierLabel ?? z.level?.name ?? null,
        currentStatus: t.status ?? 'Survivor',
        isWhisperer: t.isWhisperer,
        wins,
        losses,
        pointsFor: t.pointsFor ?? 0,
        ppw,
        winPct,
        infectionsInflicted: infectedBy.get(userId) ?? 0,
        infectionsReceived: infRecvMap.get(userId) ?? 0,
        weekSurvived,
        serumsUsed: 0,
        weaponsUsed: 0,
        bashingsWon: bashMap.get(userId) ?? 0,
        maulingsWon: maulMap.get(userId) ?? 0,
        revivals: 0,
        universeRank: null,
      })
    }
  }

  // Rank by PPW
  rows.sort((a, b) => b.ppw - a.ppw)
  rows.forEach((r, i) => { r.universeRank = i + 1 })

  return rows
}

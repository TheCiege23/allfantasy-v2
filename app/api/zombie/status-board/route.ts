import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getLeagueRole } from '@/lib/league/permissions'
import { getZombieStatusCadence } from '@/lib/zombie/zombie-status-cadence'

export const dynamic = 'force-dynamic'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export async function GET(req: Request) {
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const leagueId = searchParams.get('leagueId')
  if (!leagueId) return NextResponse.json({ error: 'leagueId required' }, { status: 400 })

  const role = await getLeagueRole(leagueId, userId)
  if (!role) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const z = await prisma.zombieLeague.findUnique({
    where: { leagueId },
    include: {
      weeklyResolutions: { orderBy: { week: 'desc' }, take: 8 },
      level: true,
    },
  })
  if (!z) return NextResponse.json({ error: 'Zombie league not found' }, { status: 404 })

  const cadence = getZombieStatusCadence(z.sport)
  const dayIdx = z.weeklyUpdateDay
  const dayLabel = typeof dayIdx === 'number' && dayIdx >= 0 && dayIdx < 7 ? DAYS[dayIdx] : null
  const hourLabel = typeof z.weeklyUpdateHour === 'number' ? `${z.weeklyUpdateHour}:00 UTC` : null
  const scheduleHint =
    dayLabel && hourLabel
      ? `Auto-post target: ${dayLabel} ${hourLabel} (if enabled).`
      : dayLabel
        ? `Weekly update weekday: ${dayLabel} (set hour in Zombie settings).`
        : 'Set weekly update day/hour in Zombie settings for a consistent board cadence.'

  return NextResponse.json({
    sport: z.sport,
    tierLabel: z.level?.tierLabel ?? null,
    currentWeek: z.currentWeek,
    totalWeeks: z.totalWeeks,
    weeklyUpdate: {
      day: z.weeklyUpdateDay,
      hour: z.weeklyUpdateHour,
      autoPost: z.weeklyUpdateAutoPost,
      approval: z.weeklyUpdateApproval,
      includeProjections: z.updateIncludeProjections,
      includeMoney: z.updateIncludeMoney,
      includeInventory: z.updateIncludeInventory,
      includeUniverse: z.updateIncludeUniverse,
      includeDanger: z.updateIncludeDanger,
    },
    cadence,
    scheduleHint,
    recentResolutions: z.weeklyResolutions.map((w) => ({
      id: w.id,
      week: w.week,
      status: w.status,
      hordeSize: w.hordeSize,
      survivorCount: w.survivorCount,
      weeklyWinningsPool: w.weeklyWinningsPool,
      resolvedAt: w.resolvedAt,
      createdAt: w.createdAt,
    })),
  })
}

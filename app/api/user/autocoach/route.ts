import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { requireEntitlement } from '@/lib/subscription/requireEntitlement'
import { assertLeagueMember } from '@/lib/league/league-access'
import { isBestBallLeague } from '@/lib/autocoach/AutoCoachEngine'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const profile = await prisma.userProfile.findUnique({
    where: { userId },
    select: { autoCoachGlobalEnabled: true },
  })

  const settings = await prisma.autoCoachSetting.findMany({
    where: { userId },
    include: {
      league: {
        select: {
          id: true,
          name: true,
          autoCoachEnabled: true,
          leagueVariant: true,
          bestBallMode: true,
        },
      },
    },
    orderBy: { updatedAt: 'desc' },
  })

  return NextResponse.json({
    globalEnabled: profile?.autoCoachGlobalEnabled ?? true,
    settings: settings.map((s) => ({
      id: s.id,
      leagueId: s.leagueId,
      enabled: s.enabled,
      blockedByCommissioner: s.blockedByCommissioner,
      lastRunAt: s.lastRunAt?.toISOString() ?? null,
      lastSwapAt: s.lastSwapAt?.toISOString() ?? null,
      totalSwapsMade: s.totalSwapsMade,
      league: s.league,
    })),
  })
}

export async function POST(req: NextRequest) {
  const ent = await requireEntitlement('pro_autocoach')
  if (typeof ent !== 'string') return ent

  const userId = ent
  let body: { leagueId?: string; enabled?: boolean }
  try {
    body = (await req.json()) as { leagueId?: string; enabled?: boolean }
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const leagueId = typeof body.leagueId === 'string' ? body.leagueId.trim() : ''
  if (!leagueId) return NextResponse.json({ error: 'leagueId required' }, { status: 400 })
  const enabled = body.enabled === true

  const gate = await assertLeagueMember(leagueId, userId)
  if (!gate.ok) {
    return NextResponse.json({ error: gate.status === 404 ? 'League not found' : 'Forbidden' }, { status: gate.status })
  }

  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    select: { leagueVariant: true, bestBallMode: true, autoCoachEnabled: true },
  })
  if (!league) return NextResponse.json({ error: 'League not found' }, { status: 404 })

  if (isBestBallLeague(league.leagueVariant, league.bestBallMode)) {
    return NextResponse.json(
      { error: 'AutoCoach is not available for Best Ball leagues.' },
      { status: 400 }
    )
  }

  if (league.autoCoachEnabled === false) {
    return NextResponse.json({ error: 'AutoCoach is disabled by the league commissioner.' }, { status: 403 })
  }

  const row = await prisma.autoCoachSetting.upsert({
    where: { userId_leagueId: { userId, leagueId } },
    create: {
      userId,
      leagueId,
      enabled,
      blockedByCommissioner: false,
    },
    update: { enabled },
  })

  return NextResponse.json({
    id: row.id,
    leagueId: row.leagueId,
    enabled: row.enabled,
    blockedByCommissioner: row.blockedByCommissioner,
  })
}

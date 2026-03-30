import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { assertCommissioner } from '@/lib/commissioner/permissions'
import { isOrphanPlatformUserId } from '@/lib/orphan-ai-manager/orphanRosterResolver'
import { trackDiscoveryOrphanAdoption } from '@/lib/discovery-analytics/server'

type SessionWithUser = { user?: { id?: string } } | null

/** GET: list managers/rosters. DELETE: remove manager. PATCH: assign user to roster (orphan adoption). */
export async function GET(
  _req: NextRequest,
  { params }: { params: { leagueId: string } }
) {
  const session = (await getServerSession(authOptions as any)) as SessionWithUser
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    await assertCommissioner(params.leagueId, userId)
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const [teams, rosters] = await Promise.all([
    prisma.leagueTeam.findMany({
      where: { leagueId: params.leagueId },
      select: { id: true, externalId: true, ownerName: true, teamName: true, avatarUrl: true },
    }),
    prisma.roster.findMany({
      where: { leagueId: params.leagueId },
      select: { id: true, platformUserId: true },
    }),
  ])
  const candidateUserIds = Array.from(
    new Set(rosters.map((r) => r.platformUserId).filter((id): id is string => Boolean(id))),
  )
  const appUsers = candidateUserIds.length
    ? await prisma.appUser.findMany({
        where: { id: { in: candidateUserIds } },
        select: { id: true, username: true, displayName: true },
      })
    : []
  const appUserById = new Map(appUsers.map((u) => [u.id, u]))
  const teamByExtId = new Map(teams.map((t) => [t.externalId, t]))
  const managers = rosters.map((r) => {
    const team = teamByExtId.get(r.platformUserId) ?? teamByExtId.get(r.id)
    const appUser = r.platformUserId ? appUserById.get(r.platformUserId) : null
    return {
      rosterId: r.id,
      userId: r.platformUserId,
      username: appUser?.username ?? null,
      displayName: team?.ownerName ?? appUser?.displayName ?? team?.teamName ?? r.platformUserId,
    }
  })

  return NextResponse.json({
    teams,
    rosters: rosters.map((r) => ({ id: r.id, platformUserId: r.platformUserId })),
    managers,
  })
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { leagueId: string } }
) {
  const session = (await getServerSession(authOptions as any)) as SessionWithUser
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    await assertCommissioner(params.leagueId, userId)
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const rosterId = req.nextUrl.searchParams.get('rosterId') ?? (await req.json().catch(() => ({}))).rosterId
  if (!rosterId) return NextResponse.json({ error: 'rosterId required' }, { status: 400 })

  const roster = await (prisma as any).roster.findFirst({
    where: { id: rosterId, leagueId: params.leagueId },
    select: { id: true, platformUserId: true },
  })
  if (!roster) {
    return NextResponse.json({ error: 'Roster not found or does not belong to this league' }, { status: 404 })
  }

  // Mark as orphan: set platformUserId to a unique placeholder so the slot is preserved but no user is linked.
  const orphanId = `orphan-${roster.id}`
  await (prisma as any).roster.update({
    where: { id: rosterId },
    data: { platformUserId: orphanId },
  })
  await prisma.leagueTeam.updateMany({
    where: {
      leagueId: params.leagueId,
      OR: [{ externalId: roster.id }, { externalId: roster.platformUserId }],
    },
    data: {
      externalId: roster.id,
    },
  })

  return NextResponse.json({
    status: 'ok',
    message: 'Manager removed; roster slot marked as orphan. Re-add a manager via platform or future invite flow.',
    rosterId,
  })
}

/** PATCH: assign a user to a roster (e.g. adopt orphan team). Body: { rosterId, userId }. */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ leagueId: string }> }
) {
  const session = (await getServerSession(authOptions as any)) as SessionWithUser
  const commissionerId = session?.user?.id
  if (!commissionerId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { leagueId } = await params
  try {
    await assertCommissioner(leagueId, commissionerId)
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json().catch(() => ({}))
  const rosterId = body?.rosterId ?? null
  const userId = body?.userId ?? null
  if (!rosterId || !userId) {
    return NextResponse.json({ error: 'rosterId and userId required' }, { status: 400 })
  }

  const roster = await (prisma as any).roster.findFirst({
    where: { id: rosterId, leagueId },
    select: { id: true, platformUserId: true },
  })
  if (!roster) {
    return NextResponse.json({ error: 'Roster not found or does not belong to this league' }, { status: 404 })
  }

  const wasOrphan = isOrphanPlatformUserId(roster.platformUserId)

  await (prisma as any).roster.update({
    where: { id: rosterId },
    data: { platformUserId: userId },
  })

  const profile = await prisma.userProfile.findFirst({
    where: { userId },
    select: { displayName: true, sleeperUsername: true },
  })
  const displayName = profile?.displayName?.trim() || profile?.sleeperUsername?.trim() || userId
  await prisma.leagueTeam.updateMany({
    where: {
      leagueId,
      OR: [{ externalId: roster.id }, { externalId: roster.platformUserId }, { externalId: userId }],
    },
    data: {
      externalId: roster.id,
      ownerName: displayName,
    },
  })

  if (wasOrphan) {
    await trackDiscoveryOrphanAdoption(
      { leagueId, rosterId, userId },
      { commissionerId, source: 'managers_route' }
    )
  }

  return NextResponse.json({ status: 'ok', rosterId, userId })
}

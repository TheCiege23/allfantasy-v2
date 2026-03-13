import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { assertCommissioner } from '@/lib/commissioner/permissions'

type SessionWithUser = { user?: { id?: string } } | null

/** GET: list managers/rosters. DELETE: remove manager (stub – platform may handle). */
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

  const teams = await prisma.leagueTeam.findMany({
    where: { leagueId: params.leagueId },
    select: { id: true, externalId: true, ownerName: true, teamName: true, avatarUrl: true },
  })
  const rosters = await prisma.roster.findMany({
    where: { leagueId: params.leagueId },
    select: { id: true, platformUserId: true },
  })

  return NextResponse.json({
    teams,
    rosters: rosters.map((r) => ({ id: r.id, platformUserId: r.platformUserId })),
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

  return NextResponse.json({
    status: 'ok',
    message: 'Manager removed; roster slot marked as orphan. Re-add a manager via platform or future invite flow.',
    rosterId,
  })
}

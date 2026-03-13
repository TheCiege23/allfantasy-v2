import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { assertCommissioner } from '@/lib/commissioner/permissions'
import { getRosterPlayerIds } from '@/lib/waiver-wire/roster-utils'

/** GET: list rosters that may be invalid per current rules (stub: returns empty or minimal).
 * POST: set lineup lock rules in settings; force_correct not implemented (platform-dependent).
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: { leagueId: string } }
) {
  const session = await getServerSession(authOptions as any)
  const userId = (session?.user as any)?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    await assertCommissioner(params.leagueId, userId)
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const league = await prisma.league.findUnique({
    where: { id: params.leagueId },
    select: { settings: true, rosters: { select: { id: true, platformUserId: true } } },
  })
  if (!league) return NextResponse.json({ error: 'League not found' }, { status: 404 })

  const settings = (league.settings as Record<string, unknown>) || {}
  const lineupLockRule = settings.lineupLockRule ?? null

  return NextResponse.json({
    lineupLockRule,
    invalidRosters: [],
    message: 'Invalid roster detection depends on platform sync and lock rules. Use lineup lock rule in league settings.',
  })
}

export async function POST(
  req: NextRequest,
  { params }: { params: { leagueId: string } }
) {
  const session = await getServerSession(authOptions as any)
  const userId = (session?.user as any)?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    await assertCommissioner(params.leagueId, userId)
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json().catch(() => ({}))
  const lineupLockRule = body.lineupLockRule
  const forceCorrectRosterId = body.forceCorrectRosterId

  if (forceCorrectRosterId) {
    const roster = await (prisma as any).roster.findFirst({
      where: { id: forceCorrectRosterId, leagueId: params.leagueId },
      select: { id: true, playerData: true },
    })
    if (!roster) {
      return NextResponse.json({ error: 'Roster not found or does not belong to this league' }, { status: 404 })
    }
    const league = await prisma.league.findUnique({
      where: { id: params.leagueId },
      select: { rosterSize: true },
    })
    const rosterSize = league?.rosterSize ?? 20
    const playerIds = getRosterPlayerIds(roster.playerData)
    if (playerIds.length <= rosterSize) {
      return NextResponse.json({
        status: 'ok',
        message: 'Roster is already within size limit; no change made.',
        rosterId: forceCorrectRosterId,
      })
    }
    const trimmed = playerIds.slice(0, rosterSize)
    const newPlayerData = Array.isArray(roster.playerData) ? trimmed : { ...(roster.playerData as object), players: trimmed }
    await (prisma as any).roster.update({
      where: { id: forceCorrectRosterId },
      data: { playerData: newPlayerData },
    })
    return NextResponse.json({
      status: 'ok',
      message: `Roster trimmed from ${playerIds.length} to ${rosterSize} players.`,
      rosterId: forceCorrectRosterId,
    })
  }

  const league = await prisma.league.findUnique({
    where: { id: params.leagueId },
    select: { settings: true },
  })
  if (!league) return NextResponse.json({ error: 'League not found' }, { status: 404 })

  const settings = (league.settings as Record<string, unknown>) || {}
  const updated = await prisma.league.update({
    where: { id: params.leagueId },
    data: {
      settings: { ...settings, ...(lineupLockRule !== undefined && { lineupLockRule }) },
    },
    select: { id: true, settings: true },
  })
  return NextResponse.json(updated)
}

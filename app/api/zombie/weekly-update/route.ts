import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { requireCommissionerOnly } from '@/lib/league/permissions'
import { buildWeeklyUpdate, composeWeeklyUpdateBody } from '@/lib/zombie/weeklyUpdateEngine'

export const dynamic = 'force-dynamic'

/** Preview draft (commissioner). */
export async function GET(req: Request) {
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const leagueId = searchParams.get('leagueId')
  const week = searchParams.get('week')
  if (!leagueId) return NextResponse.json({ error: 'leagueId required' }, { status: 400 })
  const w = week ? parseInt(week, 10) : NaN
  if (!Number.isFinite(w)) return NextResponse.json({ error: 'week required' }, { status: 400 })

  await requireCommissionerOnly(leagueId, session.user.id)
  const draft = await buildWeeklyUpdate(leagueId, w)
  return NextResponse.json({ draft })
}

/** Approve & post pending weekly update (when weeklyUpdateApproval was true, optional flow). */
export async function POST(req: Request) {
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>
  const leagueId = typeof body.leagueId === 'string' ? body.leagueId : null
  const week = typeof body.week === 'number' ? body.week : parseInt(String(body.week), 10)
  if (!leagueId || !Number.isFinite(week)) {
    return NextResponse.json({ error: 'leagueId and week required' }, { status: 400 })
  }

  await requireCommissionerOnly(leagueId, session.user.id)

  const z = await prisma.zombieLeague.findUnique({ where: { leagueId } })
  if (!z) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const pending = await prisma.zombieAnnouncement.findFirst({
    where: { zombieLeagueId: z.id, week, type: 'weekly_update', isPosted: false },
    orderBy: { createdAt: 'desc' },
  })
  const draft = await buildWeeklyUpdate(leagueId, week)
  const text = pending?.content?.trim() ? pending.content : composeWeeklyUpdateBody(draft)

  const lg = await prisma.league.findUnique({ where: { id: leagueId }, select: { userId: true } })
  if (lg?.userId) {
    await prisma.leagueChatMessage.create({
      data: {
        leagueId,
        userId: lg.userId,
        message: text.slice(0, 100_000),
        type: 'host_announcement',
        metadata: {
          senderIsHost: true,
          contentType: 'host_announcement',
          isPinned: true,
          zombieWeeklyUpdate: true,
          week,
        },
      },
    })
  }

  if (pending) {
    await prisma.zombieAnnouncement.update({
      where: { id: pending.id },
      data: { isPosted: true, postedAt: new Date(), content: text },
    })
  } else {
    await prisma.zombieAnnouncement.create({
      data: {
        zombieLeagueId: z.id,
        universeId: z.universeId,
        type: 'weekly_update',
        title: `Week ${week} — Horde report`,
        content: text,
        week,
        isPosted: true,
        postedAt: new Date(),
        isPublic: true,
      },
    })
  }

  return NextResponse.json({ ok: true })
}

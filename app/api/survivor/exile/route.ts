import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { requireCronAuth } from '@/app/api/cron/_auth'
import { assertLeagueCommissioner, assertLeagueMember } from '@/lib/league/league-access'
import { processReturnFromExile, scoreExileWeek } from '@/lib/survivor/exileEngine'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(req: NextRequest) {
  if (requireCronAuth(req)) {
    const islands = await prisma.exileIsland.findMany({ where: { isActive: true } })
    for (const is of islands) {
      await scoreExileWeek(is.leagueId, is.currentWeek).catch(() => {})
    }
    return NextResponse.json({ ok: true, processed: islands.length })
  }

  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const leagueId = req.nextUrl.searchParams.get('leagueId')?.trim()
  if (!leagueId) return NextResponse.json({ error: 'leagueId required' }, { status: 400 })
  const gate = await assertLeagueMember(leagueId, userId)
  if (!gate.ok) return NextResponse.json({ error: 'Forbidden' }, { status: gate.status })

  const island = await prisma.exileIsland.findUnique({ where: { leagueId } })
  const me = await prisma.survivorPlayer.findFirst({ where: { leagueId, userId } })
  return NextResponse.json({ island, user: me })
}

export async function POST(req: NextRequest) {
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { intent?: string; leagueId?: string; week?: number; lineup?: unknown; userId?: string }
  try {
    body = (await req.json()) as typeof body
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (body.intent === 'return') {
    if (!body.leagueId) return NextResponse.json({ error: 'leagueId required' }, { status: 400 })
    const gate = await assertLeagueCommissioner(body.leagueId, userId)
    if (!gate.ok) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    const uid = await processReturnFromExile(body.leagueId)
    return NextResponse.json({ returnedUserId: uid })
  }

  if (body.intent === 'lineup') {
    if (!body.leagueId || body.week == null) return NextResponse.json({ error: 'leagueId and week required' }, { status: 400 })
    const gate = await assertLeagueMember(body.leagueId, userId)
    if (!gate.ok) return NextResponse.json({ error: 'Forbidden' }, { status: gate.status })
    const island = await prisma.exileIsland.findUnique({ where: { leagueId: body.leagueId } })
    if (!island) return NextResponse.json({ error: 'Exile not initialized' }, { status: 400 })
    await prisma.exileWeeklyEntry.upsert({
      where: {
        exileId_userId_week: { exileId: island.id, userId, week: body.week },
      },
      create: {
        exileId: island.id,
        leagueId: body.leagueId,
        userId,
        week: body.week,
        submittedLineup: (body.lineup ?? {}) as object,
      },
      update: { submittedLineup: (body.lineup ?? {}) as object },
    })
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Invalid intent' }, { status: 400 })
}

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { Prisma } from '@prisma/client'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { assertLeagueCommissioner } from '@/lib/league/league-access'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { leagueId?: string; confirmText?: string }
  try {
    body = (await req.json()) as { leagueId?: string; confirmText?: string }
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const leagueId = typeof body.leagueId === 'string' ? body.leagueId.trim() : ''
  const confirmText = typeof body.confirmText === 'string' ? body.confirmText.trim() : ''
  if (!leagueId) {
    return NextResponse.json({ error: 'leagueId required' }, { status: 400 })
  }
  if (confirmText !== 'RESET DRAFT') {
    return NextResponse.json({ error: 'Confirmation text must be RESET DRAFT' }, { status: 400 })
  }

  const gate = await assertLeagueCommissioner(leagueId, userId)
  if (!gate.ok) {
    return NextResponse.json({ error: gate.status === 404 ? 'League not found' : 'Forbidden' }, {
      status: gate.status,
    })
  }

  const draftSession = await prisma.draftSession.findUnique({
    where: { leagueId },
    include: { _count: { select: { picks: true } } },
  })

  const clearedPicks = draftSession?._count.picks ?? 0

  if (draftSession) {
    await prisma.draftPick.deleteMany({ where: { sessionId: draftSession.id } })
    await prisma.draftSession.update({
      where: { id: draftSession.id },
      data: {
        status: 'pre_draft',
        nextOverallPick: 1,
        currentRoundNum: 1,
        timerEndAt: null,
        pausedRemainingSeconds: null,
        auctionState: Prisma.JsonNull,
        version: { increment: 1 },
      },
    })
  }

  const existing = await prisma.leagueSettings.findUnique({ where: { leagueId } })
  let resetHistory: unknown[] = []
  if (existing?.resetHistory != null && Array.isArray(existing.resetHistory)) {
    resetHistory = [...existing.resetHistory]
  }
  resetHistory.push({
    resetAt: new Date().toISOString(),
    resetBy: userId,
    clearedPicks,
  })

  await prisma.leagueSettings.upsert({
    where: { leagueId },
    create: {
      leagueId,
      resetHistory: resetHistory as unknown as Prisma.InputJsonValue,
      updatedBy: userId,
    },
    update: {
      resetHistory: resetHistory as unknown as Prisma.InputJsonValue,
      updatedBy: userId,
    },
  })

  return NextResponse.json({ success: true, clearedPicks })
}

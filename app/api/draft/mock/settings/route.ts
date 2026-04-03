import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null
  const roomId = typeof body?.roomId === 'string' ? body.roomId.trim() : ''
  if (!roomId) {
    return NextResponse.json({ error: 'roomId required' }, { status: 400 })
  }

  const room = await prisma.mockDraftRoom.findUnique({ where: { id: roomId } })
  if (!room || room.createdById !== userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  await prisma.mockDraftRoom.update({
    where: { id: roomId },
    data: {
      ...(typeof body?.sport === 'string' ? { sport: body.sport } : {}),
      ...(body?.numTeams != null ? { numTeams: Number(body.numTeams) } : {}),
      ...(body?.numRounds != null ? { numRounds: Number(body.numRounds) } : {}),
      ...(body?.timerSeconds != null ? { timerSeconds: Number(body.timerSeconds) } : {}),
      ...(typeof body?.scoringType === 'string' ? { scoringType: body.scoringType } : {}),
      ...(typeof body?.playerPool === 'string' ? { playerPool: body.playerPool } : {}),
      ...(body?.settings != null ? { settings: body.settings as object } : {}),
      ...(body?.rosterSettings != null ? { rosterSettings: body.rosterSettings as object } : {}),
    },
  })

  return NextResponse.json({ success: true })
}

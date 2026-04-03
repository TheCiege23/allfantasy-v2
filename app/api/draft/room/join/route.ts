import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sessionKeyMock } from '@/lib/draft/session-key'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null
  const inviteCode = typeof body?.inviteCode === 'string' ? body.inviteCode.trim().toUpperCase() : ''
  if (!inviteCode) {
    return NextResponse.json({ error: 'inviteCode required' }, { status: 400 })
  }

  const room = await prisma.mockDraftRoom.findFirst({
    where: { inviteCode },
    select: { id: true, status: true },
  })
  if (!room) {
    return NextResponse.json({ error: 'Room not found' }, { status: 404 })
  }

  return NextResponse.json({
    roomId: room.id,
    sessionId: sessionKeyMock(room.id),
    status: room.status,
  })
}

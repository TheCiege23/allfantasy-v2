import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/**
 * Bell / inbox feed for tournament shell. Persisted rows + push can layer on later.
 * Client: poll or subscribe when `PlatformNotification` / SSE tournament channel exists.
 */
export async function GET(req: NextRequest) {
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const tournamentId = req.nextUrl.searchParams.get('tournamentId')?.trim()
  if (!tournamentId) return NextResponse.json({ error: 'tournamentId required' }, { status: 400 })

  const p = await prisma.tournamentParticipant.findFirst({
    where: { tournamentId, userId },
    select: { id: true },
  })
  if (!p) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const rows = await prisma.platformNotification.findMany({
    where: {
      userId,
      type: { startsWith: 'tournament:' },
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })

  return NextResponse.json({
    notifications: rows,
    note: 'Push + real-time delivery: enqueue with type tournament:* and optional SSE/Redis fan-out.',
  })
}

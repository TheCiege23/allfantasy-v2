import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { assertLeagueMember } from '@/lib/league/league-access'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const leagueId = req.nextUrl.searchParams.get('leagueId')?.trim()
  if (!leagueId) return NextResponse.json({ error: 'leagueId required' }, { status: 400 })

  const gate = await assertLeagueMember(leagueId, userId)
  if (!gate.ok) return NextResponse.json({ error: 'Forbidden' }, { status: gate.status })

  const channels = await prisma.survivorChatChannel.findMany({
    where: {
      leagueId,
      memberUserIds: { has: userId },
    },
    orderBy: { updatedAt: 'desc' },
  })

  const withApproxUnread = await Promise.all(
    channels.map(async (ch) => {
      const recent = await prisma.survivorChatMessage.count({
        where: {
          channelId: ch.id,
          createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        },
      })
      return {
        id: ch.id,
        name: ch.name,
        channelType: ch.channelType,
        tribeId: ch.tribeId,
        unreadApprox: recent,
        updatedAt: ch.updatedAt,
      }
    }),
  )

  return NextResponse.json({ channels: withApproxUnread })
}

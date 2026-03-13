import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { resolvePlatformUser } from '@/lib/platform/current-user'

export async function GET() {
  const user = await resolvePlatformUser()
  if (!user.appUserId) {
    return NextResponse.json({
      status: 'ok',
      meta: {
        lastViewed: null,
        bestTeam: null,
        worstTeam: null,
        bestPlayer: null,
        streak: null,
      },
    })
  }

  try {
    const member = await (prisma as any).platformChatThreadMember.findFirst({
      where: {
        userId: user.appUserId,
        thread: {
          threadType: 'league',
        },
      },
      orderBy: { lastReadAt: 'desc' },
      select: { lastReadAt: true },
    })

    return NextResponse.json({
      status: 'ok',
      meta: {
        lastViewed: member?.lastReadAt ? new Date(member.lastReadAt).toISOString() : null,
        bestTeam: null,
        worstTeam: null,
        bestPlayer: null,
        streak: null,
      },
    })
  } catch {
    return NextResponse.json({
      status: 'ok',
      meta: {
        lastViewed: null,
        bestTeam: null,
        worstTeam: null,
        bestPlayer: null,
        streak: null,
      },
    })
  }
}


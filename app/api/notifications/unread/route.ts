import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'

import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userId = session.user.id

  try {
    const count = await prisma.platformNotification.count({
      where: { userId, readAt: null },
    })
    return NextResponse.json({ count })
  } catch (e: unknown) {
    console.error('[api/notifications/unread]', e)
    return NextResponse.json({ count: 0 })
  }
}

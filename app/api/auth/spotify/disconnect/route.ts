import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function POST() {
  const session = (await getServerSession(authOptions as never)) as {
    user?: { id?: string }
  } | null

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await prisma.userProfile.update({
    where: { userId: session.user.id },
    data: {
      spotifyAccessToken: null,
      spotifyRefreshToken: null,
      spotifyExpiresAt: null,
      spotifyDisplayName: null,
      spotifyConnectedAt: null,
    },
  })

  return NextResponse.json({ ok: true })
}

/**
 * GET /api/creators/me — current user's creator profile and leagues (for creator tools).
 */

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getCreatorLeagues } from '@/lib/creator-system'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const profileRow = await prisma.creatorProfile.findUnique({
    where: { userId },
    include: { _count: { select: { leagues: true } } },
  })
  if (!profileRow) return NextResponse.json({ creator: null, leagues: [] })

  const { getCreatorBySlugOrId } = await import('@/lib/creator-system')
  const profile = await getCreatorBySlugOrId(profileRow.slug, userId)
  if (!profile) return NextResponse.json({ creator: null, leagues: [] })

  const baseUrl = process.env.NEXTAUTH_URL ?? req.headers.get('x-forwarded-host') ? `https://${req.headers.get('x-forwarded-host')}` : ''
  const leagues = await getCreatorLeagues(profile.id, userId, baseUrl)

  return NextResponse.json({
    creator: { ...profile, isOwner: true },
    leagues,
  })
}

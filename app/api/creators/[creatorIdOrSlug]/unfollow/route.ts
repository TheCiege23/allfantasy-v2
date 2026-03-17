import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { unfollowCreator } from '@/lib/creator-system'

export const dynamic = 'force-dynamic'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ creatorIdOrSlug: string }> }
) {
  const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { creatorIdOrSlug } = await params
  const { prisma } = await import('@/lib/prisma')
  const profile = await prisma.creatorProfile.findFirst({
    where: {
      OR: [{ id: creatorIdOrSlug }, { slug: creatorIdOrSlug }],
    },
    select: { id: true },
  })
  if (!profile) return NextResponse.json({ error: 'Creator not found' }, { status: 404 })

  const result = await unfollowCreator(profile.id, userId)
  if (!result.success) return NextResponse.json({ error: result.error }, { status: 400 })
  return NextResponse.json({ success: true })
}

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getCreatorAnalyticsSummary } from '@/lib/creator-system'

export const dynamic = 'force-dynamic'

export async function GET(
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
      userId,
    },
    select: { id: true },
  })
  if (!profile) return NextResponse.json({ error: 'Creator not found or access denied' }, { status: 404 })

  const { searchParams } = new URL(req.url)
  const periodDays = Math.min(Number(searchParams.get('period')) || 30, 365)
  const summary = await getCreatorAnalyticsSummary(profile.id, userId, periodDays)
  if (!summary) return NextResponse.json({ error: 'Creator not found or access denied' }, { status: 404 })
  return NextResponse.json(summary)
}

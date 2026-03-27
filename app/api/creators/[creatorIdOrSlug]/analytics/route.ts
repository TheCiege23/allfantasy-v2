import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getCreatorAnalyticsSummary } from '@/lib/creator-system'
import { prisma } from '@/lib/prisma'
import { isAdminEmailAllowed } from '@/lib/adminAuth'

export const dynamic = 'force-dynamic'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ creatorIdOrSlug: string }> }
) {
  const session = (await getServerSession(authOptions as any)) as {
    user?: { id?: string; email?: string | null }
  } | null
  const userId = session?.user?.id
  const viewerEmail = session?.user?.email ?? null
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { creatorIdOrSlug } = await params
  const creator = await prisma.creatorProfile.findFirst({
    where: {
      OR: [{ id: creatorIdOrSlug }, { slug: creatorIdOrSlug }],
    },
    select: { id: true, userId: true },
  })
  if (!creator || (creator.userId !== userId && !isAdminEmailAllowed(viewerEmail))) {
    return NextResponse.json({ error: 'Creator not found or access denied' }, { status: 404 })
  }

  const { searchParams } = new URL(req.url)
  const periodDays = Math.min(Math.max(Number(searchParams.get('period')) || 30, 1), 365)
  const summary = await getCreatorAnalyticsSummary(creator.id, userId, periodDays, viewerEmail)
  if (!summary) return NextResponse.json({ error: 'Creator not found or access denied' }, { status: 404 })

  return NextResponse.json(summary)
}

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { updateCreatorBranding } from '@/lib/creator-system'
import type { CreatorBranding } from '@/lib/creator-system/types'
import { prisma } from '@/lib/prisma'
import { isAdminEmailAllowed } from '@/lib/adminAuth'

export const dynamic = 'force-dynamic'

export async function PATCH(
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
  const profile = await prisma.creatorProfile.findFirst({
    where: {
      OR: [{ id: creatorIdOrSlug }, { slug: creatorIdOrSlug }],
    },
    select: { id: true, userId: true },
  })
  if (!profile || (profile.userId !== userId && !isAdminEmailAllowed(viewerEmail))) {
    return NextResponse.json({ error: 'Creator not found or access denied' }, { status: 404 })
  }

  const body = await req.json().catch(() => ({}))
  const branding: CreatorBranding = {
    logoUrl: body.logoUrl ?? undefined,
    coverImageUrl: body.coverImageUrl ?? undefined,
    primaryColor: body.primaryColor ?? undefined,
    accentColor: body.accentColor ?? undefined,
    backgroundColor: body.backgroundColor ?? undefined,
    tagline: body.tagline ?? undefined,
    communityName: body.communityName ?? undefined,
    fontFamily: body.fontFamily ?? undefined,
    inviteHeadline: body.inviteHeadline ?? undefined,
    cardStyle: body.cardStyle ?? undefined,
  }
  const updated = await updateCreatorBranding(profile.id, profile.userId, branding, viewerEmail)
  if (!updated) return NextResponse.json({ error: 'Update failed' }, { status: 500 })

  return NextResponse.json(updated)
}

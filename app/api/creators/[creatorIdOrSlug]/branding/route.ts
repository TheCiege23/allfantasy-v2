import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { updateCreatorBranding } from '@/lib/creator-system'
import type { CreatorBranding } from '@/lib/creator-system/types'

export const dynamic = 'force-dynamic'

export async function PATCH(
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

  const body = await req.json().catch(() => ({}))
  const branding: CreatorBranding = {
    logoUrl: body.logoUrl ?? undefined,
    primaryColor: body.primaryColor ?? undefined,
    accentColor: body.accentColor ?? undefined,
  }
  const updated = await updateCreatorBranding(profile.id, userId, branding)
  if (!updated) return NextResponse.json({ error: 'Update failed' }, { status: 500 })
  return NextResponse.json(updated)
}

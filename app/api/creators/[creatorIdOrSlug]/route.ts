import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getCreatorBySlugOrId } from '@/lib/creator-system'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ creatorIdOrSlug: string }> }
) {
  try {
    const { creatorIdOrSlug } = await params
    const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
    const viewerUserId = session?.user?.id ?? null

    const creator = await getCreatorBySlugOrId(creatorIdOrSlug, viewerUserId)
    if (!creator) return NextResponse.json({ error: 'Creator not found' }, { status: 404 })

    if (viewerUserId) {
      const { logAnalytics } = await import('@/lib/creator-system')
      await logAnalytics(creator.id, 'profile_view', null, { source: 'profile_page' })
    }

    const isOwner = !!viewerUserId && creator.userId === viewerUserId
    return NextResponse.json({ ...creator, isOwner })
  } catch (e) {
    console.error('[api/creators/[creatorIdOrSlug]]', e)
    return NextResponse.json({ error: 'Failed to load creator' }, { status: 500 })
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ creatorIdOrSlug: string }> }
) {
  try {
    const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
    const userId = session?.user?.id
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { creatorIdOrSlug } = await params
    const profile = await prisma.creatorProfile.findFirst({
      where: {
        OR: [{ id: creatorIdOrSlug }, { slug: creatorIdOrSlug }],
        userId,
      },
    })
    if (!profile) return NextResponse.json({ error: 'Creator not found or access denied' }, { status: 404 })

    const body = await req.json().catch(() => ({}))
    const allowed = [
      'displayName',
      'bio',
      'avatarUrl',
      'bannerUrl',
      'websiteUrl',
      'socialHandles',
      'visibility',
      'branding',
    ] as const
    const data: Record<string, unknown> = {}
    for (const key of allowed) {
      if (body[key] !== undefined) data[key] = body[key]
    }
    if (Object.keys(data).length === 0) return NextResponse.json(profile)

    const updated = await prisma.creatorProfile.update({
      where: { id: profile.id },
      data: data as object,
    })
    return NextResponse.json(updated)
  } catch (e) {
    console.error('[api/creators/[creatorIdOrSlug]] PATCH', e)
    return NextResponse.json({ error: 'Failed to update creator' }, { status: 500 })
  }
}

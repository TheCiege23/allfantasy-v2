import { NextRequest, NextResponse } from 'next/server'
import { logAnalytics } from '@/lib/creator-system'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/** Log invite_share and return share URL. No auth required for logging (analytics-safe). */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ creatorIdOrSlug: string }> }
) {
  try {
    const { creatorIdOrSlug } = await params
    const profile = await prisma.creatorProfile.findFirst({
      where: {
        OR: [{ id: creatorIdOrSlug }, { slug: creatorIdOrSlug }],
      },
      select: { id: true, slug: true },
    })
    if (!profile) return NextResponse.json({ error: 'Creator not found' }, { status: 404 })

    await logAnalytics(profile.id, 'invite_share', null, { source: 'share_button' })
    const host = req.headers.get('host') || 'localhost:3000'
    const proto = req.headers.get('x-forwarded-proto') || 'http'
    const url = `${proto}://${host}/creators/${profile.slug}`
    return NextResponse.json({ url })
  } catch (e) {
    console.error('[api/creators/.../share]', e)
    return NextResponse.json({ error: 'Failed to get share URL' }, { status: 500 })
  }
}

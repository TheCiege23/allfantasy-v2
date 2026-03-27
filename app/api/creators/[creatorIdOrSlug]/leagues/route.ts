import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getCreatorLeagues } from '@/lib/creator-system'
import { prisma } from '@/lib/prisma'
import { resolveUserCareerTier } from '@/lib/ranking/tier-visibility'

export const dynamic = 'force-dynamic'

function getBaseUrl(req: NextRequest): string {
  const host = req.headers.get('host') || 'localhost:3000'
  const proto = req.headers.get('x-forwarded-proto') || 'http'
  return `${proto}://${host}`
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ creatorIdOrSlug: string }> }
) {
  try {
    const { creatorIdOrSlug } = await params
    const session = (await getServerSession(authOptions as any)) as {
      user?: { id?: string; email?: string | null }
    } | null
    const viewerUserId = session?.user?.id ?? null
    const viewerEmail = session?.user?.email ?? null
    const viewerTier = await resolveUserCareerTier(prisma as any, viewerUserId, 1)
    const baseUrl = getBaseUrl(req)

    const leagues = await getCreatorLeagues(
      creatorIdOrSlug,
      viewerUserId,
      baseUrl,
      viewerEmail,
      viewerTier
    )
    return NextResponse.json(leagues)
  } catch (e) {
    console.error('[api/creators/.../leagues]', e)
    return NextResponse.json({ error: 'Failed to list creator leagues' }, { status: 500 })
  }
}

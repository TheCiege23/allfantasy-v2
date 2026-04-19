import { withApiUsage } from '@/lib/telemetry/usage'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/adminAuth'
import { BRAND_POST_STATUSES } from '@/lib/brand-social/types'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/brand-posts
 * Query: ?status=draft|scheduled|sent|failed|cancelled (optional, defaults to all)
 *        ?accountId=... (optional)
 *        ?limit=50 (default 100, max 500)
 */
export const GET = withApiUsage({
  endpoint: '/api/admin/brand-posts',
  tool: 'AdminBrandPostsList',
})(async (request: NextRequest) => {
  const gate = await requireAdmin()
  if (!gate.ok) return gate.res

  const url = new URL(request.url)
  const statusParam = url.searchParams.get('status')?.trim().toLowerCase() ?? null
  const accountId = url.searchParams.get('accountId')?.trim() || null
  const limit = Math.min(500, Math.max(1, Number(url.searchParams.get('limit') ?? '100')))

  const where: any = {}
  if (statusParam && (BRAND_POST_STATUSES as readonly string[]).includes(statusParam)) {
    where.status = statusParam
  }
  if (accountId) where.accountId = accountId

  const posts = await (prisma as any).brandSocialPost.findMany({
    where,
    orderBy: [{ createdAt: 'desc' }],
    take: limit,
    select: {
      id: true,
      accountId: true,
      status: true,
      body: true,
      mediaUrl: true,
      scheduledFor: true,
      publishedAt: true,
      providerPostId: true,
      failureMessage: true,
      aiModel: true,
      createdByEmail: true,
      createdAt: true,
      updatedAt: true,
      account: {
        select: {
          platform: true,
          handle: true,
          displayName: true,
        },
      },
    },
  }).catch((err: any) => {
    console.error('[admin/brand-posts] findMany failed', err)
    return [] as any[]
  })

  return NextResponse.json({
    ok: true,
    count: posts.length,
    posts,
  })
})

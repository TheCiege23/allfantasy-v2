import { withApiUsage } from '@/lib/telemetry/usage'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/adminAuth'

export const dynamic = 'force-dynamic'

/** POST /api/admin/brand-posts/[id]/cancel — cancels a scheduled post. No-op on terminal states. */
export const POST = withApiUsage({
  endpoint: '/api/admin/brand-posts/[id]/cancel',
  tool: 'AdminBrandPostCancel',
})(async (_req: NextRequest, { params }: { params: { id: string } }) => {
  const gate = await requireAdmin()
  if (!gate.ok) return gate.res

  const id = params.id?.trim()
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  // Atomic transition — only cancel rows that are still scheduled or draft.
  const updated = await (prisma as any).brandSocialPost.updateMany({
    where: { id, status: { in: ['scheduled', 'draft'] } },
    data: { status: 'cancelled', scheduledFor: null },
  })

  if (updated.count === 0) {
    return NextResponse.json(
      { ok: false, error: 'Post not found or already in a terminal state' },
      { status: 409 },
    )
  }

  prisma.analyticsEvent
    .create({
      data: {
        event: 'tool_use',
        toolKey: 'admin_brand_post_cancelled',
        path: '/api/admin/brand-posts/[id]/cancel',
        userId: gate.user.id,
        meta: { adminEmail: gate.user.email, postId: id },
      },
    })
    .catch(() => {})

  return NextResponse.json({ ok: true })
})

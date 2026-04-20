import { withApiUsage } from '@/lib/telemetry/usage'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/adminAuth'

export const dynamic = 'force-dynamic'

/** DELETE /api/admin/brand-posts/[id] — removes any post except `sent` (use cancel for scheduled). */
export const DELETE = withApiUsage({
  endpoint: '/api/admin/brand-posts/[id]',
  tool: 'AdminBrandPostDelete',
})(async (_req: NextRequest, { params }: { params: { id: string } }) => {
  const gate = await requireAdmin()
  if (!gate.ok) return gate.res

  const id = params.id?.trim()
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  // Guard against nuking a sent post — `sent` is the only permanent-audit status,
  // and you probably want to keep the history (use delete-from-provider via the
  // platform dashboard if you need the remote post gone).
  const existing = await (prisma as any).brandSocialPost.findUnique({
    where: { id },
    select: { status: true },
  })
  if (!existing) return NextResponse.json({ ok: true, deleted: false })
  if (existing.status === 'sent' || existing.status === 'publishing') {
    return NextResponse.json(
      { ok: false, error: `Cannot delete a post in status "${existing.status}". Use cancel only for scheduled posts.` },
      { status: 409 },
    )
  }

  await (prisma as any).brandSocialPost.delete({ where: { id } })

  prisma.analyticsEvent
    .create({
      data: {
        event: 'tool_use',
        toolKey: 'admin_brand_post_deleted',
        path: '/api/admin/brand-posts/[id]',
        userId: gate.user.id,
        meta: { adminEmail: gate.user.email, postId: id, previousStatus: existing.status },
      },
    })
    .catch(() => {})

  return NextResponse.json({ ok: true, deleted: true })
})

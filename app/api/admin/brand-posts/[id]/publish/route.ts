import { withApiUsage } from '@/lib/telemetry/usage'
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/adminAuth'
import { prisma } from '@/lib/prisma'
import { publishBrandPostById } from '@/lib/brand-social/publishBrandPost'

export const dynamic = 'force-dynamic'

/** POST /api/admin/brand-posts/[id]/publish — manual publish (from draft / failed). */
export const POST = withApiUsage({
  endpoint: '/api/admin/brand-posts/[id]/publish',
  tool: 'AdminBrandPostPublish',
})(async (_req: NextRequest, { params }: { params: { id: string } }) => {
  const gate = await requireAdmin()
  if (!gate.ok) return gate.res

  const id = params.id?.trim()
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const pub = await publishBrandPostById(id)
  if (!pub.ok) {
    const httpStatus = pub.code === 'not_found' ? 404 : 409
    return NextResponse.json({ ok: false, error: pub.error, code: pub.code }, { status: httpStatus })
  }

  prisma.analyticsEvent
    .create({
      data: {
        event: 'tool_use',
        toolKey: 'admin_brand_post_published',
        path: '/api/admin/brand-posts/[id]/publish',
        userId: gate.user.id,
        meta: {
          adminEmail: gate.user.email,
          postId: id,
          publishOk: pub.result.ok,
          publishCode: pub.result.ok ? 'sent' : pub.result.code,
        },
      },
    })
    .catch(() => {})

  return NextResponse.json({ ok: true, result: pub.result })
})

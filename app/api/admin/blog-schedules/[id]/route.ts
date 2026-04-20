import { withApiUsage } from '@/lib/telemetry/usage'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/adminAuth'

export const dynamic = 'force-dynamic'

const MAX_TOPIC_HINT = 500
const MAX_CADENCE_DAYS = 90
const MIN_CADENCE_DAYS = 1

/** PATCH /api/admin/blog-schedules/[id] — toggle active / autoPublish, update cadence or topicHint. */
export const PATCH = withApiUsage({
  endpoint: '/api/admin/blog-schedules/[id]',
  tool: 'AdminBlogScheduleUpdate',
})(async (req: NextRequest, { params }: { params: { id: string } }) => {
  const gate = await requireAdmin()
  if (!gate.ok) return gate.res

  const id = params.id?.trim()
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  let body: any = {}
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const update: Record<string, unknown> = {}
  if (typeof body.isActive === 'boolean') update.isActive = body.isActive
  if (typeof body.autoPublish === 'boolean') update.autoPublish = body.autoPublish
  if (body.cadenceDays != null) {
    const n = Number(body.cadenceDays)
    if (!Number.isFinite(n) || n < MIN_CADENCE_DAYS || n > MAX_CADENCE_DAYS) {
      return NextResponse.json(
        { error: `cadenceDays must be ${MIN_CADENCE_DAYS}–${MAX_CADENCE_DAYS}` },
        { status: 400 },
      )
    }
    update.cadenceDays = Math.floor(n)
  }
  if ('topicHint' in body) {
    if (body.topicHint === null) {
      update.topicHint = null
    } else if (typeof body.topicHint === 'string') {
      update.topicHint = body.topicHint.trim().slice(0, MAX_TOPIC_HINT) || null
    }
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'No updatable fields provided' }, { status: 400 })
  }

  const existing = await (prisma as any).automatedBlogSchedule.findUnique({
    where: { id },
    select: { id: true },
  })
  if (!existing) return NextResponse.json({ error: 'Schedule not found' }, { status: 404 })

  const updated = await (prisma as any).automatedBlogSchedule.update({
    where: { id },
    data: update,
    select: {
      id: true,
      sport: true,
      category: true,
      cadenceDays: true,
      isActive: true,
      autoPublish: true,
      topicHint: true,
      updatedAt: true,
    },
  })

  prisma.analyticsEvent
    .create({
      data: {
        event: 'tool_use',
        toolKey: 'admin_blog_schedule_updated',
        path: '/api/admin/blog-schedules/[id]',
        userId: gate.user.id,
        meta: {
          adminEmail: gate.user.email,
          scheduleId: id,
          fields: Object.keys(update),
        },
      },
    })
    .catch(() => {})

  return NextResponse.json({ ok: true, schedule: updated })
})

/** DELETE /api/admin/blog-schedules/[id] */
export const DELETE = withApiUsage({
  endpoint: '/api/admin/blog-schedules/[id]',
  tool: 'AdminBlogScheduleDelete',
})(async (_req: NextRequest, { params }: { params: { id: string } }) => {
  const gate = await requireAdmin()
  if (!gate.ok) return gate.res

  const id = params.id?.trim()
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const existing = await (prisma as any).automatedBlogSchedule.findUnique({
    where: { id },
    select: { id: true, sport: true, category: true },
  })
  if (!existing) return NextResponse.json({ ok: true, deleted: false })

  await (prisma as any).automatedBlogSchedule.delete({ where: { id } })

  prisma.analyticsEvent
    .create({
      data: {
        event: 'tool_use',
        toolKey: 'admin_blog_schedule_deleted',
        path: '/api/admin/blog-schedules/[id]',
        userId: gate.user.id,
        meta: { adminEmail: gate.user.email, scheduleId: id, sport: existing.sport, category: existing.category },
      },
    })
    .catch(() => {})

  return NextResponse.json({ ok: true, deleted: true })
})

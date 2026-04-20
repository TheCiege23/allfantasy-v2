import { withApiUsage } from '@/lib/telemetry/usage'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/adminAuth'
import { normalizeToSupportedSport, SUPPORTED_SPORTS } from '@/lib/sport-scope'
import { BLOG_CATEGORIES, type BlogCategory } from '@/lib/automated-blog/types'

export const dynamic = 'force-dynamic'

const MAX_TOPIC_HINT = 500
const MAX_CADENCE_DAYS = 90
const MIN_CADENCE_DAYS = 1

function isBlogCategory(v: unknown): v is BlogCategory {
  return typeof v === 'string' && (BLOG_CATEGORIES as readonly string[]).includes(v)
}

/** GET /api/admin/blog-schedules — list all schedules */
export const GET = withApiUsage({
  endpoint: '/api/admin/blog-schedules',
  tool: 'AdminBlogSchedulesList',
})(async (_req: NextRequest) => {
  const gate = await requireAdmin()
  if (!gate.ok) return gate.res

  const schedules = await (prisma as any).automatedBlogSchedule
    .findMany({
      orderBy: [{ isActive: 'desc' }, { sport: 'asc' }, { category: 'asc' }],
      select: {
        id: true,
        sport: true,
        category: true,
        topicHint: true,
        cadenceDays: true,
        isActive: true,
        autoPublish: true,
        lastRunAt: true,
        lastRunStatus: true,
        lastRunArticleId: true,
        lastRunError: true,
        runCount: true,
        createdByEmail: true,
        createdAt: true,
        updatedAt: true,
      },
    })
    .catch((err: unknown) => {
      console.error('[admin/blog-schedules] findMany failed', err)
      return [] as any[]
    })

  return NextResponse.json({ ok: true, count: schedules.length, schedules })
})

/** POST /api/admin/blog-schedules — create a schedule. Unique on (sport, category). */
export const POST = withApiUsage({
  endpoint: '/api/admin/blog-schedules',
  tool: 'AdminBlogScheduleCreate',
})(async (req: NextRequest) => {
  const gate = await requireAdmin()
  if (!gate.ok) return gate.res

  let body: any = {}
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const rawSport = typeof body.sport === 'string' ? body.sport.trim() : ''
  if (!rawSport) return NextResponse.json({ error: 'sport required' }, { status: 400 })
  const sport = normalizeToSupportedSport(rawSport)
  if (!(SUPPORTED_SPORTS as readonly string[]).includes(sport)) {
    return NextResponse.json({ error: 'Unsupported sport' }, { status: 400 })
  }

  if (!isBlogCategory(body.category)) {
    return NextResponse.json(
      { error: 'Invalid category', allowed: [...BLOG_CATEGORIES] },
      { status: 400 },
    )
  }

  const cadenceDays = Number(body.cadenceDays)
  if (!Number.isFinite(cadenceDays) || cadenceDays < MIN_CADENCE_DAYS || cadenceDays > MAX_CADENCE_DAYS) {
    return NextResponse.json(
      { error: `cadenceDays must be ${MIN_CADENCE_DAYS}–${MAX_CADENCE_DAYS}` },
      { status: 400 },
    )
  }

  const topicHint =
    typeof body.topicHint === 'string' ? body.topicHint.trim().slice(0, MAX_TOPIC_HINT) || null : null
  const autoPublish = body.autoPublish === true
  const isActive = body.isActive !== false

  const existing = await (prisma as any).automatedBlogSchedule
    .findUnique({
      where: { sport_category: { sport, category: body.category } },
      select: { id: true },
    })
    .catch(() => null)
  if (existing) {
    return NextResponse.json(
      { error: `A schedule already exists for ${sport} / ${body.category}` },
      { status: 409 },
    )
  }

  const created = await (prisma as any).automatedBlogSchedule.create({
    data: {
      sport,
      category: body.category,
      topicHint,
      cadenceDays: Math.floor(cadenceDays),
      isActive,
      autoPublish,
      createdByAdminId: gate.user.id,
      createdByEmail: gate.user.email ?? 'unknown',
    },
    select: {
      id: true,
      sport: true,
      category: true,
      cadenceDays: true,
      isActive: true,
      autoPublish: true,
      createdAt: true,
    },
  })

  prisma.analyticsEvent
    .create({
      data: {
        event: 'tool_use',
        toolKey: 'admin_blog_schedule_created',
        path: '/api/admin/blog-schedules',
        userId: gate.user.id,
        meta: {
          adminEmail: gate.user.email,
          scheduleId: created.id,
          sport,
          category: body.category,
          cadenceDays: created.cadenceDays,
          autoPublish,
        },
      },
    })
    .catch(() => {})

  return NextResponse.json({ ok: true, schedule: created })
})

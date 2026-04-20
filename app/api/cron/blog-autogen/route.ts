import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireCronAuth } from '../_auth'
import { generateAndSaveDraft, publishArticle } from '@/lib/automated-blog'
import { normalizeToSupportedSport } from '@/lib/sport-scope'
import { BLOG_CATEGORIES, type BlogCategory } from '@/lib/automated-blog/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

const BATCH_SIZE = 6

/**
 * Walks active AutomatedBlogSchedule rows, runs generateAndSaveDraft for each
 * whose cadence window has elapsed, and records the outcome. When a schedule
 * has `autoPublish` the cron also calls publishArticle inline. Drafts from
 * non-autoPublish schedules land in the existing blog tab for human review.
 *
 * Intended cadence: hourly or better. The per-row filter means you can point
 * multiple cron schedules at this endpoint without double-firing — each
 * schedule's `cadenceDays` gates it.
 */
export async function GET(req: NextRequest) {
  if (!requireCronAuth(req)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }
  return runAutogen()
}

export async function POST(req: NextRequest) {
  if (!requireCronAuth(req)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }
  return runAutogen()
}

async function runAutogen() {
  const now = new Date()

  let schedules: Array<{
    id: string
    sport: string
    category: string
    topicHint: string | null
    cadenceDays: number
    autoPublish: boolean
    lastRunAt: Date | null
  }> = []

  try {
    const rows = await (prisma as any).automatedBlogSchedule.findMany({
      where: { isActive: true },
      orderBy: [{ lastRunAt: { sort: 'asc', nulls: 'first' } }],
      take: BATCH_SIZE * 4, // read-over, filter in JS so nulls-first works uniformly
      select: {
        id: true,
        sport: true,
        category: true,
        topicHint: true,
        cadenceDays: true,
        autoPublish: true,
        lastRunAt: true,
      },
    })
    schedules = rows
  } catch (err) {
    console.error('[cron/blog-autogen] findMany failed', err)
    return NextResponse.json({ ok: false, error: 'Failed to read schedules' }, { status: 500 })
  }

  // Filter to rows genuinely due: lastRunAt null, or lastRunAt + cadenceDays <= now.
  const due = schedules
    .filter((s) => {
      if (!s.lastRunAt) return true
      const nextAt = s.lastRunAt.getTime() + s.cadenceDays * 24 * 60 * 60 * 1000
      return nextAt <= now.getTime()
    })
    .slice(0, BATCH_SIZE)

  if (due.length === 0) {
    return NextResponse.json({
      ok: true,
      processed: 0,
      startedAt: now.toISOString(),
      scannedActive: schedules.length,
    })
  }

  const results = await Promise.all(
    due.map(async (s) => {
      const finishedAt = new Date()
      const sport = normalizeToSupportedSport(s.sport)
      const category = (BLOG_CATEGORIES as readonly string[]).includes(s.category)
        ? (s.category as BlogCategory)
        : null

      if (!category) {
        await (prisma as any).automatedBlogSchedule.update({
          where: { id: s.id },
          data: {
            lastRunAt: finishedAt,
            lastRunStatus: 'failed',
            lastRunError: `Invalid category "${s.category}" — update the schedule.`,
            runCount: { increment: 1 },
          },
        })
        return { scheduleId: s.id, ok: false, reason: 'invalid_category' }
      }

      let generateError: string | null = null
      let articleId: string | null = null
      try {
        const res = await generateAndSaveDraft({
          sport,
          category,
          topicHint: s.topicHint ?? undefined,
          contentType: category,
        })
        if (res.ok && res.articleId) {
          articleId = res.articleId
        } else {
          generateError = res.error ?? 'generate returned not-ok'
        }
      } catch (err) {
        generateError = err instanceof Error ? err.message : String(err)
      }

      let published = false
      let publishError: string | null = null
      if (articleId && s.autoPublish) {
        try {
          const pub = await publishArticle(articleId)
          if (pub.ok) {
            published = true
          } else {
            publishError = pub.error ?? 'publish returned not-ok'
          }
        } catch (err) {
          publishError = err instanceof Error ? err.message : String(err)
        }
      }

      const status = generateError ? 'failed' : 'ok'
      const errorMsg =
        generateError
          ? generateError.slice(0, 500)
          : publishError
            ? `Draft saved but publish failed: ${publishError}`.slice(0, 500)
            : null

      await (prisma as any).automatedBlogSchedule.update({
        where: { id: s.id },
        data: {
          lastRunAt: finishedAt,
          lastRunStatus: status,
          lastRunArticleId: articleId,
          lastRunError: errorMsg,
          runCount: { increment: 1 },
        },
      })

      return {
        scheduleId: s.id,
        ok: !generateError,
        articleId,
        published,
        error: errorMsg,
      }
    }),
  )

  const okCount = results.filter((r) => r.ok).length
  return NextResponse.json({
    ok: true,
    processed: results.length,
    ok_count: okCount,
    failed_count: results.length - okCount,
    startedAt: now.toISOString(),
    results,
  })
}

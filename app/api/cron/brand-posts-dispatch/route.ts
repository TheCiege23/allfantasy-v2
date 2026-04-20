import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireCronAuth } from '../_auth'
import { publishBrandPostById } from '@/lib/brand-social/publishBrandPost'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

const BATCH_SIZE = 20

/**
 * Fires every minute (configure in vercel.json). Finds `scheduled` posts whose
 * `scheduledFor` is due, atomically flips each to `publishing` via publishBrandPostById,
 * and persists the publish result. Safe to run concurrently — the claim inside
 * publishBrandPostById uses a WHERE filter so only one worker wins per row.
 */
export async function GET(req: NextRequest) {
  if (!requireCronAuth(req)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }
  return runDispatch()
}

/** Matches the POST shape of other cron endpoints for parity. */
export async function POST(req: NextRequest) {
  if (!requireCronAuth(req)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }
  return runDispatch()
}

async function runDispatch() {
  const now = new Date()

  let dueIds: string[] = []
  try {
    const due = await (prisma as any).brandSocialPost.findMany({
      where: { status: 'scheduled', scheduledFor: { lte: now } },
      orderBy: [{ scheduledFor: 'asc' }],
      take: BATCH_SIZE,
      select: { id: true },
    })
    dueIds = due.map((p: { id: string }) => p.id)
  } catch (err) {
    console.error('[cron/brand-posts-dispatch] findMany failed', err)
    return NextResponse.json({ ok: false, error: 'Failed to read scheduled posts' }, { status: 500 })
  }

  if (dueIds.length === 0) {
    return NextResponse.json({ ok: true, processed: 0, startedAt: now.toISOString() })
  }

  const results = await Promise.all(
    dueIds.map(async (id) => {
      try {
        const r = await publishBrandPostById(id)
        return { id, ok: r.ok, detail: r.ok ? (r.result.ok ? 'sent' : r.result.code) : r.code }
      } catch (err) {
        return { id, ok: false, detail: err instanceof Error ? err.message : 'unknown' }
      }
    }),
  )

  const sent = results.filter((r) => r.ok && r.detail === 'sent').length
  const failed = results.length - sent

  return NextResponse.json({
    ok: true,
    processed: results.length,
    sent,
    failed,
    startedAt: now.toISOString(),
    results,
  })
}

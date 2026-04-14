import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import {
  getSavedRecommendationById,
  unsaveRecommendation,
  updateRecommendationStatus,
  archiveRecommendation,
  isRecommendationStale,
} from '@/lib/saved-recommendations/SavedRecommendationsService'
import { recordChimmyQualityEvent } from '@/lib/chimmy-quality/ChimmyQualityAnalytics'

type RouteParams = { params: Promise<{ id: string }> }

// ─── GET /api/ai/saved-recommendations/[id] ─────────────────────────────────────

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const session = (await getServerSession(authOptions as any)) as {
    user?: { id?: string }
  } | null
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const rec = await getSavedRecommendationById(id, userId)
  if (!rec) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await recordChimmyQualityEvent({
    userId,
    leagueId: rec.leagueId,
    eventType: 'recommendation_reopened',
    meta: {
      recommendationId: rec.id,
      recommendationType: rec.recommendationType,
      sourceSurface: rec.sourceSurface,
    },
  })

  return NextResponse.json({ ok: true, recommendation: rec })
}

// ─── PATCH /api/ai/saved-recommendations/[id] ───────────────────────────────────
// Supports: status update, archive/unarchive, stale-check with fresh payload

const PatchBodySchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('set_status'),
    status: z.enum(['saved', 'acted_on', 'dismissed', 'stale']),
  }),
  z.object({
    action: z.literal('archive'),
    archive: z.boolean(),
  }),
  z.object({
    action: z.literal('check_stale'),
    /** Fresh payload from re-running Chimmy on the same context */
    freshPayload: z.record(z.unknown()),
  }),
])

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const session = (await getServerSession(authOptions as any)) as {
    user?: { id?: string }
  } | null
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = PatchBodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 422 })
  }

  const payload = parsed.data

  if (payload.action === 'set_status') {
    const ok = await updateRecommendationStatus(id, userId, payload.status)
    if (!ok) return NextResponse.json({ error: 'Update failed or rec not found' }, { status: 404 })

    if (payload.status === 'acted_on') {
      await recordChimmyQualityEvent({
        userId,
        eventType: 'recommendation_acted_on',
        meta: {
          recommendationId: id,
          status: payload.status,
        },
      })
    }

    return NextResponse.json({ ok: true })
  }

  if (payload.action === 'archive') {
    const ok = await archiveRecommendation(id, userId, payload.archive)
    if (!ok) return NextResponse.json({ error: 'Archive failed or rec not found' }, { status: 404 })
    return NextResponse.json({ ok: true })
  }

  if (payload.action === 'check_stale') {
    const rec = await getSavedRecommendationById(id, userId)
    if (!rec) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    const stale = isRecommendationStale(rec, payload.freshPayload)
    if (stale) {
      await updateRecommendationStatus(id, userId, 'stale')
      await recordChimmyQualityEvent({
        userId,
        leagueId: rec.leagueId,
        eventType: 'recommendation_marked_stale',
        meta: {
          recommendationId: id,
          recommendationType: rec.recommendationType,
          source: 'check_stale',
        },
      })
    }
    return NextResponse.json({ ok: true, isStale: stale })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}

// ─── DELETE /api/ai/saved-recommendations/[id] ──────────────────────────────────

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const session = (await getServerSession(authOptions as any)) as {
    user?: { id?: string }
  } | null
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const ok = await unsaveRecommendation(id, userId)
  if (!ok) return NextResponse.json({ error: 'Delete failed or rec not found' }, { status: 404 })

  return NextResponse.json({ ok: true })
}

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import {
  listSavedRecommendations,
  saveRecommendation,
} from '@/lib/saved-recommendations/SavedRecommendationsService'
import { recordChimmyQualityEvent } from '@/lib/chimmy-quality/ChimmyQualityAnalytics'

// ─── GET /api/ai/saved-recommendations ─────────────────────────────────────────

const ListQuerySchema = z.object({
  leagueId: z.string().optional(),
  sport: z.string().optional(),
  recommendationType: z.string().optional(),
  status: z.enum(['saved', 'acted_on', 'dismissed', 'stale']).optional(),
  isArchived: z.union([z.literal('true'), z.literal('false')]).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(24),
  offset: z.coerce.number().int().min(0).optional().default(0),
})

async function getCanonicalLeagueOptions(
  leagueIds: string[],
): Promise<Array<{ id: string; label: string }>> {
  if (leagueIds.length === 0) return []

  try {
    const leagues = await prisma.league.findMany({
      where: { id: { in: leagueIds } },
      select: {
        id: true,
        name: true,
        sport: true,
        platform: true,
      },
    })

    return leagues.map((league) => ({
      id: league.id,
      label:
        league.name?.trim() || `${String(league.sport).toUpperCase()} ${league.platform} League`,
    }))
  } catch (error) {
    console.error('[SavedRecommendationsAPI] league hydration failed:', error)
    return []
  }
}

export async function GET(request: NextRequest) {
  const session = (await getServerSession(authOptions as any)) as {
    user?: { id?: string }
  } | null
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const parsed = ListQuerySchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams.entries()),
  )
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid query', details: parsed.error.flatten() }, { status: 400 })
  }

  const { leagueId, sport, recommendationType, status, isArchived, limit, offset } = parsed.data

  const result = await listSavedRecommendations({
    userId,
    leagueId: leagueId ?? null,
    sport: sport ?? null,
    recommendationType: recommendationType as Parameters<typeof listSavedRecommendations>[0]['recommendationType'],
    status: status ?? null,
    isArchived: isArchived === 'true',
    limit,
    offset,
  })

  const fallbackLeagueOptions = result.items
    .filter((item) => typeof item.leagueId === 'string' && item.leagueId.length > 0)
    .map((item) => ({
      id: item.leagueId as string,
      label:
        (item.recommendationPayload?.leagueName as string | undefined) ??
        `League ${String(item.leagueId).slice(0, 8)}`,
    }))

  const canonicalLeagueOptions = await getCanonicalLeagueOptions(
    [...new Set(fallbackLeagueOptions.map((league) => league.id))],
  )

  const mergedLeagueOptions = new Map<string, { id: string; label: string }>()
  for (const league of fallbackLeagueOptions) mergedLeagueOptions.set(league.id, league)
  for (const league of canonicalLeagueOptions) mergedLeagueOptions.set(league.id, league)

  return NextResponse.json({
    ok: true,
    ...result,
    leagueOptions: [...mergedLeagueOptions.values()],
  })
}

// ─── POST /api/ai/saved-recommendations ─────────────────────────────────────────

const SaveBodySchema = z.object({
  leagueId: z.string().nullable().optional(),
  sport: z.string().min(1),
  leagueType: z.string().min(1),
  title: z.string().min(1).max(200),
  summary: z.string().max(800),
  recommendationType: z.enum([
    'waiver', 'trade', 'lineup', 'start_sit', 'draft',
    'player_comparison', 'matchup_simulation', 'roster_strategy',
    'story_draft', 'commissioner_announcement', 'league_health', 'general',
  ]),
  recommendationPayload: z.record(z.unknown()),
  explanation: z.string().max(4000),
  confidence: z.number().min(0).max(1).optional().default(0),
  riskLevel: z.enum(['low', 'medium', 'high', 'critical']).nullable().optional(),
  actions: z.array(z.record(z.unknown())).optional().default([]),
  sourceSurface: z.string().min(1),
  expiresAt: z.string().datetime({ offset: true }).nullable().optional(),
  isCommissionerRec: z.boolean().optional().default(false),
})

export async function POST(request: NextRequest) {
  const session = (await getServerSession(authOptions as any)) as {
    user?: { id?: string }
  } | null
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = SaveBodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 422 })
  }

  const input = parsed.data
  const saved = await saveRecommendation({
    userId,
    leagueId: input.leagueId ?? null,
    sport: input.sport,
    leagueType: input.leagueType,
    title: input.title,
    summary: input.summary,
    recommendationType: input.recommendationType,
    recommendationPayload: input.recommendationPayload,
    explanation: input.explanation,
    confidence: input.confidence,
    riskLevel: input.riskLevel ?? null,
    actions: (input.actions as unknown) as import('@/lib/chimmy-actions/AIActionModel').AIAction[],
    sourceSurface: input.sourceSurface,
    expiresAt: input.expiresAt ?? null,
    isCommissionerRec: input.isCommissionerRec,
  })

  if (!saved) {
    return NextResponse.json({ error: 'Failed to save recommendation' }, { status: 500 })
  }

  await recordChimmyQualityEvent({
    userId,
    leagueId: input.leagueId ?? null,
    eventType: 'recommendation_saved',
    meta: {
      recommendationId: saved.id,
      recommendationType: input.recommendationType,
      sourceSurface: input.sourceSurface,
    },
  })

  return NextResponse.json({ ok: true, saved }, { status: 201 })
}

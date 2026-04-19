import { NextRequest, NextResponse } from 'next/server'

import { withApiUsage } from '@/lib/telemetry/usage'
import { adminUnauthorized, isAuthorizedRequest } from '@/lib/adminAuth'
import { prisma } from '@/lib/prisma'
import { recomputeAfLearningSnapshots } from '@/lib/ai-learning-system/recomputeSnapshots'
import { resolveLearningLayersForPayload } from '@/lib/ai-learning-system/resolveLearningLayers'
import { normalizeToSupportedSport } from '@/lib/sport-scope'

export const dynamic = 'force-dynamic'

export const GET = withApiUsage({ endpoint: '/api/admin/af-learning', tool: 'AdminAfLearning' })(
  async (request: NextRequest) => {
    if (!isAuthorizedRequest(request)) return adminUnauthorized()

    const url = request.nextUrl
    const sport = normalizeToSupportedSport(url.searchParams.get('sport') ?? 'NFL')
    const userId = url.searchParams.get('userId')?.trim()
    const leagueId = url.searchParams.get('leagueId')?.trim() ?? null

    const recent = await prisma.afLearningEvent.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true,
        eventType: true,
        sport: true,
        leagueId: true,
        userId: true,
        source: true,
        createdAt: true,
      },
    })

    const [app, leagueSnap, userSnap, eventCount] = await Promise.all([
      prisma.afAppLearningSnapshot.findUnique({ where: { sport } }),
      leagueId
        ? prisma.afLeagueLearningSnapshot.findUnique({ where: { leagueId } })
        : Promise.resolve(null),
      userId
        ? prisma.afUserLearningProfile.findUnique({ where: { userId } })
        : Promise.resolve(null),
      prisma.afLearningEvent.count(),
    ])

    let resolvedPreview = null as Awaited<ReturnType<typeof resolveLearningLayersForPayload>> | null
    if (userId) {
      resolvedPreview = await resolveLearningLayersForPayload({
        userId,
        sport,
        leagueId,
      })
    }

    return NextResponse.json({
      sport,
      eventCount,
      recentEvents: recent,
      snapshots: {
        app,
        league: leagueSnap,
        user: userSnap,
      },
      resolvedPreview,
    })
  },
)

export const POST = withApiUsage({ endpoint: '/api/admin/af-learning', tool: 'AdminAfLearning' })(
  async (request: NextRequest) => {
    if (!isAuthorizedRequest(request)) return adminUnauthorized()

    let windowDays: number | undefined
    try {
      const body = await request.json().catch(() => ({}))
      if (body && typeof body === 'object' && typeof (body as { windowDays?: unknown }).windowDays === 'number') {
        windowDays = (body as { windowDays: number }).windowDays
      }
    } catch {
      windowDays = undefined
    }

    try {
      const result = await recomputeAfLearningSnapshots(
        windowDays != null && Number.isFinite(windowDays) ? { windowDays } : undefined,
      )
      return NextResponse.json({ ok: true, ...result })
    } catch (error) {
      console.error('[admin/af-learning] recompute', error)
      return NextResponse.json({ error: 'Recompute failed' }, { status: 500 })
    }
  },
)

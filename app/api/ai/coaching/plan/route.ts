import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { buildFallbackCoachingPlan } from '@/lib/ai/coaching/aiFranchisePlanner'
import type { StrategyLens } from '@/lib/ai/coaching/coachingPlanTypes'
import { mapLongTermAnalysisToCoachingPlan } from '@/lib/ai/coaching/mapLongTermAnalysisToCoachingPlan'
import { runLongTermCoaching } from '@/lib/long-term-coaching/runLongTermCoaching'
import type { LongTermStrategyMode } from '@/lib/long-term-coaching/types'
import { rateLimit, getClientIp } from '@/lib/rate-limit'
import { requireFeatureEntitlement } from '@/lib/subscription/entitlement-middleware'
import { withApiUsage } from '@/lib/telemetry/usage'

const bodySchema = z.object({
  leagueId: z.string().min(8).max(64),
  timelineYears: z.union([z.literal(2), z.literal(3), z.literal(4), z.literal(5)]),
  strategyLens: z.enum(['win_now', 'balanced', 'future_focused']).optional(),
  /** Optional; must match session user when provided. */
  userId: z.string().max(128).optional(),
})

function lensToStrategyMode(lens: StrategyLens | undefined): LongTermStrategyMode {
  if (lens === 'win_now') return 'compete_now'
  if (lens === 'future_focused') return 'soft_rebuild'
  return 'auto'
}

export const POST = withApiUsage({ endpoint: '/api/ai/coaching/plan', tool: 'AICoachingPlan' })(
  async (req: Request) => {
    const ip = getClientIp(req as never) || 'unknown'
    const rl = rateLimit(`ai-coach-plan:${ip}`, 14, 60_000)
    if (!rl.success) {
      return NextResponse.json({ error: 'Too many requests. Try again shortly.' }, { status: 429 })
    }

    const session = (await getServerSession(authOptions as never)) as {
      user?: { id?: string; email?: string | null }
    } | null
    const sessionUserId = session?.user?.id ?? null
    if (!sessionUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const json = await req.json().catch(() => null)
    const parsed = bodySchema.safeParse(json)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request body', details: parsed.error.flatten() }, { status: 400 })
    }

    if (parsed.data.userId && parsed.data.userId !== sessionUserId) {
      return NextResponse.json({ error: 'userId does not match session' }, { status: 403 })
    }

    const gate = await requireFeatureEntitlement({
      userId: sessionUserId,
      userEmail: session?.user?.email,
      featureId: 'league_ai_coaching',
      allowTokenFallback: false,
    })
    if (!gate.ok) return gate.response

    const strategyLens = (parsed.data.strategyLens ?? 'balanced') as StrategyLens
    const strategyMode = lensToStrategyMode(strategyLens)
    const leagueId = parsed.data.leagueId.trim()

    try {
      const result = await runLongTermCoaching({
        userId: sessionUserId,
        leagueId,
        horizonYears: parsed.data.timelineYears,
        strategyMode,
        teamExternalId: null,
        skipAi: false,
      })

      if (!result.ok) {
        const plan = buildFallbackCoachingPlan({
          timelineYears: parsed.data.timelineYears,
          strategyLens,
          leagueName: leagueId,
        })
        return NextResponse.json({
          ok: true,
          plan,
          usedFallback: true,
          fallbackReason: result.message,
          fallbackCode: result.code,
          aiModel: null as string | null,
        })
      }

      const plan = mapLongTermAnalysisToCoachingPlan(result.analysis, result.aiNarrative)

      return NextResponse.json({
        ok: true,
        plan,
        usedFallback: false,
        aiModel: result.aiModel,
      })
    } catch (e) {
      console.error('[ai-coaching/plan]', e)
      const plan = buildFallbackCoachingPlan({
        timelineYears: parsed.data.timelineYears,
        strategyLens,
        leagueName: leagueId,
      })
      return NextResponse.json({
        ok: true,
        plan,
        usedFallback: true,
        fallbackReason: 'Unexpected error — showing heuristic plan.',
        aiModel: null as string | null,
      })
    }
  },
)

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { runLongTermCoaching } from '@/lib/long-term-coaching/runLongTermCoaching'
import { rateLimit, getClientIp } from '@/lib/rate-limit'
import { withApiUsage } from '@/lib/telemetry/usage'
import { httpStatusForLeagueToolCode } from '@/lib/ai-tools/league-tool-access-messages'
import { requireFeatureEntitlement } from '@/lib/subscription/entitlement-middleware'

const bodySchema = z.object({
  leagueId: z.string().min(8).max(64),
  horizonYears: z.union([z.literal(2), z.literal(3), z.literal(4), z.literal(5)]),
  strategyMode: z.enum(['auto', 'compete_now', 'soft_rebuild', 'full_rebuild']),
  teamExternalId: z.string().max(128).nullable().optional(),
  skipAi: z.boolean().optional(),
})

export const POST = withApiUsage({ endpoint: '/api/ai-tools/long-term-coaching', tool: 'LongTermCoaching' })(
  async (req: Request) => {
    try {
      const ip = getClientIp(req as never) || 'unknown'
      const rl = rateLimit(`ltc:${ip}`, 12, 60_000)
      if (!rl.success) {
        return NextResponse.json({ error: 'Too many requests. Try again shortly.' }, { status: 429 })
      }

      const session = (await getServerSession(authOptions as never)) as {
        user?: { id?: string; email?: string | null }
      } | null
      const userId = session?.user?.id ?? null
      if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }

      const json = await req.json().catch(() => null)
      const parsed = bodySchema.safeParse(json)
      if (!parsed.success) {
        return NextResponse.json({ error: 'Invalid request body', details: parsed.error.flatten() }, { status: 400 })
      }

      /** AF Pro (`af_pro_monthly` / `af_pro_yearly` via Stripe) — see `league_ai_coaching` in feature monetization matrix. */
      const gate = await requireFeatureEntitlement({
        userId,
        userEmail: session?.user?.email,
        featureId: 'league_ai_coaching',
        allowTokenFallback: false,
      })
      if (!gate.ok) return gate.response

      const result = await runLongTermCoaching({
        userId,
        leagueId: parsed.data.leagueId.trim(),
        horizonYears: parsed.data.horizonYears,
        strategyMode: parsed.data.strategyMode,
        teamExternalId: parsed.data.teamExternalId?.trim() ?? null,
        skipAi: parsed.data.skipAi === true,
      })

      if (!result.ok) {
        const status = httpStatusForLeagueToolCode(
          result.code as Parameters<typeof httpStatusForLeagueToolCode>[0],
        )
        return NextResponse.json({ error: result.message, code: result.code }, { status })
      }

      return NextResponse.json({
        ok: true,
        analysis: result.analysis,
        aiNarrative: result.aiNarrative,
        aiModel: result.aiModel,
      })
    } catch (e) {
      console.error('[long-term-coaching]', e)
      return NextResponse.json({ error: 'Long-term coaching failed' }, { status: 500 })
    }
  },
)

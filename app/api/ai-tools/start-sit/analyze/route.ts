import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { withApiUsage } from '@/lib/telemetry/usage'
import { rateLimit, getClientIp } from '@/lib/rate-limit'
import { runStartSitAnalysis } from '@/lib/ai-tools-start-sit/runStartSitAnalysis'
import { SUPPORTED_SPORTS, type SupportedSport } from '@/lib/sport-scope'

const SPORT_FILTER = ['ALL', ...SUPPORTED_SPORTS] as const

const bodySchema = z.object({
  sportFilter: z.enum(SPORT_FILTER as unknown as [string, ...string[]]),
  leagueId: z.string().min(1).max(64).nullable(),
  week: z.string().min(1).max(16).default('current'),
  mode: z.enum(['balanced', 'safe', 'upside']),
  teamExternalId: z.string().max(128).nullable().optional(),
})

export const POST = withApiUsage({ endpoint: '/api/ai-tools/start-sit/analyze', tool: 'StartSit' })(
  async (req: Request) => {
    try {
      const ip = getClientIp(req as any) || 'unknown'
      const rl = rateLimit(`start-sit-analyze:${ip}`, 20, 60_000)
      if (!rl.success) {
        return NextResponse.json({ error: 'Too many requests. Try again shortly.' }, { status: 429 })
      }

      const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
      const userId = session?.user?.id ?? null
      if (!userId) {
        return NextResponse.json({ error: 'Sign in required' }, { status: 401 })
      }

      const json = await req.json().catch(() => null)
      const parsed = bodySchema.safeParse(json)
      if (!parsed.success) {
        return NextResponse.json({ error: 'Invalid request', details: parsed.error.flatten() }, { status: 400 })
      }

      const out = await runStartSitAnalysis({
        userId,
        sportFilter: parsed.data.sportFilter as SupportedSport | 'ALL',
        leagueId: parsed.data.leagueId,
        week: parsed.data.week,
        mode: parsed.data.mode,
        teamExternalId: parsed.data.teamExternalId ?? null,
      })

      if (!out.ok) {
        const status =
          out.code === 'FORBIDDEN' ? 403 : out.code === 'NO_LEAGUE' || out.code === 'NO_ROSTER' ? 400 : 400
        return NextResponse.json(out, { status })
      }

      return NextResponse.json(out)
    } catch (e) {
      console.error('[start-sit/analyze]', e)
      return NextResponse.json({ error: 'Start/Sit analysis failed.' }, { status: 500 })
    }
  },
)

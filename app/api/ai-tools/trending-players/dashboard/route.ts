import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { withApiUsage } from '@/lib/telemetry/usage'
import { rateLimit, getClientIp } from '@/lib/rate-limit'
import { runTrendingDashboard } from '@/lib/trending-players/runTrendingDashboard'
import { SUPPORTED_SPORTS } from '@/lib/sport-scope'
import { httpStatusForLeagueToolCode } from '@/lib/ai-tools/league-tool-access-messages'

const SPORT_FILTER = ['ALL', ...SUPPORTED_SPORTS] as const

const TREND_TYPES = [
  'all',
  'add',
  'drop',
  'start',
  'sit',
  'trade',
  'performance',
  'usage',
  'injury_replacement',
  'rookie',
] as const

const TIME_WINDOWS = [
  'today',
  '24h',
  '3d',
  '7d',
  '14d',
  '30d',
  'season',
  'dynasty_long',
] as const

const CONTEXT_MODES = [
  'general',
  'my_leagues',
  'my_team',
  'league_wide',
  'opponent_watch',
  'waiver_watch',
  'trade_market',
  'start_sit_market',
] as const

const bodySchema = z.object({
  sportFilter: z.enum(SPORT_FILTER as unknown as [string, ...string[]]),
  leagueId: z.string().min(1).max(64).nullable().optional(),
  trendType: z.enum(TREND_TYPES as unknown as [string, ...string[]]),
  position: z.string().min(1).max(24).default('ALL'),
  rookiesOnly: z.boolean().optional().default(false),
  timeWindow: z.enum(TIME_WINDOWS as unknown as [string, ...string[]]),
  contextMode: z.enum(CONTEXT_MODES as unknown as [string, ...string[]]),
  limitPerSide: z.number().min(4).max(20).optional(),
  skipAi: z.boolean().optional(),
})

export const POST = withApiUsage({ endpoint: '/api/ai-tools/trending-players/dashboard', tool: 'TrendingPlayers' })(
  async (req: Request) => {
    try {
      const ip = getClientIp(req as any) || 'unknown'
      const rl = rateLimit(`trending-dashboard:${ip}`, 25, 60_000)
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

      const out = await runTrendingDashboard({
        userId,
        sportFilter: parsed.data.sportFilter as any,
        leagueId: parsed.data.leagueId ?? null,
        trendType: parsed.data.trendType as any,
        position: parsed.data.position,
        rookiesOnly: parsed.data.rookiesOnly ?? false,
        timeWindow: parsed.data.timeWindow as any,
        contextMode: parsed.data.contextMode as any,
        limitPerSide: parsed.data.limitPerSide,
        skipAi: parsed.data.skipAi,
      })

      if (!out.ok) {
        const status = httpStatusForLeagueToolCode(out.code)
        return NextResponse.json(out, { status })
      }

      return NextResponse.json(out)
    } catch (e) {
      console.error('[trending-players/dashboard]', e)
      return NextResponse.json({ error: 'Trending dashboard failed.' }, { status: 500 })
    }
  },
)

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { runPowerRankingsDashboard } from '@/lib/power-rankings-dashboard'
import { rateLimit, getClientIp } from '@/lib/rate-limit'
import { withApiUsage } from '@/lib/telemetry/usage'
import { SUPPORTED_SPORTS } from '@/lib/sport-scope'
import { httpStatusForLeagueToolCode } from '@/lib/ai-tools/league-tool-access-messages'
import { RANKING_MODE_IDS, type RankingModeId } from '@/lib/power-rankings-dashboard/types'

const SPORT_FILTER = ['ALL', ...SUPPORTED_SPORTS] as const

const TIME_WINDOWS = ['this_week', 'last_2', 'last_4', 'season', 'playoff_window', 'dynasty_long'] as const

const TEAM_CONTEXTS = [
  'full_league',
  'my_team',
  'specific_team',
  'division',
  'playoff_teams',
  'bubble',
  'bottom',
] as const

const bodySchema = z.object({
  sportFilter: z.enum(SPORT_FILTER as unknown as [string, ...string[]]),
  leagueId: z.string().max(64).nullable(),
  rankingMode: z.enum(RANKING_MODE_IDS as unknown as [string, ...string[]]),
  timeWindow: z.enum(TIME_WINDOWS),
  teamContext: z.enum(TEAM_CONTEXTS),
  specificTeamExternalId: z.string().max(128).nullable().optional(),
  week: z.number().int().min(1).max(24).nullable().optional(),
  skipAi: z.boolean().optional(),
  toggles: z.object({
    includeProjections: z.boolean(),
    includeScheduleStrength: z.boolean(),
    includeInjuries: z.boolean(),
    includeTransactionMomentum: z.boolean(),
    includeRookies: z.boolean(),
    includePlayoffHistory: z.boolean(),
    includeRecentForm: z.boolean(),
    includeDynastyWeighting: z.boolean(),
  }),
})

export const dynamic = 'force-dynamic'

export const POST = withApiUsage({ endpoint: '/api/ai-tools/power-rankings/dashboard', tool: 'PowerRankings' })(
  async (req: Request) => {
    try {
      const ip = getClientIp(req as never) || 'unknown'
      const rl = rateLimit(`power-rankings-dashboard:${ip}`, 25, 60_000)
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

      const out = await runPowerRankingsDashboard({
        userId,
        sportFilter: parsed.data.sportFilter,
        leagueId: parsed.data.leagueId?.trim() ? parsed.data.leagueId.trim() : null,
        rankingMode: parsed.data.rankingMode as RankingModeId,
        timeWindow: parsed.data.timeWindow,
        teamContext: parsed.data.teamContext,
        specificTeamExternalId: parsed.data.specificTeamExternalId ?? null,
        week: parsed.data.week ?? null,
        toggles: parsed.data.toggles,
        skipAi: parsed.data.skipAi,
      })

      if (!out.ok) {
        const status = httpStatusForLeagueToolCode(out.code)
        return NextResponse.json(out, { status })
      }

      return NextResponse.json(out)
    } catch (e) {
      console.error('[power-rankings/dashboard]', e)
      return NextResponse.json({ error: 'Power rankings failed.' }, { status: 500 })
    }
  },
)

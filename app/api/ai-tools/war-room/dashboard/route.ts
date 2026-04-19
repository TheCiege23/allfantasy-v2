import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { runWarRoomCommandCenter } from '@/lib/war-room-command-center'
import { rateLimit, getClientIp } from '@/lib/rate-limit'
import { withApiUsage } from '@/lib/telemetry/usage'
import { SUPPORTED_SPORTS } from '@/lib/sport-scope'
import { httpStatusForLeagueToolCode } from '@/lib/ai-tools/league-tool-access-messages'

const SPORT_FILTER = ['ALL', ...SUPPORTED_SPORTS] as const

const TEAM_CONTEXTS = [
  'my_team',
  'specific_team',
  'league_wide',
  'opponent_view',
  'full_portfolio',
] as const

const STRATEGIES = [
  'balanced',
  'win_now',
  'aggressive',
  'conservative',
  'rebuilder',
  'playoff_push',
  'streaming_focus',
  'prospect_focus',
  'dynasty_long_term',
  'neutral',
] as const

const TIME_HORIZONS = [
  'today',
  'this_week',
  'next_2_weeks',
  'next_month',
  'rest_of_season',
  'playoff_window',
  'dynasty_long',
] as const

const bodySchema = z.object({
  sportFilter: z.enum(SPORT_FILTER as unknown as [string, ...string[]]),
  leagueId: z.string().max(64).nullable(),
  teamContext: z.enum(TEAM_CONTEXTS),
  strategyMode: z.enum(STRATEGIES),
  timeHorizon: z.enum(TIME_HORIZONS),
  specificTeamExternalId: z.string().max(128).nullable().optional(),
  opponentTeamExternalId: z.string().max(128).nullable().optional(),
  skipAi: z.boolean().optional(),
  toggles: z.object({
    includeNews: z.boolean(),
    includeInjuries: z.boolean(),
    includeWaiverSuggestions: z.boolean(),
    includeTradeSuggestions: z.boolean(),
    includeStartSitRecommendations: z.boolean(),
    includePowerRankings: z.boolean(),
    includeTrendingPlayers: z.boolean(),
    includeRookieProspectIntel: z.boolean(),
    includePlayoffImpact: z.boolean(),
    includeDynastyWeighting: z.boolean(),
    includeMatchupPrep: z.boolean().optional().default(true),
    includeTodayActions: z.boolean().optional().default(true),
  }),
})

export const POST = withApiUsage({ endpoint: '/api/ai-tools/war-room/dashboard', tool: 'WarRoom' })(
  async (req: Request) => {
    try {
      const ip = getClientIp(req as never) || 'unknown'
      const rl = rateLimit(`war-room-dashboard:${ip}`, 15, 60_000)
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

      const out = await runWarRoomCommandCenter({
        userId,
        sportFilter: parsed.data.sportFilter,
        leagueId: parsed.data.leagueId?.trim() ? parsed.data.leagueId.trim() : null,
        teamContext: parsed.data.teamContext,
        strategyMode: parsed.data.strategyMode,
        timeHorizon: parsed.data.timeHorizon,
        specificTeamExternalId: parsed.data.specificTeamExternalId ?? null,
        opponentTeamExternalId: parsed.data.opponentTeamExternalId ?? null,
        toggles: parsed.data.toggles,
        skipAi: parsed.data.skipAi,
      })

      if (!out.ok) {
        const status = httpStatusForLeagueToolCode(out.code)
        return NextResponse.json(out, { status })
      }

      return NextResponse.json(out)
    } catch (e) {
      console.error('[war-room/dashboard]', e)
      return NextResponse.json({ error: 'War Room failed.' }, { status: 500 })
    }
  },
)

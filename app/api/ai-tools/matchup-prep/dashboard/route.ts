import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { runMatchupPrepDashboard } from '@/lib/matchup-prep-dashboard'
import { rateLimit, getClientIp } from '@/lib/rate-limit'
import { withApiUsage } from '@/lib/telemetry/usage'
import { SUPPORTED_SPORTS } from '@/lib/sport-scope'
import { httpStatusForLeagueToolCode } from '@/lib/ai-tools/league-tool-access-messages'

const SPORT_FILTER = ['ALL', ...SUPPORTED_SPORTS] as const

const TEAM_FOCUS = ['my_team', 'specific_team'] as const

const TIME_HORIZONS = [
  'this_matchup',
  'next_matchup',
  'next_2_matchups',
  'playoff_window',
  'rest_of_season',
] as const

const STRATEGIES = [
  'balanced',
  'high_upside',
  'safe_floor',
  'aggressive',
  'injury_protected',
  'streaming_focus',
  'playoff_prep',
  'neutral',
] as const

const bodySchema = z.object({
  sportFilter: z.enum(SPORT_FILTER as unknown as [string, ...string[]]),
  leagueId: z.string().max(64).nullable(),
  teamFocus: z.enum(TEAM_FOCUS),
  teamExternalId: z.string().max(128).nullable().optional(),
  opponentExternalId: z.string().max(128).nullable().optional(),
  timeHorizon: z.enum(TIME_HORIZONS),
  strategyMode: z.enum(STRATEGIES),
  skipAi: z.boolean().optional(),
  toggles: z.object({
    includeLiveNews: z.boolean(),
    includeInjuries: z.boolean(),
    includeScheduleAdjustments: z.boolean(),
    includeWeather: z.boolean(),
    includeStreamingRecommendations: z.boolean(),
    includeOpponentTrendAnalysis: z.boolean(),
    includePlayoffContext: z.boolean(),
    includeRookieProspectContext: z.boolean(),
  }),
})

export const POST = withApiUsage({ endpoint: '/api/ai-tools/matchup-prep/dashboard', tool: 'MatchupPrep' })(
  async (req: Request) => {
    try {
      const ip = getClientIp(req as never) || 'unknown'
      const rl = rateLimit(`matchup-prep-dashboard:${ip}`, 18, 60_000)
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

      const out = await runMatchupPrepDashboard({
        userId,
        sportFilter: parsed.data.sportFilter,
        leagueId: parsed.data.leagueId?.trim() ? parsed.data.leagueId.trim() : null,
        teamFocus: parsed.data.teamFocus,
        teamExternalId: parsed.data.teamExternalId ?? null,
        opponentExternalId: parsed.data.opponentExternalId ?? null,
        timeHorizon: parsed.data.timeHorizon,
        strategyMode: parsed.data.strategyMode,
        toggles: parsed.data.toggles,
        skipAi: parsed.data.skipAi,
      })

      if (!out.ok) {
        const status = httpStatusForLeagueToolCode(out.code)
        return NextResponse.json(out, { status })
      }

      return NextResponse.json(out)
    } catch (e) {
      console.error('[matchup-prep/dashboard]', e)
      return NextResponse.json({ error: 'Matchup prep failed.' }, { status: 500 })
    }
  },
)

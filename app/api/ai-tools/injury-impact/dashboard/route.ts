import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { runInjuryImpactDashboard } from '@/lib/injury-impact-dashboard'
import { rateLimit, getClientIp } from '@/lib/rate-limit'
import { withApiUsage } from '@/lib/telemetry/usage'
import { SUPPORTED_SPORTS } from '@/lib/sport-scope'

const SPORT_FILTER = ['ALL', ...SUPPORTED_SPORTS] as const

const TEAM_CONTEXTS = [
  'my_team',
  'specific_team',
  'full_league',
  'opponent_team',
  'league_wide_risk',
  'neutral',
] as const

const STATUS_FILTERS = [
  'all',
  'healthy_monitoring',
  'questionable',
  'doubtful',
  'out',
  'ir',
  'suspended',
  'gtd',
  'day_to_day',
  'week_to_week',
  'long_term',
  'returning_soon',
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
  specificTeamExternalId: z.string().max(128).nullable().optional(),
  opponentTeamExternalId: z.string().max(128).nullable().optional(),
  statusFilter: z.enum(STATUS_FILTERS),
  timeHorizon: z.enum(TIME_HORIZONS),
  skipAi: z.boolean().optional(),
  toggles: z.object({
    includePractice: z.boolean(),
    includeNews: z.boolean(),
    includeReturnTimelines: z.boolean(),
    includeHandcuffs: z.boolean(),
    includePlayoffImpact: z.boolean(),
    includeDynastyImpact: z.boolean(),
  }),
})

export const POST = withApiUsage({ endpoint: '/api/ai-tools/injury-impact/dashboard', tool: 'InjuryImpact' })(
  async (req: Request) => {
    try {
      const ip = getClientIp(req as never) || 'unknown'
      const rl = rateLimit(`injury-impact-dashboard:${ip}`, 20, 60_000)
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

      const out = await runInjuryImpactDashboard({
        userId,
        sportFilter: parsed.data.sportFilter,
        leagueId: parsed.data.leagueId?.trim() ? parsed.data.leagueId.trim() : null,
        teamContext: parsed.data.teamContext,
        specificTeamExternalId: parsed.data.specificTeamExternalId ?? null,
        opponentTeamExternalId: parsed.data.opponentTeamExternalId ?? null,
        statusFilter: parsed.data.statusFilter,
        timeHorizon: parsed.data.timeHorizon,
        toggles: parsed.data.toggles,
        skipAi: parsed.data.skipAi,
      })

      if (!out.ok) {
        const status = out.code === 'FORBIDDEN' ? 403 : 400
        return NextResponse.json(out, { status })
      }

      return NextResponse.json(out)
    } catch (e) {
      console.error('[injury-impact/dashboard]', e)
      return NextResponse.json({ error: 'Injury impact failed.' }, { status: 500 })
    }
  },
)

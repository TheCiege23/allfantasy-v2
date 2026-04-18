import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { withApiUsage } from '@/lib/telemetry/usage'
import { rateLimit, getClientIp } from '@/lib/rate-limit'
import { runWaiverIntelligenceAnalysis } from '@/lib/ai-tools-waiver/waiver-intelligence'
import { SUPPORTED_SPORTS, type SupportedSport } from '@/lib/sport-scope'

const SPORT_FILTER = ['ALL', ...SUPPORTED_SPORTS] as const

const bodySchema = z.object({
  sportFilter: z.enum(SPORT_FILTER as unknown as [string, ...string[]]),
  leagueId: z.string().min(1).max(64).nullable().optional(),
  position: z.string().min(1).max(24).default('ALL'),
  rookiesOnly: z.boolean().optional().default(false),
  strategy: z.enum([
    'best_available',
    'win_now',
    'safe_floor',
    'upside',
    'rebuilder',
    'streamers',
    'stash',
    'injury_replacement',
    'prospect_build',
    'neutral',
  ]),
  teamContext: z.enum(['my_team', 'specific_team', 'league_wide', 'neutral']),
  timeHorizon: z.enum(['this_week', 'two_weeks', 'month', 'ros', 'dynasty']),
})

export const POST = withApiUsage({ endpoint: '/api/ai-tools/waiver-intelligence', tool: 'WaiverIntelligence' })(
  async (req: Request) => {
    try {
      const ip = getClientIp(req as any) || 'unknown'
      const rl = rateLimit(`waiver-intel:${ip}`, 25, 60_000)
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

      const out = await runWaiverIntelligenceAnalysis({
        userId,
        ...parsed.data,
        sportFilter: parsed.data.sportFilter as SupportedSport | 'ALL',
        leagueId: parsed.data.leagueId ?? null,
      })

      if (!out.ok) {
        const status = out.code === 'FORBIDDEN' ? 403 : out.code === 'NOT_FOUND' ? 404 : 400
        return NextResponse.json(out, { status })
      }

      return NextResponse.json(out)
    } catch (e) {
      console.error('[waiver-intelligence]', e)
      return NextResponse.json({ error: 'Waiver analysis failed.' }, { status: 500 })
    }
  },
)

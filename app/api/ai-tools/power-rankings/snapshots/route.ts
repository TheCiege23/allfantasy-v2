import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { leagueToolAccessUserMessage, httpStatusForLeagueToolCode } from '@/lib/ai-tools/league-tool-access-messages'
import { assertLeagueMemberWithCode } from '@/lib/league/league-access'
import { getPowerRankingSnapshotsForLeague } from '@/lib/power-rankings-dashboard/getPowerRankingSnapshotsForLeague'
import { rateLimit, getClientIp } from '@/lib/rate-limit'
import { withApiUsage } from '@/lib/telemetry/usage'
import type { RankingModeId } from '@/lib/power-rankings-dashboard/types'
import { RANKING_MODE_IDS } from '@/lib/power-rankings-dashboard/types'
import { buildRankTrailForExternalId } from '@/lib/power-rankings-dashboard/snapshotTeamRow'

/** Uses session, rate-limit IP from headers, and DB — must not be statically analyzed at build time. */
export const dynamic = 'force-dynamic'

export const GET = withApiUsage({ endpoint: '/api/ai-tools/power-rankings/snapshots', tool: 'PowerRankings' })(
  async (req: NextRequest) => {
    try {
      const ip = getClientIp(req as never) || 'unknown'
      const rl = rateLimit(`power-rankings-snapshots:${ip}`, 40, 60_000)
      if (!rl.success) {
        return NextResponse.json({ error: 'Too many requests.' }, { status: 429 })
      }

      const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
      const userId = session?.user?.id ?? null
      if (!userId) {
        return NextResponse.json({ error: 'Sign in required' }, { status: 401 })
      }

      const leagueId = req.nextUrl.searchParams.get('leagueId')?.trim()
      if (!leagueId) {
        return NextResponse.json({ error: 'Missing leagueId' }, { status: 400 })
      }

      const access = await assertLeagueMemberWithCode(leagueId, userId)
      if (!access.ok) {
        const code = access.code
        const msg = leagueToolAccessUserMessage(code)
        return NextResponse.json(
          { ok: false as const, error: msg, code, userMessage: msg },
          { status: httpStatusForLeagueToolCode(code) },
        )
      }

      const limitRaw = req.nextUrl.searchParams.get('limit')
      const limit = limitRaw ? Number.parseInt(limitRaw, 10) : 16
      const rankingModeParam = req.nextUrl.searchParams.get('rankingMode')?.trim()
      const rankingMode: RankingModeId =
        rankingModeParam && (RANKING_MODE_IDS as readonly string[]).includes(rankingModeParam)
          ? (rankingModeParam as RankingModeId)
          : 'current_power'

      const rows = await getPowerRankingSnapshotsForLeague({
        leagueId,
        rankingMode,
        limit: Number.isFinite(limit) ? limit : 16,
      })

      const teamExternalId = req.nextUrl.searchParams.get('teamExternalId')?.trim() ?? null
      const forTrail = rows.map((r) => ({ teams: r.teams, computedAt: r.computedAt }))
      const lim = Math.min(24, Number.isFinite(limit) ? limit : 16)

      return NextResponse.json({
        ok: true as const,
        leagueId,
        rankingMode,
        teamExternalId: teamExternalId || undefined,
        ...(teamExternalId && teamExternalId.length > 0
          ? {
              rankTrail: buildRankTrailForExternalId(forTrail, teamExternalId, lim),
            }
          : {}),
        snapshots: rows.map((r) => ({
          id: r.id,
          season: r.season,
          week: r.week,
          rankingMode: r.rankingMode,
          engine: r.engine,
          computedAt: r.computedAt.toISOString(),
          teams: r.teams,
        })),
      })
    } catch (e) {
      console.error('[power-rankings/snapshots]', e)
      return NextResponse.json({ error: 'Failed to load snapshots.' }, { status: 500 })
    }
  },
)

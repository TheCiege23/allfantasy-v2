/**
 * GET /api/cron/live-score-tick — scheduled live-scoring tick (G11 Phase 3b).
 *
 * Drives the reusable live-scoring orchestrator for every active redraft season via
 * the real NFL provider: poll only active games, persist only changed stat lines,
 * rescore only affected matchups/standings, broadcast only affected entities over
 * SSE. Cron-auth protected + instrumented (SyncJobRun). Idempotent — an unchanged
 * poll does no writes. The 5-minute full score-sync remains as a reconciliation/
 * correction fallback.
 */
import { NextResponse, type NextRequest } from 'next/server'
import { requireCronAuth } from '@/app/api/cron/_auth'
import { prisma } from '@/lib/prisma'
import { withSyncJobRun } from '@/lib/production-health/syncJobRunTelemetry'
import { runLiveScoringForActiveSeasons } from '@/server/services/liveScoring/liveScoreRunner'
import { RollingInsightsLiveProvider } from '@/lib/live/rollingInsightsLiveProvider'

/**
 * Opt-in Rolling Insights live provider, PRESEASON ONLY.
 *
 * ⚠ OFF UNLESS `LIVE_PROVIDER_RI_PRESEASON=1`. This swaps the data source under a
 * live-scoring path that already works: the incumbent NflLiveStatsProvider reads
 * prisma.sportsGame, filled by import-scores from API-Sports. A silent default
 * change here would alter every active league's scoring with no way to attribute
 * a regression. The flag exists so the swap can be turned off in one env edit
 * rather than a redeploy.
 *
 * ⚠ AND THE PROVIDER ITSELF IS SCOPED TO PRESEASON, so even with the flag ON it
 * returns nothing for a regular-season game — belt and braces, because the flag
 * protects the rollout while the scope protects the users.
 *
 * What it buys: PLAYER-LEVEL live stats. The DB path carries team scores; RI's
 * live feed carries per-player box lines, which is what fantasy scoring needs.
 *
 * ⚠ Construction THROWS without ROLLING_INSIGHTS_RSC_TOKEN (CLIENT_SECRET2 is the
 * other-sports credential and 304s forever against NFL). Caught here so a missing
 * token degrades to the incumbent provider instead of failing the whole tick.
 */
function resolveLiveProvider() {
  if (process.env.LIVE_PROVIDER_RI_PRESEASON !== '1') return undefined
  try {
    return new RollingInsightsLiveProvider({ scope: 'preseason' })
  } catch (err) {
    console.error('[live-score-tick] RI provider unavailable, falling back:', err)
    return undefined
  }
}

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  // `requireCronAuth` resolves `preferredSecretEnv ?? LEAGUE_CRON_SECRET ?? CRON_SECRET`, and
  // LEAGUE_CRON_SECRET is set in production — so a BARE call compares Vercel's
  // `Authorization: Bearer $CRON_SECRET` against the wrong variable and 401s. This route is
  // scheduled `*/2` and was doing exactly that: 60 invocations / 60 x 401 in a 2h production
  // sample, never once running. Naming CRON_SECRET explicitly is the same fix as #289.
  if (!requireCronAuth(request, 'CRON_SECRET')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const provider = resolveLiveProvider()
    const report = await withSyncJobRun(
      {
        jobName: 'cron-live-score-tick',
        trigger: 'cron',
        // Telemetry records WHICH provider ran, so a scoring anomaly can be
        // attributed to the swap rather than guessed at.
        provider: provider ? 'rolling_insights_preseason' : 'sleeper',
        sport: 'NFL',
      },
      async () => runLiveScoringForActiveSeasons(prisma, provider ? { provider } : {}),
      (r) => ({
        rowsRead: r.ticked,
        rowsUpdated: r.summaries.reduce((s, x) => s + x.affectedMatchups, 0),
        status: 'success',
        metadata: {
          seasonsTicked: r.ticked,
          seasonsPolled: r.polled,
          liveProvider: provider ? 'rolling_insights_preseason' : 'sleeper',
        },
      }),
    )
    return NextResponse.json({ ok: true, ...report, ranAt: new Date().toISOString() })
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : 'live-score-tick failed' },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  return GET(request)
}

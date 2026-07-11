/**
 * Phase 4.3 — Historical Intelligence Backfill: snapshot capture.
 *
 * `captureLeagueSnapshotHistory()` (lib/decision-os/behavioral/history/snapshots.ts)
 * has existed since Phase 3.3 but no caller in the codebase ever invokes it —
 * confirmed by repo-wide search. This script is the missing invocation: it
 * computes real league intelligence via `realDataProvider.getLeagueIntelligence`
 * (the same function the live API route calls) and persists it as one real,
 * timestamped history point. No values are invented — everything captured is
 * exactly what the real derivation pipeline produced from real event data at
 * the moment this script ran.
 *
 * Intended to be run more than once over time (e.g. as a scheduled job in
 * production) so `computeLeagueTrend()` has the >=2 real points it requires.
 *
 * Run: node --env-file=.env --require ./scripts/_audit-preload.cjs --import tsx scripts/capture-decision-os-snapshots.ts
 */

import { prisma } from '@/lib/prisma'
import { realDataProvider } from '@/lib/decision-os/behavioral/api/real-data-provider'
import { captureLeagueSnapshotHistory } from '@/lib/decision-os/behavioral/history/snapshots'

const OWNER_APP_USER_ID = '9791bae0-e47f-418a-ae40-285f6a2e7887' // TheCiege26

async function main() {
  const rosters = await prisma.roster.findMany({
    where: { platformUserId: OWNER_APP_USER_ID },
    select: { leagueId: true },
  })
  const leagueIds = rosters.map((r) => r.leagueId)
  const leagues = await prisma.league.findMany({
    where: { id: { in: leagueIds }, platform: 'sleeper' },
    select: { id: true, name: true },
  })

  for (const league of leagues) {
    const intel = await realDataProvider.getLeagueIntelligence(league.id)
    if (!intel) {
      console.log(`${league.name} (${league.id}): getLeagueIntelligence returned null, skipping capture`)
      continue
    }
    await captureLeagueSnapshotHistory(intel)
    console.log(
      `${league.name} (${league.id}): captured snapshot — engagementScore=${Math.round(intel.leagueEngagementScore)} tier=${intel.leagueEngagementTier} tradeRate=${intel.tradeActivity.perManagerRate} waiverRate=${intel.waiverActivity.perManagerRate} draftRate=${intel.draftActivity.perManagerRate}`
    )
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })

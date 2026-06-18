/**
 * Sync Rolling Insights NFL source tables, then generate canonical AF projections.
 *
 * Usage:
 *   node --env-file=.env --require ./scripts/_audit-preload.cjs --import tsx scripts/sync-rolling-insights-nfl-foundation.ts -- --season=2026 --week=1 --json
 */

import { prisma } from '../lib/prisma'
import {
  syncNFLDepthChartsToDb,
  syncNFLPlayersToDb,
  syncNFLScheduleToDb,
  syncNFLTeamsToDb,
  syncNFLTeamStatsToDb,
} from '../lib/rolling-insights'
import { generateAndPersistCanonicalNflProjections } from '../lib/nfl-data-foundation/nflDataFoundationService'
import { getCanonicalNflDataCoverage } from '../lib/nfl-data-foundation/nflDataCoverage'

type Args = {
  json: boolean
  season: number
  week: number
  limit: number
  skipProviderSync: boolean
}

function parseArgs(argv: string[]): Args {
  const now = new Date()
  const out: Args = {
    json: false,
    season: now.getUTCFullYear(),
    week: 1,
    limit: 500,
    skipProviderSync: false,
  }
  for (const raw of argv) {
    if (raw === '--json') out.json = true
    else if (raw === '--skip-provider-sync') out.skipProviderSync = true
    else if (raw.startsWith('--season=')) {
      const parsed = Number(raw.slice('--season='.length))
      if (Number.isFinite(parsed) && parsed > 2000) out.season = Math.trunc(parsed)
    } else if (raw.startsWith('--week=')) {
      const parsed = Number(raw.slice('--week='.length))
      if (Number.isFinite(parsed) && parsed > 0) out.week = Math.trunc(parsed)
    } else if (raw.startsWith('--limit=')) {
      const parsed = Number(raw.slice('--limit='.length))
      if (Number.isFinite(parsed) && parsed > 0) out.limit = Math.min(Math.trunc(parsed), 5000)
    }
  }
  return out
}

function rollingInsightsSeason(season: number): string {
  return `${season}-${season + 1}`
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const riSeason = rollingInsightsSeason(args.season)
  const providerCounts = {
    teams: 0,
    players: 0,
    schedule: 0,
    depthCharts: 0,
    teamStats: 0,
  }

  if (!args.skipProviderSync) {
    providerCounts.teams = await syncNFLTeamsToDb()
    providerCounts.players = await syncNFLPlayersToDb({ season: riSeason })
    providerCounts.schedule = await syncNFLScheduleToDb({ season: riSeason })
    providerCounts.depthCharts = await syncNFLDepthChartsToDb({ season: riSeason })
    providerCounts.teamStats = await syncNFLTeamStatsToDb({ season: riSeason })
  }

  const projections = await generateAndPersistCanonicalNflProjections({
    season: args.season,
    week: args.week,
    limit: args.limit,
  })
  const coverage = await getCanonicalNflDataCoverage({ season: args.season, week: args.week })
  const result = {
    ok: true,
    generatedAt: new Date().toISOString(),
    season: args.season,
    week: args.week,
    rollingInsightsSeason: riSeason,
    providerSyncSkipped: args.skipProviderSync,
    providerCounts,
    projections,
    coverage,
  }

  if (args.json) {
    console.log(JSON.stringify(result, null, 2))
    return
  }

  console.log(`NFL foundation sync complete for season ${args.season}, week ${args.week}`)
  console.log(`Provider rows: ${JSON.stringify(providerCounts)}`)
  console.log(`Projections: generated=${projections.generated} persisted=${projections.persisted} skipped=${projections.skipped}`)
  console.log(`Coverage missing: ${coverage.missingFields.join(', ') || 'none'}`)
  console.log(`Coverage stale: ${coverage.staleFields.join(', ') || 'none'}`)
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect().catch(() => undefined)
  })

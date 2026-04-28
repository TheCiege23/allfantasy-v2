/**
 * Audit + optional sync for API-Sports player season stats persistence.
 *
 * Default mode is dry-run (no DB writes).
 *
 * Usage:
 *   node --env-file=.env --require ./scripts/_audit-preload.cjs --import tsx scripts/audit-api-sports-player-stats.ts
 *   node --env-file=.env --require ./scripts/_audit-preload.cjs --import tsx scripts/audit-api-sports-player-stats.ts --season=2025 --sport=NFL --limit=50
 *   node --env-file=.env --require ./scripts/_audit-preload.cjs --import tsx scripts/audit-api-sports-player-stats.ts --apply --season=2025
 */

import { PrismaClient } from '@prisma/client'
import {
  getCurrentNFLSeasonForAPISports,
  syncAPISportsPlayerSeasonStatsToDb,
  type APISportsPlayerSeasonStatsSyncSummary,
} from '../lib/api-sports'

const prisma = new PrismaClient()

type SportTag = 'NFL' | 'NCAAF'

interface Args {
  apply: boolean
  season: string
  sport: SportTag
  limitPlayers: number | null
  requireIdentity: boolean
  json: boolean
}

function parseArgs(argv: string[]): Args {
  const out: Args = {
    apply: false,
    season: getCurrentNFLSeasonForAPISports(),
    sport: 'NFL',
    limitPlayers: null,
    requireIdentity: true,
    json: false,
  }

  for (const raw of argv) {
    if (raw === '--apply') out.apply = true
    else if (raw === '--json') out.json = true
    else if (raw === '--allow-missing-identity') out.requireIdentity = false
    else if (raw.startsWith('--season=')) out.season = raw.slice('--season='.length).trim() || out.season
    else if (raw.startsWith('--sport=')) {
      const value = raw.slice('--sport='.length).trim().toUpperCase()
      if (value === 'NCAAF') out.sport = 'NCAAF'
      else out.sport = 'NFL'
    } else if (raw.startsWith('--limit=')) {
      const n = Number(raw.slice('--limit='.length))
      out.limitPlayers = Number.isFinite(n) && n > 0 ? Math.floor(n) : null
    }
  }

  return out
}

async function findDuplicateGroups(sport: SportTag, season: string) {
  const grouped = await prisma.playerSeasonStats.groupBy({
    by: ['sport', 'playerId', 'season', 'seasonType', 'source'],
    where: {
      sport,
      season,
      source: 'api_sports',
    },
    _count: {
      _all: true,
    },
  })

  return grouped
    .filter((row) => row._count._all > 1)
    .map((row) => ({
      sport: row.sport,
      playerId: row.playerId,
      season: row.season,
      seasonType: row.seasonType,
      source: row.source,
      count: row._count._all,
    }))
}

function printReport(args: Args, sync: APISportsPlayerSeasonStatsSyncSummary, duplicateGroups: Array<Record<string, unknown>>) {
  console.log('------------------------------------------------------------')
  console.log(' API-Sports Player Season Stats Audit')
  console.log('------------------------------------------------------------')
  console.log(` Mode:                       ${args.apply ? 'apply' : 'dry-run'}`)
  console.log(` Sport:                      ${sync.sport}`)
  console.log(` Season:                     ${sync.season}`)
  console.log(` Require identity map:       ${sync.requireIdentity ? 'yes' : 'no'}`)
  console.log(` Limit players:              ${args.limitPlayers ?? 'none'}`)
  console.log('')
  console.log(' Endpoint + fetch metrics:')
  console.log(`   endpoint successes:       ${sync.endpointSuccesses}`)
  console.log(`   endpoint failures:        ${sync.endpointFailures}`)
  console.log(`   players scanned:          ${sync.playersScanned}`)
  console.log(`   player stats fetched:     ${sync.playerStatsFetched}`)
  console.log(`   stats rows available:     ${sync.statsRowsAvailable}`)
  console.log('')
  console.log(' Write metrics:')
  console.log(`   rows inserted:            ${sync.rowsInserted}`)
  console.log(`   rows updated:             ${sync.rowsUpdated}`)
  console.log(`   rows skipped (identity):  ${sync.rowsSkippedMissingIdentity}`)
  console.log(`   rows skipped (no stats):  ${sync.rowsSkippedNoStats}`)
  console.log(`   rows skipped (no id):     ${sync.rowsSkippedNoPlayerId}`)
  console.log('')
  console.log(' Coverage:')
  console.log(`   sports covered:           ${sync.sport}`)
  console.log(`   seasons covered:          ${sync.season}`)
  console.log(`   duplicate groups:         ${duplicateGroups.length}`)

  if (duplicateGroups.length > 0) {
    console.log('')
    console.log(' Duplicate key groups (first 10):')
    for (const dup of duplicateGroups.slice(0, 10)) {
      console.log(`   - ${JSON.stringify(dup)}`)
    }
  }

  if (sync.identityMapGapSamples.length > 0) {
    console.log('')
    console.log(` Identity-map gaps (first ${Math.min(sync.identityMapGapSamples.length, 15)}):`)
    for (const row of sync.identityMapGapSamples.slice(0, 15)) {
      console.log(`   - ${row.playerName} (id=${row.playerId}, team=${row.team ?? 'n/a'})`)
    }
  }

  if (sync.sampleRecords.length > 0) {
    console.log('')
    console.log(` Sample records (first ${Math.min(sync.sampleRecords.length, 10)}):`)
    for (const sample of sync.sampleRecords.slice(0, 10)) {
      console.log(
        `   - ${sample.playerName} id=${sample.playerId} team=${sample.team ?? 'n/a'} pos=${sample.position ?? 'n/a'} fp=${sample.fantasyPoints ?? 'n/a'} fppg=${sample.fantasyPointsPerGame ?? 'n/a'} gp=${sample.gamesPlayed ?? 'n/a'} identity=${sample.hasIdentity ? 'yes' : 'no'}`
      )
    }
  }

  console.log('------------------------------------------------------------')
}

async function main() {
  const args = parseArgs(process.argv.slice(2))

  const sync = await syncAPISportsPlayerSeasonStatsToDb({
    season: args.season,
    sport: args.sport,
    apply: args.apply,
    limitPlayers: args.limitPlayers ?? undefined,
    requireIdentity: args.requireIdentity,
  })

  const duplicateGroups = await findDuplicateGroups(args.sport, args.season)

  if (args.json) {
    console.log(JSON.stringify({ args, sync, duplicateGroups }, null, 2))
  } else {
    printReport(args, sync, duplicateGroups)
  }

  await prisma.$disconnect()
}

main().catch(async (err) => {
  console.error('[audit-api-sports-player-stats] failed:', err)
  await prisma.$disconnect()
  process.exit(1)
})

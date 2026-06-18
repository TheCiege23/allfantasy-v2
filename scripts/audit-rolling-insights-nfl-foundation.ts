/**
 * Read-only audit for the canonical NFL data foundation.
 *
 * Usage:
 *   node --env-file=.env --require ./scripts/_audit-preload.cjs --import tsx scripts/audit-rolling-insights-nfl-foundation.ts -- --season=2026 --week=1 --json
 */

import { prisma } from '../lib/prisma'
import { prisma as aliasPrisma } from '@/lib/prisma'
import { getCanonicalNflDataCoverage } from '../lib/nfl-data-foundation/nflDataCoverage'
import { auditNflRollingInsightsIdentity } from '../lib/nfl-data-foundation/nflFoundationSync'

type Args = {
  json: boolean
  season: number
  week: number | null
}

function parseArgs(argv: string[]): Args {
  const out: Args = { json: false, season: new Date().getUTCFullYear(), week: null }
  for (const raw of argv) {
    if (raw === '--json') out.json = true
    else if (raw.startsWith('--season=')) {
      const parsed = Number(raw.slice('--season='.length))
      if (Number.isFinite(parsed) && parsed > 2000) out.season = Math.trunc(parsed)
    } else if (raw.startsWith('--week=')) {
      const parsed = Number(raw.slice('--week='.length))
      if (Number.isFinite(parsed) && parsed > 0) out.week = Math.trunc(parsed)
    }
  }
  return out
}

async function identitySummary() {
  const [total, withAnyProviderId, withRollingInsightsId, players] = await Promise.all([
    prisma.playerIdentityMap.count({ where: { sport: 'NFL' } }).catch(() => 0),
    prisma.playerIdentityMap
      .count({
        where: {
          sport: 'NFL',
          OR: [
            { rollingInsightsId: { not: null } },
            { sleeperId: { not: null } },
            { fantasyCalcId: { not: null } },
            { apiSportsId: { not: null } },
            { espnId: { not: null } },
            { clearSportsId: { not: null } },
          ],
        },
      })
      .catch(() => 0),
    prisma.playerIdentityMap.count({ where: { sport: 'NFL', rollingInsightsId: { not: null } } }).catch(() => 0),
    prisma.sportsPlayer.count({ where: { sport: 'NFL' } }).catch(() => 0),
  ])
  return {
    identityRows: total,
    identityRowsWithAnyProviderId: withAnyProviderId,
    identityRowsWithRollingInsightsId: withRollingInsightsId,
    sportsPlayerRows: players,
    identityMatchRate: players > 0 ? Math.round((withAnyProviderId / players) * 1000) / 10 : 0,
  }
}

function writeCommand(args: Args): string {
  return [
    'node --env-file=.env --require ./scripts/_audit-preload.cjs --import tsx',
    'scripts/sync-rolling-insights-nfl-foundation.ts',
    '--',
    `--season=${args.season}`,
    args.week ? `--week=${args.week}` : '--week=1',
    '--write',
    '--json',
  ].join(' ')
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const [coverage, identity, identityAudit] = await Promise.all([
    getCanonicalNflDataCoverage({ season: args.season, week: args.week, prismaClient: prisma }),
    identitySummary(),
    auditNflRollingInsightsIdentity({ prismaClient: prisma }),
  ])
  const result = {
    ok: true,
    generatedAt: new Date().toISOString(),
    season: args.season,
    week: args.week,
    readOnly: true,
    coverage,
    beforeCounts: coverage.counts,
    afterCounts: coverage.counts,
    identity,
    identityAudit,
    duplicateWarnings: identityAudit.duplicateSamples,
    duplicateCount: {
      groups: identityAudit.duplicateCandidateGroups,
      rows: identityAudit.duplicateCandidateRows,
      extraRows: identityAudit.extraDuplicateRows,
    },
    staleProviderWarnings: coverage.staleFields,
    missingProviderWarnings: coverage.missingFields,
    writeCommand: writeCommand(args),
  }

  if (args.json) {
    console.log(JSON.stringify(result, null, 2))
    return
  }

  console.log(`NFL foundation audit for season ${args.season}${args.week ? ` week ${args.week}` : ''}`)
  console.log(`Players=${coverage.counts.players ?? 0} Teams=${coverage.counts.teams ?? 0} Schedule=${coverage.counts.schedule ?? 0}`)
  console.log(`DepthCharts=${coverage.counts.depthCharts ?? 0} Injuries=${coverage.counts.injuries ?? 0} SeasonStats=${coverage.counts.seasonStats ?? 0}`)
  console.log(`WeeklyProjectionRows=${coverage.counts.weeklyProjections ?? 0} RosProjectionRows=${coverage.counts.rosProjections ?? 0} TradeValueRows=${coverage.counts.tradeValues ?? 0}`)
  console.log(`Identity match rate=${identity.identityMatchRate}% (${identity.identityRowsWithAnyProviderId}/${identity.sportsPlayerRows})`)
  console.log(`RI identity audit match rate=${identityAudit.matchRate}%`)
  console.log(`Duplicate groups=${identityAudit.duplicateCandidateGroups} rows=${identityAudit.duplicateCandidateRows} extraRows=${identityAudit.extraDuplicateRows}`)
  console.log(`Missing=${coverage.missingFields.join(', ') || 'none'}`)
  console.log(`Stale=${coverage.staleFields.join(', ') || 'none'}`)
  console.log(`Write mode command=${writeCommand(args)}`)
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect().catch(() => undefined)
    if (aliasPrisma !== prisma) await aliasPrisma.$disconnect().catch(() => undefined)
    process.exit(process.exitCode ?? 0)
  })

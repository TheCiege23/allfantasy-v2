/**
 * Read-only audit for the canonical NFL data foundation.
 *
 * Usage:
 *   node --env-file=.env --require ./scripts/_audit-preload.cjs --import tsx scripts/audit-rolling-insights-nfl-foundation.ts -- --season=2026 --week=1 --json
 */

import { prisma } from '../lib/prisma'
import { getCanonicalNflDataCoverage } from '../lib/nfl-data-foundation/nflDataCoverage'

type Args = {
  json: boolean
  season: number
  week: number | null
}

type DuplicateWarning = {
  key: string
  count: number
  examples: Array<{ id: string; externalId: string; name: string; position: string | null; team: string | null; source: string }>
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

function normalize(value: string | null | undefined): string {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
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

async function duplicateWarnings(): Promise<DuplicateWarning[]> {
  const rows = await prisma.sportsPlayer
    .findMany({
      where: { sport: 'NFL' },
      select: { id: true, externalId: true, name: true, position: true, team: true, source: true },
      take: 10000,
      orderBy: { updatedAt: 'desc' },
    })
    .catch(() => [])
  const groups = new Map<string, typeof rows>()
  for (const row of rows) {
    const key = `${normalize(row.name)}|${normalize(row.position)}|${normalize(row.team)}`
    if (!normalize(row.name) || !normalize(row.position)) continue
    const group = groups.get(key) ?? []
    group.push(row)
    groups.set(key, group)
  }
  return [...groups.entries()]
    .filter(([, group]) => group.length > 1)
    .slice(0, 25)
    .map(([key, group]) => ({
      key,
      count: group.length,
      examples: group.slice(0, 5),
    }))
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const [coverage, identity, duplicates] = await Promise.all([
    getCanonicalNflDataCoverage({ season: args.season, week: args.week }),
    identitySummary(),
    duplicateWarnings(),
  ])
  const result = {
    ok: true,
    generatedAt: new Date().toISOString(),
    season: args.season,
    week: args.week,
    coverage,
    identity,
    duplicateWarnings: duplicates,
    staleProviderWarnings: coverage.staleFields,
    missingProviderWarnings: coverage.missingFields,
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
  console.log(`Duplicate warnings=${duplicates.length}`)
  console.log(`Missing=${coverage.missingFields.join(', ') || 'none'}`)
  console.log(`Stale=${coverage.staleFields.join(', ') || 'none'}`)
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect().catch(() => undefined)
  })

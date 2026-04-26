/**
 * Slice D.1.5 — Rolling Insights / id mapping audit for the draft pool.
 *
 * Companion to scripts/audit-draft-player-assets.ts. That script told us 100% of
 * NFL pool rows had a splits OBJECT but every cell was zero. This script
 * diagnoses WHY — by walking the same RI identity-mapping pipeline that
 * getResolvedDraftPoolForLeague uses internally and reporting where the joins
 * fall apart.
 *
 * USAGE
 *   npm run audit:ri-mapping -- --league=<leagueId>
 *   npm run audit:ri-mapping -- --league=<leagueId> --json
 *
 * Reads only. Never writes to the database.
 */

/** server-only stub is loaded by scripts/_audit-preload.cjs (node --require). */

import { PrismaClient } from '@prisma/client'
import { getResolvedDraftPoolForLeague } from '../lib/draft-room/getResolvedDraftPoolForLeague'
import {
  loadRollingInsightsSeasonByDraftPoolKey,
  loadRollingInsightsStatsDetailByPlayerIds,
} from '../lib/draft/analytics/nfl-rolling-insights-draft-analytics'
import { normalizeDraftPoolNameForDedupe } from '../lib/draft-room/getResolvedDraftPoolForLeague'

const prisma = new PrismaClient()

interface Args {
  leagueId: string
  json: boolean
  limit?: number
  /** E.2: print N classified samples of pool playerId / mapping outcome. */
  samples?: number
  /** E.2: filter SportsPlayer rows by sport (NFL by default). */
  sport: string
  /** E.2: filter PlayerAnalyticsSnapshot rows by season (e.g. '2025' or '2026'). */
  season?: string
}

function parseArgs(argv: string[]): Args {
  const out: Args = { leagueId: '', json: false, sport: 'NFL' }
  for (const raw of argv) {
    if (raw.startsWith('--league=')) out.leagueId = raw.slice('--league='.length)
    else if (raw.startsWith('--leagueId=')) out.leagueId = raw.slice('--leagueId='.length)
    else if (raw === '--json') out.json = true
    else if (raw.startsWith('--limit=')) {
      const n = Number.parseInt(raw.slice('--limit='.length), 10)
      if (Number.isFinite(n) && n > 0) out.limit = Math.min(500, n)
    } else if (raw.startsWith('--samples=')) {
      const n = Number.parseInt(raw.slice('--samples='.length), 10)
      if (Number.isFinite(n) && n > 0) out.samples = Math.min(100, n)
    } else if (raw.startsWith('--sport=')) {
      out.sport = raw.slice('--sport='.length).toUpperCase() || 'NFL'
    } else if (raw.startsWith('--season=')) {
      out.season = raw.slice('--season='.length)
    }
  }
  return out
}

interface MappingCounters {
  totalPoolEntries: number
  withRollingInsightsId: number
  missingRollingInsightsId: number
  riStatsDetailRowsLoaded: number
  riStatsDetailWithStatsJson: number
  sportsPlayerByExternalIdMatched: number
  sportsPlayerByExternalIdMissing: number
  sportsPlayerByNameTeamMatched: number
  sportsPlayerByNameTeamMissing: number
  /** E.2: matches against the PlayerIdentityMap canonical store. */
  identityMapByNormalizedNameMatched: number
  identityMapByNormalizedNameWithRiId: number
  /** E.2: matches against PlayerAnalyticsSnapshot (where fantasyPointsPerGame lives). */
  analyticsByNormalizedNameMatched: number
  analyticsWithFppg: number
  /** E.2: total table counts in the configured sport+season. */
  sportsPlayerTableTotal: number
  sportsPlayerTableWithImage: number
  identityMapTableTotal: number
  identityMapTableWithRiId: number
  analyticsTableTotal: number
  analyticsTableWithFppg: number
}

interface MappingResult {
  leagueId: string
  sport: string
  season?: string
  counters: MappingCounters
  /** E.2: example pool playerId strings so the operator can see if they are real provider ids
   * (e.g. sleeper numeric ids) or synthetic name-keys (`name:Foo:RB:ATL`). */
  poolIdFormatExamples: string[]
  unmappedExamples: Array<{
    name: string
    position: string
    team: string | null
    poolPlayerId: string | null
  }>
  matchedByNameExamples: Array<{
    name: string
    position: string
    team: string | null
    matchedTo: 'sportsPlayer' | 'identityMap' | 'analyticsSnapshot'
  }>
  /** E.2: pool entries with a placeholder splits object but no real stats. */
  rowsWithMissingStats: Array<{
    name: string
    position: string
    team: string | null
  }>
  diagnosis: 'OK' | 'MISSING_RI_IDENTITY_TABLE' | 'PARTIAL_RI_MAPPING' | 'NO_RI_STATS_DATA' | 'NON_NFL' | 'MISSING_SOURCE_DATA'
  notes: string[]
}

function normalizeKeyPart(value: string): string {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
}

async function audit(args: Args): Promise<MappingResult> {
  const { leagueId } = args
  if (!leagueId) throw new Error('Missing --league=<leagueId>')

  const result = await getResolvedDraftPoolForLeague(leagueId, args.limit ? { limit: args.limit } : {})
  const sport = String(result.sport || 'NFL')

  const counters: MappingCounters = {
    totalPoolEntries: result.entries.length,
    withRollingInsightsId: 0,
    missingRollingInsightsId: 0,
    riStatsDetailRowsLoaded: 0,
    riStatsDetailWithStatsJson: 0,
    sportsPlayerByExternalIdMatched: 0,
    sportsPlayerByExternalIdMissing: 0,
    sportsPlayerByNameTeamMatched: 0,
    sportsPlayerByNameTeamMissing: 0,
    identityMapByNormalizedNameMatched: 0,
    identityMapByNormalizedNameWithRiId: 0,
    analyticsByNormalizedNameMatched: 0,
    analyticsWithFppg: 0,
    sportsPlayerTableTotal: 0,
    sportsPlayerTableWithImage: 0,
    identityMapTableTotal: 0,
    identityMapTableWithRiId: 0,
    analyticsTableTotal: 0,
    analyticsTableWithFppg: 0,
  }
  const unmappedExamples: MappingResult['unmappedExamples'] = []
  const matchedByNameExamples: MappingResult['matchedByNameExamples'] = []
  const rowsWithMissingStats: MappingResult['rowsWithMissingStats'] = []
  const poolIdFormatExamples: string[] = []
  const notes: string[] = []

  if (sport !== 'NFL') {
    return {
      leagueId,
      sport,
      season: args.season,
      counters,
      poolIdFormatExamples: [],
      unmappedExamples: [],
      matchedByNameExamples: [],
      rowsWithMissingStats: [],
      diagnosis: 'NON_NFL',
      notes: [`Sport is ${sport}; Rolling Insights identity mapping is NFL-only.`],
    }
  }

  // E.2: capture a few raw pool playerId strings so the operator can see whether they're
  // real provider ids or synthetic name-keys.
  for (const e of result.entries.slice(0, 5)) {
    const id = String(e.playerId ?? e.display?.playerId ?? '').trim()
    if (id) poolIdFormatExamples.push(id)
  }

  // Re-run the same RI identity loader the resolver uses, against the resolved pool's key shape.
  const riRows = result.entries.map((e) => ({
    nk: normalizeDraftPoolNameForDedupe(e.name ?? ''),
    pk: normalizeKeyPart(e.position ?? ''),
    sleeperCandidate: e.playerId && String(e.playerId).trim() !== '' ? String(e.playerId).trim() : null,
  }))

  const { identityByPoolKey } = await loadRollingInsightsSeasonByDraftPoolKey({ rows: riRows })
  const identityKeys = new Set(identityByPoolKey.keys())

  for (const e of result.entries) {
    const nk = normalizeDraftPoolNameForDedupe(e.name ?? '')
    const pk = normalizeKeyPart(e.position ?? '')
    const key = `${nk}|${pk}`
    const matched = identityKeys.has(key) || identityByPoolKey.has(key)
    if (matched) counters.withRollingInsightsId += 1
    else {
      counters.missingRollingInsightsId += 1
      if (unmappedExamples.length < 25) {
        unmappedExamples.push({
          name: e.name,
          position: e.position,
          team: e.team,
          poolPlayerId: e.playerId ?? e.display?.playerId ?? null,
        })
      }
    }
  }

  // How many RI stats-detail rows actually exist for the matched ids?
  if (counters.withRollingInsightsId > 0) {
    const riIds = [...new Set([...identityByPoolKey.values()].map((v) => v.rollingInsightsPlayerId))]
    const detail = await loadRollingInsightsStatsDetailByPlayerIds(riIds)
    counters.riStatsDetailRowsLoaded = detail.size
    let withJson = 0
    for (const v of detail.values()) {
      if (v?.stats != null) withJson += 1
    }
    counters.riStatsDetailWithStatsJson = withJson
  }

  // Cross-check SportsPlayer by externalId for the first 100 ids.
  const sampleExternal = result.entries
    .map((e) => String(e.playerId ?? e.display?.playerId ?? '').trim())
    .filter((id) => id.length > 0)
    .slice(0, 100)
  if (sampleExternal.length > 0) {
    const sp = await prisma.sportsPlayer.findMany({
      where: { sport: 'NFL' as any, externalId: { in: sampleExternal } },
      select: { externalId: true },
    })
    counters.sportsPlayerByExternalIdMatched = sp.length
    counters.sportsPlayerByExternalIdMissing = sampleExternal.length - sp.length
  }

  // Fallback: try matching first 50 unmapped pool rows by name+team+position.
  const sampleNames = unmappedExamples.slice(0, 50).map((u) => u.name).filter(Boolean)
  if (sampleNames.length > 0) {
    const sp = await prisma.sportsPlayer.findMany({
      where: {
        sport: 'NFL' as any,
        name: { in: sampleNames },
      },
      select: { name: true, team: true, position: true },
    })
    const matchedNameSet = new Set(sp.map((r) => r.name))
    counters.sportsPlayerByNameTeamMatched = matchedNameSet.size
    counters.sportsPlayerByNameTeamMissing = sampleNames.length - matchedNameSet.size
    for (const r of sp.slice(0, 25)) {
      matchedByNameExamples.push({
        name: r.name,
        position: r.position ?? '—',
        team: r.team ?? null,
        matchedTo: 'sportsPlayer',
      })
    }
  }

  // E.2: PlayerIdentityMap and PlayerAnalyticsSnapshot probe by normalized name.
  // These are the canonical join targets the resolver should fall back to when externalId
  // matching produces 0 hits — and they're how we discover whether mapping is recoverable
  // (data exists, just not joined) vs. simply absent.
  const allPoolNormalizedNames = result.entries
    .map((e) => normalizeDraftPoolNameForDedupe(e.name ?? ''))
    .filter(Boolean)
  const uniqueNames = [...new Set(allPoolNormalizedNames)]
  if (uniqueNames.length > 0) {
    const idmRows = await prisma.playerIdentityMap.findMany({
      where: { sport: args.sport, normalizedName: { in: uniqueNames } },
      select: { normalizedName: true, rollingInsightsId: true },
    })
    counters.identityMapByNormalizedNameMatched = idmRows.length
    counters.identityMapByNormalizedNameWithRiId = idmRows.filter((r) => Boolean(r.rollingInsightsId)).length
    for (const r of idmRows.slice(0, 25)) {
      matchedByNameExamples.push({
        name: r.normalizedName,
        position: '—',
        team: null,
        matchedTo: 'identityMap',
      })
    }

    const analyticsRows = await prisma.playerAnalyticsSnapshot.findMany({
      where: {
        normalizedName: { in: uniqueNames },
        ...(args.season ? { season: args.season } : {}),
      },
      select: { normalizedName: true, fantasyPointsPerGame: true },
    })
    counters.analyticsByNormalizedNameMatched = analyticsRows.length
    counters.analyticsWithFppg = analyticsRows.filter(
      (r) => r.fantasyPointsPerGame != null && r.fantasyPointsPerGame !== 0,
    ).length
    for (const r of analyticsRows.slice(0, 25)) {
      if (r.fantasyPointsPerGame == null || r.fantasyPointsPerGame === 0) continue
      matchedByNameExamples.push({
        name: r.normalizedName,
        position: '—',
        team: null,
        matchedTo: 'analyticsSnapshot',
      })
    }
  }

  // E.2: rows with placeholder splits but no real stats — these are exactly what shows '—'
  // dashes in the pool UI right now.
  for (const e of result.entries) {
    const ppg = e.display?.stats?.fantasyPointsPerGame
    if (ppg == null || ppg === 0) {
      if (rowsWithMissingStats.length < 25) {
        rowsWithMissingStats.push({ name: e.name, position: e.position, team: e.team })
      }
    }
  }

  // E.2: total table snapshots so the operator knows whether the source data is empty
  // OR populated but unjoinable.
  const [
    sportsPlayerTotal,
    sportsPlayerWithImage,
    identityMapTotal,
    identityMapWithRiId,
    analyticsTotal,
    analyticsWithFppg,
  ] = await Promise.all([
    prisma.sportsPlayer.count({ where: { sport: args.sport } }),
    prisma.sportsPlayer.count({ where: { sport: args.sport, imageUrl: { not: null } } }),
    prisma.playerIdentityMap.count({ where: { sport: args.sport } }),
    prisma.playerIdentityMap.count({ where: { sport: args.sport, rollingInsightsId: { not: null } } }),
    prisma.playerAnalyticsSnapshot.count(args.season ? { where: { season: args.season } } : {}),
    prisma.playerAnalyticsSnapshot.count({
      where: {
        ...(args.season ? { season: args.season } : {}),
        fantasyPointsPerGame: { not: null, gt: 0 },
      },
    }),
  ])
  counters.sportsPlayerTableTotal = sportsPlayerTotal
  counters.sportsPlayerTableWithImage = sportsPlayerWithImage
  counters.identityMapTableTotal = identityMapTotal
  counters.identityMapTableWithRiId = identityMapWithRiId
  counters.analyticsTableTotal = analyticsTotal
  counters.analyticsTableWithFppg = analyticsWithFppg

  // Diagnose
  let diagnosis: MappingResult['diagnosis'] = 'OK'
  const totalNfl = counters.totalPoolEntries
  const mappedPct = totalNfl ? counters.withRollingInsightsId / totalNfl : 0

  if (totalNfl > 0 && mappedPct === 0) {
    diagnosis = 'MISSING_RI_IDENTITY_TABLE'
    notes.push(
      `0/${totalNfl} pool rows resolved to a Rolling Insights player id. The identity map is empty for this league. Possible causes: (a) the RI identity table is empty for current NFL season; (b) the loader's name/position keys don't match; (c) the league's player namespace differs from RI.`,
    )
  } else if (totalNfl > 0 && mappedPct < 0.6) {
    diagnosis = 'PARTIAL_RI_MAPPING'
    notes.push(
      `${counters.withRollingInsightsId}/${totalNfl} (${(mappedPct * 100).toFixed(0)}%) of pool rows resolved to RI ids. Many rows have no stats because they don't map to RI.`,
    )
  } else if (mappedPct >= 0.6 && counters.riStatsDetailWithStatsJson === 0 && counters.riStatsDetailRowsLoaded === 0) {
    diagnosis = 'NO_RI_STATS_DATA'
    notes.push(
      `${counters.withRollingInsightsId}/${totalNfl} pool rows mapped to RI ids, but the RI stats-detail table returned 0 rows. The mapping is fine; the stats payload is empty.`,
    )
  } else if (mappedPct >= 0.6 && counters.riStatsDetailRowsLoaded > 0 && counters.riStatsDetailWithStatsJson === 0) {
    diagnosis = 'NO_RI_STATS_DATA'
    notes.push(
      `${counters.riStatsDetailRowsLoaded} RI stats-detail rows exist for matched ids, but every row has stats=NULL. The RI fetcher fired but the response didn't include stats.`,
    )
  }
  if (counters.sportsPlayerByExternalIdMatched === 0 && counters.sportsPlayerByNameTeamMatched > 0) {
    notes.push(
      `SportsPlayer cannot be reached by externalId (0 matches) but ${counters.sportsPlayerByNameTeamMatched} matched by name. Pool playerId ≠ SportsPlayer.externalId — id namespaces differ.`,
    )
  }
  if (counters.sportsPlayerByExternalIdMatched === 0 && counters.sportsPlayerByNameTeamMatched === 0 && totalNfl > 0) {
    notes.push(
      `Neither external-id nor name fallback found any matching SportsPlayer rows for the sample. SportsPlayer table may be empty or stale for current NFL season.`,
    )
  }

  // E.2: source-table sanity check. If the parent tables themselves are empty/sparse,
  // the resolver fix can't help — the data has to be ingested first.
  if (counters.sportsPlayerTableTotal === 0 && counters.identityMapTableTotal === 0) {
    diagnosis = 'MISSING_SOURCE_DATA'
    notes.push(
      `BOTH SportsPlayer and PlayerIdentityMap are empty for sport=${args.sport}. Until ingestion runs, no mapping fix can populate avatars or stats.`,
    )
  } else if (counters.identityMapTableWithRiId === 0) {
    notes.push(
      `PlayerIdentityMap has ${counters.identityMapTableTotal} rows for ${args.sport}, but 0 carry a rollingInsightsId. RI ingestion has not populated identity bridge rows.`,
    )
  }
  if (counters.identityMapByNormalizedNameMatched > counters.withRollingInsightsId) {
    notes.push(
      `Resolver-side join missed ${counters.identityMapByNormalizedNameMatched - counters.withRollingInsightsId} candidate identity matches that DO exist in PlayerIdentityMap. Adding a name+position fallback to the resolver should recover them.`,
    )
  }
  if (counters.analyticsByNormalizedNameMatched > 0 && counters.analyticsWithFppg === 0) {
    notes.push(
      `Found ${counters.analyticsByNormalizedNameMatched} PlayerAnalyticsSnapshot rows for these players, but every row has fantasyPointsPerGame=NULL/0. The analytics table is shaped right but unfilled.`,
    )
  }
  if (counters.analyticsWithFppg > 0) {
    notes.push(
      `${counters.analyticsWithFppg} PlayerAnalyticsSnapshot rows have non-zero fantasyPointsPerGame and are matchable by normalized name. Resolver fallback can hydrate stats from these rows.`,
    )
  }

  return {
    leagueId,
    sport,
    season: args.season,
    counters,
    poolIdFormatExamples,
    unmappedExamples,
    matchedByNameExamples,
    rowsWithMissingStats,
    diagnosis,
    notes,
  }
}

function pct(part: number, whole: number): string {
  if (!whole) return '—'
  return `${((part / whole) * 100).toFixed(1)}%`
}

function printSummary(r: MappingResult): void {
  const c = r.counters
  console.log('')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`E.2 — Rolling Insights / ID Mapping Audit`)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`League:                ${r.leagueId}`)
  console.log(`Sport:                 ${r.sport}`)
  if (r.season) console.log(`Season filter:         ${r.season}`)
  console.log('')
  console.log(`Pool entries:                              ${c.totalPoolEntries}`)
  console.log(`  with RI player id:                       ${c.withRollingInsightsId}  (${pct(c.withRollingInsightsId, c.totalPoolEntries)})`)
  console.log(`  missing RI player id:                    ${c.missingRollingInsightsId}  (${pct(c.missingRollingInsightsId, c.totalPoolEntries)})`)
  console.log(`  RI stats-detail rows loaded:             ${c.riStatsDetailRowsLoaded}`)
  console.log(`  RI rows with stats JSON:                 ${c.riStatsDetailWithStatsJson}`)
  console.log('')
  if (r.poolIdFormatExamples.length > 0) {
    console.log(`Pool playerId format examples:`)
    for (const id of r.poolIdFormatExamples) {
      const truncated = id.length > 100 ? id.slice(0, 97) + '...' : id
      console.log(`  - ${truncated}`)
    }
    console.log('')
  }
  console.log(`SportsPlayer cross-check (pool ↔ DB):`)
  console.log(`  matched by externalId (sample 100):      ${c.sportsPlayerByExternalIdMatched}`)
  console.log(`  missing by externalId (sample 100):      ${c.sportsPlayerByExternalIdMissing}`)
  console.log(`  matched by name (sample of unmapped):    ${c.sportsPlayerByNameTeamMatched}`)
  console.log(`  missing by name (sample of unmapped):    ${c.sportsPlayerByNameTeamMissing}`)
  console.log('')
  console.log(`Source table totals (sport=${r.sport}):`)
  console.log(`  SportsPlayer rows:                       ${c.sportsPlayerTableTotal}`)
  console.log(`  SportsPlayer rows with image_url:        ${c.sportsPlayerTableWithImage}`)
  console.log(`  PlayerIdentityMap rows:                  ${c.identityMapTableTotal}`)
  console.log(`  PlayerIdentityMap rows with RI id:       ${c.identityMapTableWithRiId}`)
  console.log(`  PlayerAnalyticsSnapshot rows:            ${c.analyticsTableTotal}`)
  console.log(`  PlayerAnalyticsSnapshot rows with FPPG:  ${c.analyticsTableWithFppg}`)
  console.log('')
  console.log(`Pool ↔ source name fallback:`)
  console.log(`  pool names matched in PlayerIdentityMap: ${c.identityMapByNormalizedNameMatched}`)
  console.log(`  ↳ of those, with RI id:                  ${c.identityMapByNormalizedNameWithRiId}`)
  console.log(`  pool names matched in AnalyticsSnapshot: ${c.analyticsByNormalizedNameMatched}`)
  console.log(`  ↳ of those, with non-zero FPPG:          ${c.analyticsWithFppg}`)
  console.log('')
  if (r.unmappedExamples.length > 0) {
    console.log(`Top ${r.unmappedExamples.length} unmapped players (no RI identity):`)
    for (const p of r.unmappedExamples) {
      console.log(`  - ${p.name.padEnd(28)} ${p.position.padEnd(4)} ${(p.team ?? '—').padEnd(4)} id=${p.poolPlayerId ?? '—'}`)
    }
    console.log('')
  }
  if (r.matchedByNameExamples.length > 0) {
    console.log(`Top ${Math.min(25, r.matchedByNameExamples.length)} name-fallback matches:`)
    for (const p of r.matchedByNameExamples.slice(0, 25)) {
      console.log(`  [${p.matchedTo.padEnd(20)}] ${p.name.padEnd(28)} ${p.position.padEnd(4)} ${p.team ?? '—'}`)
    }
    console.log('')
  }
  if (r.rowsWithMissingStats.length > 0) {
    console.log(`Top ${r.rowsWithMissingStats.length} pool rows with missing stats:`)
    for (const p of r.rowsWithMissingStats) {
      console.log(`  - ${p.name.padEnd(28)} ${p.position.padEnd(4)} ${p.team ?? '—'}`)
    }
    console.log('')
  }
  console.log(`Diagnosis: ${r.diagnosis}`)
  for (const n of r.notes) console.log(`  • ${n}`)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('')
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const result = await audit(args)
  if (args.json) {
    process.stdout.write(JSON.stringify(result, null, 2) + '\n')
  } else {
    printSummary(result)
    process.stdout.write('JSON_OUTPUT_BEGIN\n')
    process.stdout.write(JSON.stringify(result) + '\n')
    process.stdout.write('JSON_OUTPUT_END\n')
  }
}

main()
  .catch((err) => {
    console.error('[audit-rolling-insights-draft-mapping] FAILED:', err)
    process.exit(1)
  })
  .finally(() => {
    void prisma.$disconnect()
  })

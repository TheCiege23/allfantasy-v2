/**
 * E.2.5 — read-only audit of NFL projected/season stat providers.
 *
 * USAGE
 *   npm run audit:nfl-stats-provider
 *   npm run audit:nfl-stats-provider -- --json
 *   npm run audit:nfl-stats-provider -- --season=2024 --probe-team=ATL
 *
 * Reports:
 *   - Rolling Insights credentials presence + auth probe
 *   - Sample roster fetch (player count, season-stat coverage, fantasy points presence,
 *     rushing/receiving/passing field coverage on stats JSON)
 *   - Current DB totals for the three tables that drive the draft pool stat columns:
 *       SportsPlayer (NFL, source=rolling_insights),
 *       PlayerSeasonStats (NFL, source=rolling_insights, seasonType=regular),
 *       PlayerIdentityMap (NFL, rollingInsightsId not null),
 *       PlayerAnalyticsSnapshot (CSV-backed projections; not RI).
 *   - Diagnoses MISSING_PROVIDER / MISSING_BACKFILL / READY based on what's available.
 *
 * No writes. Safe for production.
 */

/** server-only stub is loaded by scripts/_audit-preload.cjs (node --require). */

import { PrismaClient } from '@prisma/client'
import {
  fetchNFLTeams,
  fetchNFLRoster,
  getLastFetchNFLRosterTrace,
  type FetchNFLRosterTrace,
} from '../lib/rolling-insights'

const prisma = new PrismaClient()

interface Args {
  json: boolean
  season: string | null
  probeTeam: string | null
  /** Accepted for parity with other audit scripts; not used by this provider-only audit. */
  league: string | null
  limit: number | null
}

function parseArgs(argv: string[]): Args {
  const out: Args = { json: false, season: null, probeTeam: null, league: null, limit: null }
  for (const raw of argv) {
    if (raw === '--json') out.json = true
    else if (raw.startsWith('--season=')) out.season = raw.slice('--season='.length)
    else if (raw.startsWith('--probe-team=')) out.probeTeam = raw.slice('--probe-team='.length)
    else if (raw.startsWith('--league=')) out.league = raw.slice('--league='.length)
    else if (raw.startsWith('--sport=')) {
      // NFL-only audit; ignore other sports rather than fail.
    } else if (raw.startsWith('--limit=')) {
      const n = Number(raw.slice('--limit='.length))
      out.limit = Number.isFinite(n) && n > 0 ? n : null
    }
  }
  return out
}

interface ProviderProbe {
  hasClientCredentials: boolean
  hasApiKey: boolean
  authMode: 'client_credentials' | 'api_key' | 'none'
  teamsFetched: number
  rosterProbedTeam: string | null
  rosterPlayers: number
  playersWithRegularSeason: number
  playersWithFantasyPoints: number
  playersWithRushing: number
  playersWithReceiving: number
  playersWithPassing: number
  sampleNames: string[]
  error: string | null
  /** E.2.6 — provider selection trace surfaced from fetchNFLRoster. */
  trace: FetchNFLRosterTrace | null
  recommendedSource: 'rest' | 'graphql' | 'none'
}

interface DbTotals {
  sportsPlayerNflRolling: number
  playerSeasonStatsNflRolling: number
  playerIdentityMapNflWithRi: number
  playerAnalyticsSnapshotNfl: number
}

interface Report {
  generatedAt: string
  args: Args
  provider: ProviderProbe
  db: DbTotals
  diagnosis: 'READY' | 'MISSING_BACKFILL' | 'MISSING_PROVIDER' | 'PARTIAL'
  notes: string[]
}

async function probeProvider(args: Args): Promise<ProviderProbe> {
  const hasClientCredentials =
    Boolean(process.env.ROLLING_INSIGHTS_CLIENT_ID?.trim()) &&
    Boolean(process.env.ROLLING_INSIGHTS_CLIENT_SECRET?.trim())
  const hasApiKey = Boolean(process.env.ROLLING_INSIGHTS_API_KEY?.trim())
  const authMode: ProviderProbe['authMode'] = hasClientCredentials
    ? 'client_credentials'
    : hasApiKey
      ? 'api_key'
      : 'none'

  const probe: ProviderProbe = {
    hasClientCredentials,
    hasApiKey,
    authMode,
    teamsFetched: 0,
    rosterProbedTeam: null,
    rosterPlayers: 0,
    playersWithRegularSeason: 0,
    playersWithFantasyPoints: 0,
    playersWithRushing: 0,
    playersWithReceiving: 0,
    playersWithPassing: 0,
    sampleNames: [],
    error: null,
    trace: null,
    recommendedSource: 'none',
  }

  if (authMode === 'none') {
    probe.error = 'No Rolling Insights credentials configured'
    return probe
  }

  try {
    const teams = await fetchNFLTeams()
    probe.teamsFetched = teams.length
    if (!teams.length) {
      probe.error = 'fetchNFLTeams returned 0 teams'
      return probe
    }
    const target = args.probeTeam
      ? teams.find((t) => t.abbrv?.toUpperCase() === args.probeTeam?.toUpperCase()) ?? teams[0]!
      : teams[0]!
    probe.rosterProbedTeam = target.abbrv ?? target.id

    const roster = await fetchNFLRoster({
      teamId: target.id,
      ...(args.season ? { season: args.season } : {}),
    })
    probe.rosterPlayers = roster.length
    probe.sampleNames = roster.slice(0, 5).map((p) => `${p.player} (${p.position ?? '?'})`)

    for (const p of roster) {
      const season = p.regularSeason?.[0]
      if (!season) continue
      probe.playersWithRegularSeason++
      if (season.DK_fantasy_points != null) probe.playersWithFantasyPoints++
      if (season.rushing_yards != null || season.rushing_attempts != null) probe.playersWithRushing++
      if (season.receiving_yards != null || season.receptions != null || season.targets != null)
        probe.playersWithReceiving++
      if (season.passing_yards != null || season.passing_attempts != null) probe.playersWithPassing++
    }

    probe.trace = getLastFetchNFLRosterTrace()
    if (probe.trace?.finalSource === 'graphql' && probe.trace.graphql.returned > 0) {
      probe.recommendedSource = 'graphql'
    } else if (probe.trace?.finalSource === 'rest' && probe.trace.rest.returned > 0) {
      probe.recommendedSource = 'rest'
    }
  } catch (err) {
    probe.error = err instanceof Error ? err.message : String(err)
  }

  return probe
}

async function readDbTotals(): Promise<DbTotals> {
  const [sp, pss, pim, pas] = await Promise.all([
    prisma.sportsPlayer.count({ where: { sport: 'NFL', source: 'rolling_insights' } }),
    prisma.playerSeasonStats.count({
      where: { sport: 'NFL', source: 'rolling_insights', seasonType: 'regular' },
    }),
    prisma.playerIdentityMap.count({ where: { sport: 'NFL', rollingInsightsId: { not: null } } }),
    prisma.playerAnalyticsSnapshot.count(),
  ])
  return {
    sportsPlayerNflRolling: sp,
    playerSeasonStatsNflRolling: pss,
    playerIdentityMapNflWithRi: pim,
    playerAnalyticsSnapshotNfl: pas,
  }
}

function diagnose(p: ProviderProbe, db: DbTotals): { diagnosis: Report['diagnosis']; notes: string[] } {
  const notes: string[] = []
  if (p.authMode === 'none' || p.error) {
    notes.push(
      'Rolling Insights provider is unavailable. Configure ROLLING_INSIGHTS_CLIENT_ID + ROLLING_INSIGHTS_CLIENT_SECRET (preferred) or ROLLING_INSIGHTS_API_KEY before running the backfill.',
    )
    if (db.playerSeasonStatsNflRolling > 0) {
      notes.push(
        `DB already has ${db.playerSeasonStatsNflRolling} PlayerSeasonStats rows; analytics will use cached data, but no new ingest is possible until provider is reachable.`,
      )
      return { diagnosis: 'PARTIAL', notes }
    }
    return { diagnosis: 'MISSING_PROVIDER', notes }
  }

  if (p.rosterPlayers === 0) {
    notes.push(
      'Provider reachable but the roster probe returned 0 players. The credentials may be valid for auth-only and lack player-info entitlements; or the chosen team has no current roster.',
    )
    return { diagnosis: 'MISSING_PROVIDER', notes }
  }

  if (p.playersWithRegularSeason === 0) {
    notes.push(
      'Roster reachable but season-stat blocks are empty for the probed team. The backfill will still write SportsPlayer rows, but stat columns in the draft pool will stay blank until provider returns regularSeason data.',
    )
  }

  if (db.playerSeasonStatsNflRolling === 0) {
    notes.push(
      'No PlayerSeasonStats rows for NFL/rolling_insights. Run `npm run backfill:nfl-draft-stats -- --apply` to populate them.',
    )
    return { diagnosis: 'MISSING_BACKFILL', notes }
  }

  if (db.playerIdentityMapNflWithRi === 0) {
    notes.push(
      'No PlayerIdentityMap rows link normalizedName/position → rollingInsightsId. The draft pool analytics loader can fetch RI rows but cannot join them to pool rows. Run the backfill with --apply to write identity-map rows alongside stats.',
    )
    return { diagnosis: 'MISSING_BACKFILL', notes }
  }

  notes.push('All three required data sources are populated. Draft pool stat columns should render real numbers.')
  return { diagnosis: 'READY', notes }
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const provider = await probeProvider(args)
  const db = await readDbTotals()
  const { diagnosis, notes } = diagnose(provider, db)

  const report: Report = {
    generatedAt: new Date().toISOString(),
    args,
    provider,
    db,
    diagnosis,
    notes,
  }

  if (args.json) {
    console.log(JSON.stringify(report, null, 2))
  } else {
    console.log('────────────────────────────────────────────────────────')
    console.log(' E.2.5 — NFL player-stats provider audit')
    console.log('────────────────────────────────────────────────────────')
    console.log(` Generated:        ${report.generatedAt}`)
    console.log(` Auth mode:        ${provider.authMode}`)
    if (provider.error) console.log(` Provider error:   ${provider.error}`)
    console.log(` Teams fetched:    ${provider.teamsFetched}`)
    console.log(` Probed team:      ${provider.rosterProbedTeam ?? '(none)'}`)
    console.log(` Roster size:      ${provider.rosterPlayers}`)
    console.log(` w/ regularSeason: ${provider.playersWithRegularSeason}`)
    console.log(` w/ fantasy pts:   ${provider.playersWithFantasyPoints}`)
    console.log(` w/ rushing:       ${provider.playersWithRushing}`)
    console.log(` w/ receiving:     ${provider.playersWithReceiving}`)
    console.log(` w/ passing:       ${provider.playersWithPassing}`)
    if (provider.sampleNames.length) {
      console.log(` Sample players:`)
      provider.sampleNames.forEach((n) => console.log(`   • ${n}`))
    }
    if (provider.trace) {
      const t = provider.trace
      console.log('')
      console.log(' Provider selection (E.2.6):')
      console.log(`   REST attempted:    ${t.rest.attempted} (returned ${t.rest.returned})`)
      if (t.rest.quality) {
        console.log(`   REST useful:       ${t.rest.quality.useful} — ${t.rest.quality.reason}`)
        console.log(
          `   REST coverage:     team=${t.rest.quality.withRealTeam}/${t.rest.quality.total}  regularSeason=${t.rest.quality.withRegularSeason}  fantasyPts=${t.rest.quality.withFantasyPoints}`,
        )
      }
      console.log(`   GraphQL attempted: ${t.graphql.attempted} (returned ${t.graphql.returned})`)
      if (t.graphql.quality) {
        console.log(
          `   GraphQL coverage:  team=${t.graphql.quality.withRealTeam}/${t.graphql.quality.total}  regularSeason=${t.graphql.quality.withRegularSeason}  fantasyPts=${t.graphql.quality.withFantasyPoints}`,
        )
      }
      console.log(`   final source:      ${t.finalSource}`)
      console.log(`   recommended:       ${provider.recommendedSource}`)
    }
    console.log('')
    console.log(` DB — SportsPlayer (NFL, RI):           ${db.sportsPlayerNflRolling}`)
    console.log(` DB — PlayerSeasonStats (NFL, RI):      ${db.playerSeasonStatsNflRolling}`)
    console.log(` DB — PlayerIdentityMap (NFL w/ RI id): ${db.playerIdentityMapNflWithRi}`)
    console.log(` DB — PlayerAnalyticsSnapshot:          ${db.playerAnalyticsSnapshotNfl}`)
    console.log('')
    console.log(` DIAGNOSIS:        ${diagnosis}`)
    notes.forEach((n) => console.log(`   – ${n}`))
    console.log('────────────────────────────────────────────────────────')
  }

  await prisma.$disconnect()
}

main().catch(async (err) => {
  console.error('[audit-nfl-stats-provider] failed:', err)
  await prisma.$disconnect()
  process.exit(1)
})

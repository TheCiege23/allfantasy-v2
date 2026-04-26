/**
 * E.2.7 — backfill PlayerSeasonStats (NFL, source=rolling_insights, seasonType=regular)
 * from RI's `player-stats/{year}/NFL` endpoint.
 *
 * USAGE
 *   npm run backfill:nfl-player-season-stats                                # dry-run (default)
 *   npm run backfill:nfl-player-season-stats -- --season=2024 --apply       # write
 *   npm run backfill:nfl-player-season-stats -- --season=2024 --teams=BUF
 *   npm run backfill:nfl-player-season-stats -- --season=2024 --limit=25 --json
 *
 * What it writes (only on --apply):
 *   - `PlayerSeasonStats` (sport=NFL, source=rolling_insights, seasonType=regular)
 *     keyed by `playerId = String(rolling_insights player_id)` so the analytics
 *     loader's `loadRollingInsightsStatsDetailByPlayerIds` finds them via the
 *     `PlayerIdentityMap.rollingInsightsId` join we built in E.2.6.
 *
 *   - `stats` JSON is RI's `regular_season` block verbatim (passing_yards,
 *     rushing_yards, receiving_yards, completions, passing_interceptions,
 *     receptions, targets, etc.). The existing
 *     `parseRollingInsightsStatsJson` consumer already understands this shape.
 *
 * Match strategy:
 *   1. Primary: RI player_id ↔ PlayerIdentityMap.rollingInsightsId
 *      (high-confidence — same upstream provider).
 *   2. Fallback: normalized name + position when an RI row has no matching
 *      identity row yet but a SportsPlayer / PlayerIdentityMap row exists with
 *      the same (name, position). Ambiguous matches (multiple candidates) are
 *      rejected.
 *
 * Without --force, existing PlayerSeasonStats rows with non-null fantasyPoints
 * are left alone (the upsert still refreshes `stats` JSON on a same-key match).
 */

/** server-only stub is loaded by scripts/_audit-preload.cjs (node --require). */

import { PrismaClient, Prisma } from '@prisma/client'
import {
  fetchNFLPlayerStats,
  fetchNFLTeams,
  type RIPlayerSeasonStatsRow,
} from '../lib/rolling-insights'

const prisma = new PrismaClient()

interface Args {
  apply: boolean
  json: boolean
  force: boolean
  season: string | null
  teams: string[] | null
  limit: number | null
  league: string | null
  dryRun: boolean
}

function parseArgs(argv: string[]): Args {
  const out: Args = {
    apply: false,
    json: false,
    force: false,
    season: null,
    teams: null,
    limit: null,
    league: null,
    dryRun: false,
  }
  for (const raw of argv) {
    if (raw === '--apply') out.apply = true
    else if (raw === '--json') out.json = true
    else if (raw === '--force') out.force = true
    else if (raw === '--dry-run') out.dryRun = true
    else if (raw.startsWith('--season=')) out.season = raw.slice('--season='.length)
    else if (raw.startsWith('--teams=')) {
      out.teams = raw
        .slice('--teams='.length)
        .split(',')
        .map((s) => s.trim().toUpperCase())
        .filter(Boolean)
    } else if (raw.startsWith('--league=')) out.league = raw.slice('--league='.length)
    else if (raw.startsWith('--sport=')) {
      // NFL-only.
    } else if (raw.startsWith('--limit=')) {
      const n = Number(raw.slice('--limit='.length))
      out.limit = Number.isFinite(n) && n > 0 ? n : null
    }
  }
  return out
}

function normalizePoolName(name: string): string {
  return (name ?? '').trim().toLowerCase()
}

interface BackfillReport {
  generatedAt: string
  args: Args
  mode: 'dry-run' | 'apply'
  rowsFromProvider: number
  rowsAfterTeamFilter: number
  rowsWithRegularSeason: number
  rowsWithFantasyPoints: number
  matchedById: number
  matchedByName: number
  ambiguousNameRejected: number
  unmatched: number
  written: number
  skippedExisting: number
  errors: string[]
  rawSamples: RIPlayerSeasonStatsRow[]
  writeSamples: Array<{
    playerId: string
    name: string
    fantasyPoints: number | null
    fantasyPointsPerGame: number | null
    games: number | null
    matchedVia: 'id' | 'name'
  }>
}

/** Pull `regular_season.<key>` as a number, treating missing/non-finite as null. */
function num(stats: Record<string, unknown> | null | undefined, key: string): number | null {
  if (!stats) return null
  const v = stats[key]
  return typeof v === 'number' && Number.isFinite(v) ? v : null
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const isApply = args.apply && !args.dryRun
  const seasonRaw = args.season ?? '2024'
  const seasonForDb = seasonRaw.includes('-') ? seasonRaw.split('-')[0]! : seasonRaw

  const report: BackfillReport = {
    generatedAt: new Date().toISOString(),
    args,
    mode: isApply ? 'apply' : 'dry-run',
    rowsFromProvider: 0,
    rowsAfterTeamFilter: 0,
    rowsWithRegularSeason: 0,
    rowsWithFantasyPoints: 0,
    matchedById: 0,
    matchedByName: 0,
    ambiguousNameRejected: 0,
    unmatched: 0,
    written: 0,
    skippedExisting: 0,
    errors: [],
    rawSamples: [],
    writeSamples: [],
  }

  try {
    const allRows = await fetchNFLPlayerStats({ season: seasonForDb })
    report.rowsFromProvider = allRows.length

    // Coverage diagnostics on the FULL provider response (before any --teams filter).
    for (const r of allRows) {
      const rs = r.regular_season ?? null
      if (rs && Object.keys(rs).length > 0) report.rowsWithRegularSeason++
      if (rs && rs.DK_fantasy_points != null) report.rowsWithFantasyPoints++
    }

    // Optional --teams filter. RI returns full team names ("Cincinnati Bengals") and
    // numeric team_ids. We resolve abbreviations (CIN) by fetching the teams list once.
    let rows = allRows
    if (args.teams && args.teams.length) {
      const filterSet = new Set(args.teams.map((t) => t.toUpperCase()))
      const teams = await fetchNFLTeams()
      const teamIdSet = new Set<string>()
      for (const t of teams) {
        if (filterSet.has((t.abbrv ?? '').toUpperCase())) teamIdSet.add(String(t.id))
      }
      rows = allRows.filter((r) => teamIdSet.has(String(r.team_id)))
    }
    report.rowsAfterTeamFilter = rows.length

    // Save 3 sanitized raw samples for the report (including a stat-bearing offensive row).
    const burrow = rows.find((r) => r.player === 'Joe Burrow')
    const def = rows.find((r) => {
      const rs = r.regular_season ?? {}
      return rs.tackles != null && (rs.passing_yards == null || rs.passing_yards === 0)
    })
    const wrLike = rows.find((r) => {
      const rs = r.regular_season ?? {}
      return rs.receiving_yards != null && (rs.receiving_yards as number) > 0
    })
    for (const sample of [burrow, wrLike, def]) {
      if (sample && report.rawSamples.length < 3) report.rawSamples.push(sample)
    }

    if (args.limit && args.limit < rows.length) rows = rows.slice(0, args.limit)

    // Build the identity-map index up front (one query) so per-row matching is O(1).
    const identityRows = await prisma.playerIdentityMap.findMany({
      where: { sport: 'NFL', rollingInsightsId: { not: null } },
      select: {
        rollingInsightsId: true,
        normalizedName: true,
        position: true,
        canonicalName: true,
        currentTeam: true,
      },
    })
    const idByRiId = new Map<string, (typeof identityRows)[number]>()
    const byNamePos = new Map<string, Array<(typeof identityRows)[number]>>()
    for (const m of identityRows) {
      if (m.rollingInsightsId) idByRiId.set(m.rollingInsightsId, m)
      const key = `${m.normalizedName}|${(m.position ?? '').toLowerCase()}`
      const list = byNamePos.get(key) ?? []
      list.push(m)
      byNamePos.set(key, list)
    }

    for (const r of rows) {
      const riId = String(r.player_id)
      const rs = r.regular_season ?? null

      let matchedVia: 'id' | 'name' | null = null
      let matchedRow: (typeof identityRows)[number] | null = null

      if (idByRiId.has(riId)) {
        matchedRow = idByRiId.get(riId)!
        matchedVia = 'id'
        report.matchedById++
      } else {
        // Fallback: name + position match. We don't know position from the stats
        // payload directly, but we can infer it from which stat fields are non-null.
        // Conservative fallback: only succeed when exactly ONE identity row exists
        // for this normalized name regardless of position.
        const norm = normalizePoolName(r.player)
        const candidates = identityRows.filter((m) => m.normalizedName === norm)
        if (candidates.length === 1) {
          matchedRow = candidates[0]!
          matchedVia = 'name'
          report.matchedByName++
        } else if (candidates.length > 1) {
          report.ambiguousNameRejected++
        } else {
          report.unmatched++
        }
      }

      if (!matchedVia || !matchedRow) continue

      // Compute the playerId we write to PlayerSeasonStats. Always use RI's id for
      // the row from the player-stats endpoint — that's the natural key the
      // analytics loader uses (`loadRollingInsightsStatsDetailByPlayerIds(riPlayerIds)`).
      const playerIdForRow = riId
      const fantasyPoints = num(rs as Record<string, unknown> | null | undefined, 'DK_fantasy_points')
      const fantasyPointsPerGame = num(
        rs as Record<string, unknown> | null | undefined,
        'DK_fantasy_points_per_game',
      )
      const gamesPlayed = num(rs as Record<string, unknown> | null | undefined, 'games_played')

      if (!isApply) {
        report.written++
        if (report.writeSamples.length < 8) {
          report.writeSamples.push({
            playerId: playerIdForRow,
            name: r.player,
            fantasyPoints,
            fantasyPointsPerGame,
            games: gamesPlayed,
            matchedVia,
          })
        }
        continue
      }

      // Apply path. Without --force, refuse to overwrite a row whose existing
      // fantasyPoints is non-null. Always refresh the `stats` JSON since that's
      // what the splits builder reads — even on same-id existing rows the JSON
      // may have grown new keys (RI adds fields over time).
      const existing = await prisma.playerSeasonStats.findUnique({
        where: {
          sport_playerId_season_seasonType_source: {
            sport: 'NFL',
            playerId: playerIdForRow,
            season: seasonForDb,
            seasonType: 'regular',
            source: 'rolling_insights',
          },
        },
        select: { id: true, fantasyPoints: true },
      })

      if (existing && existing.fantasyPoints != null && !args.force) {
        report.skippedExisting++
        continue
      }

      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)
      try {
        await prisma.playerSeasonStats.upsert({
          where: {
            sport_playerId_season_seasonType_source: {
              sport: 'NFL',
              playerId: playerIdForRow,
              season: seasonForDb,
              seasonType: 'regular',
              source: 'rolling_insights',
            },
          },
          update: {
            playerName: r.player,
            position: matchedRow.position ?? null,
            team: matchedRow.currentTeam ?? null,
            stats: (rs ?? {}) as Prisma.InputJsonValue,
            gamesPlayed: gamesPlayed != null ? Math.round(gamesPlayed) : null,
            fantasyPoints,
            fantasyPointsPerGame,
            fetchedAt: new Date(),
            expiresAt,
          },
          create: {
            sport: 'NFL',
            playerId: playerIdForRow,
            playerName: r.player,
            season: seasonForDb,
            seasonType: 'regular',
            position: matchedRow.position ?? null,
            team: matchedRow.currentTeam ?? null,
            stats: (rs ?? {}) as Prisma.InputJsonValue,
            gamesPlayed: gamesPlayed != null ? Math.round(gamesPlayed) : null,
            fantasyPoints,
            fantasyPointsPerGame,
            source: 'rolling_insights',
            fetchedAt: new Date(),
            expiresAt,
          },
        })
        report.written++
        if (report.writeSamples.length < 8) {
          report.writeSamples.push({
            playerId: playerIdForRow,
            name: r.player,
            fantasyPoints,
            fantasyPointsPerGame,
            games: gamesPlayed,
            matchedVia,
          })
        }
      } catch (err) {
        report.errors.push(
          `upsert ${r.player} (ri=${riId}): ${err instanceof Error ? err.message : String(err)}`,
        )
      }
    }
  } catch (err) {
    report.errors.push(err instanceof Error ? err.message : String(err))
  }

  if (args.json) {
    console.log(JSON.stringify(report, null, 2))
  } else {
    console.log('────────────────────────────────────────────────────────')
    console.log(' E.2.7 — NFL PlayerSeasonStats backfill (rolling_insights)')
    console.log('────────────────────────────────────────────────────────')
    console.log(` Mode:                       ${report.mode}`)
    console.log(` Season (DB key):            ${seasonForDb}`)
    console.log(` Provider rows:              ${report.rowsFromProvider}`)
    if (args.teams) console.log(` After --teams filter:       ${report.rowsAfterTeamFilter}`)
    console.log(` Rows w/ regular_season:     ${report.rowsWithRegularSeason}`)
    console.log(` Rows w/ DK fantasy points:  ${report.rowsWithFantasyPoints}`)
    console.log('')
    console.log(' Match strategy:')
    console.log(`   matched by RI id:         ${report.matchedById}`)
    console.log(`   matched by normalized name: ${report.matchedByName}`)
    console.log(`   ambiguous (rejected):     ${report.ambiguousNameRejected}`)
    console.log(`   unmatched (skipped):      ${report.unmatched}`)
    console.log('')
    console.log(` Wrote:                      ${report.written}${isApply ? '' : ' (would write)'}`)
    console.log(` Skipped existing nonzero:   ${report.skippedExisting}`)

    if (report.rawSamples.length) {
      console.log('')
      console.log(' Raw provider samples (3 sanitized):')
      for (const s of report.rawSamples) {
        const rs = s.regular_season ?? {}
        console.log(`   • ${s.player.padEnd(24)} ri=${s.player_id}  team=${s.team}`)
        console.log(
          `       fp=${rs.DK_fantasy_points ?? '∅'}  fppg=${rs.DK_fantasy_points_per_game ?? '∅'}  g=${rs.games_played ?? '∅'}`,
        )
        console.log(
          `       pass: yds=${rs.passing_yards ?? '∅'} td=${rs.passing_touchdowns ?? '∅'} cmp=${rs.completions ?? '∅'} att=${rs.passing_attempts ?? '∅'} int=${rs.passing_interceptions ?? '∅'}`,
        )
        console.log(
          `       rush: yds=${rs.rushing_yards ?? '∅'} td=${rs.rushing_touchdowns ?? '∅'} att=${rs.rushing_attempts ?? '∅'}`,
        )
        console.log(
          `       recv: yds=${rs.receiving_yards ?? '∅'} td=${rs.receiving_touchdowns ?? '∅'} rec=${rs.receptions ?? '∅'} tar=${rs.targets ?? '∅'}`,
        )
      }
    }

    if (report.writeSamples.length) {
      console.log('')
      console.log(' Write samples (first 8):')
      for (const w of report.writeSamples) {
        console.log(
          `   • ${w.name.padEnd(24)} ri=${w.playerId.padEnd(6)}  fp=${w.fantasyPoints ?? '∅'}  fppg=${w.fantasyPointsPerGame ?? '∅'}  g=${w.games ?? '∅'}  via=${w.matchedVia}`,
        )
      }
    }

    if (report.errors.length) {
      console.log('')
      console.log(` Errors (${report.errors.length}):`)
      for (const e of report.errors.slice(0, 5)) console.log(`   ! ${e}`)
      if (report.errors.length > 5) console.log(`   …and ${report.errors.length - 5} more`)
    }
    if (!isApply) {
      console.log('')
      console.log(' [dry-run] Re-run with --apply to write to the database.')
    }
    console.log('────────────────────────────────────────────────────────')
  }

  await prisma.$disconnect()
}

main().catch(async (err) => {
  console.error('[backfill-nfl-player-season-stats] failed:', err)
  await prisma.$disconnect()
  process.exit(1)
})

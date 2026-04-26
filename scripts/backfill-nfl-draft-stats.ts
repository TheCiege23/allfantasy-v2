/**
 * E.2.5 — backfill NFL projected/season stats so the draft pool's projection
 * + rushing/receiving/passing columns render real numbers instead of em-dashes.
 *
 * USAGE
 *   npm run backfill:nfl-draft-stats                            # dry-run (default)
 *   npm run backfill:nfl-draft-stats -- --apply                 # write to DB
 *   npm run backfill:nfl-draft-stats -- --apply --season=2024
 *   npm run backfill:nfl-draft-stats -- --apply --teams=ATL,DAL # restrict probe
 *   npm run backfill:nfl-draft-stats -- --json                  # machine-readable
 *
 * What it writes (only on --apply):
 *   - SportsPlayer (NFL, source=rolling_insights) — one row per player.
 *   - PlayerSeasonStats (NFL, source=rolling_insights, seasonType=regular) — one row
 *     per (player, season) with rich `stats` JSON (rushing/receiving/passing fields)
 *     plus DK_fantasy_points / DK_fantasy_points_per_game.
 *   - PlayerIdentityMap (NFL) — one row per player linking normalizedName/position
 *     to rollingInsightsId so the draft-pool analytics loader can join pool rows
 *     to PlayerSeasonStats rows. Without these, the loader cannot bridge name-keyed
 *     pool rows to the RI-id-keyed stats table.
 *
 * Re-uses `syncNFLPlayersToDb` from lib/rolling-insights.ts for the SportsPlayer +
 * PlayerSeasonStats writes (already battle-tested) and adds the PlayerIdentityMap
 * upsert layer that was missing.
 */

/** server-only stub is loaded by scripts/_audit-preload.cjs (node --require). */

import { PrismaClient } from '@prisma/client'
import {
  fetchNFLTeams,
  fetchNFLRoster,
  syncNFLPlayersToDb,
  getLastFetchNFLRosterTrace,
  type RIPlayer,
} from '../lib/rolling-insights'

/**
 * Match the pool-side normalizer EXACTLY (see
 * lib/draft-room/getResolvedDraftPoolForLeague.ts → `normalizeDraftPoolNameForDedupe`).
 * The analytics loader joins PlayerIdentityMap.normalizedName ←→ this value, so any
 * divergence (e.g. stripping apostrophes) re-introduces the E.2 mismatch we just
 * fixed. Keep this in lock-step with the pool resolver.
 */
function normalizePoolName(name: string): string {
  return (name ?? '').trim().toLowerCase()
}

const prisma = new PrismaClient()

interface Args {
  apply: boolean
  json: boolean
  force: boolean
  season: string | null
  teams: string[] | null
  /** Accepted for parity with other audit/backfill scripts, currently unused. */
  league: string | null
  /** Accepted for parity; capped at the team-roster boundary today. */
  limit: number | null
}

function parseArgs(argv: string[]): Args {
  const out: Args = {
    apply: false,
    json: false,
    force: false,
    season: null,
    teams: null,
    league: null,
    limit: null,
  }
  for (const raw of argv) {
    if (raw === '--apply') out.apply = true
    else if (raw === '--json') out.json = true
    else if (raw === '--force') out.force = true
    else if (raw.startsWith('--season=')) out.season = raw.slice('--season='.length)
    else if (raw.startsWith('--teams=')) {
      out.teams = raw
        .slice('--teams='.length)
        .split(',')
        .map((s) => s.trim().toUpperCase())
        .filter(Boolean)
    } else if (raw.startsWith('--league=')) out.league = raw.slice('--league='.length)
    else if (raw.startsWith('--sport=')) {
      // Currently NFL-only; silently ignore other sports rather than fail.
    } else if (raw.startsWith('--limit=')) {
      const n = Number(raw.slice('--limit='.length))
      out.limit = Number.isFinite(n) && n > 0 ? n : null
    }
  }
  return out
}

interface BackfillReport {
  generatedAt: string
  args: Args
  mode: 'dry-run' | 'apply'
  teamsFetched: number
  teamsProcessed: number
  rosterPlayers: number
  identityMapWritten: number
  identityMapSkipped: number
  syncResultPlayersWritten: number | null
  /** E.2.6 — track which provider source each team's roster came from. */
  providerSourceByTeam: Record<string, 'rest' | 'graphql' | 'none'>
  errors: string[]
  sampleIdentityRows: Array<{
    canonicalName: string
    normalizedName: string
    position: string | null
    currentTeam: string | null
    rollingInsightsId: string
  }>
}

/**
 * Upsert one PlayerIdentityMap row for a given RI player. Skips if no usable
 * normalizedName. Idempotent — uses (sport, normalizedName, position) as the
 * de-facto natural key by checking findFirst before create/update.
 */
async function upsertIdentityForPlayer(
  p: RIPlayer,
  options: { force: boolean },
): Promise<'written' | 'skipped'> {
  const canonical = (p.player ?? '').trim()
  const normalized = normalizePoolName(canonical)
  if (!normalized || !p.id) return 'skipped'
  const position = (p.position ?? '').trim().toUpperCase() || null
  const currentTeam = (p.team?.abbrv ?? '').trim().toUpperCase() || null

  const existing = await prisma.playerIdentityMap.findFirst({
    where: { sport: 'NFL', normalizedName: normalized, position: position ?? undefined },
    select: { id: true, rollingInsightsId: true },
  })

  if (existing) {
    if (existing.rollingInsightsId === p.id) return 'skipped'
    // Without --force, leave a row that already has a (different) rollingInsightsId alone.
    // Only fill in when the existing row is null on rollingInsightsId. This prevents
    // accidentally clobbering a manually-curated mapping during routine backfills.
    if (existing.rollingInsightsId && !options.force) return 'skipped'
    await prisma.playerIdentityMap.update({
      where: { id: existing.id },
      data: {
        canonicalName: canonical,
        rollingInsightsId: p.id,
        currentTeam,
        lastSyncedAt: new Date(),
      },
    })
    return 'written'
  }

  await prisma.playerIdentityMap.create({
    data: {
      sport: 'NFL',
      canonicalName: canonical,
      normalizedName: normalized,
      position,
      currentTeam,
      rollingInsightsId: p.id,
      status: p.status ?? null,
    },
  })
  return 'written'
}

async function main() {
  const args = parseArgs(process.argv.slice(2))

  const report: BackfillReport = {
    generatedAt: new Date().toISOString(),
    args,
    mode: args.apply ? 'apply' : 'dry-run',
    teamsFetched: 0,
    teamsProcessed: 0,
    rosterPlayers: 0,
    identityMapWritten: 0,
    identityMapSkipped: 0,
    syncResultPlayersWritten: null,
    providerSourceByTeam: {},
    errors: [],
    sampleIdentityRows: [],
  }

  try {
    const teams = await fetchNFLTeams()
    report.teamsFetched = teams.length
    const filtered = args.teams
      ? teams.filter((t) => args.teams!.includes((t.abbrv ?? '').toUpperCase()))
      : teams
    report.teamsProcessed = filtered.length

    // Probe: collect rosters in dry-run so we can preview identity-map coverage
    // without writing. In apply mode we still iterate so we can write identity rows.
    for (const team of filtered) {
      try {
        const roster = await fetchNFLRoster({
          teamId: team.id,
          ...(args.season ? { season: args.season } : {}),
        })
        const trace = getLastFetchNFLRosterTrace()
        report.providerSourceByTeam[team.abbrv ?? team.id] = trace?.finalSource ?? 'none'
        report.rosterPlayers += roster.length
        for (const p of roster) {
          if (!p.id || !p.player) continue
          if (!args.apply) {
            // Dry-run: just count would-be rows.
            report.identityMapWritten++
            if (report.sampleIdentityRows.length < 8) {
              report.sampleIdentityRows.push({
                canonicalName: p.player,
                normalizedName: normalizePoolName(p.player),
                position: p.position ?? null,
                currentTeam: p.team?.abbrv ?? null,
                rollingInsightsId: p.id,
              })
            }
            continue
          }
          const result = await upsertIdentityForPlayer(p, { force: args.force })
          if (result === 'written') {
            report.identityMapWritten++
            if (report.sampleIdentityRows.length < 8) {
              report.sampleIdentityRows.push({
                canonicalName: p.player,
                normalizedName: normalizePoolName(p.player),
                position: p.position ?? null,
                currentTeam: p.team?.abbrv ?? null,
                rollingInsightsId: p.id,
              })
            }
          } else {
            report.identityMapSkipped++
          }
        }
      } catch (err) {
        report.errors.push(
          `team ${team.abbrv ?? team.id}: ${err instanceof Error ? err.message : String(err)}`,
        )
      }
    }

    // Run the SportsPlayer + PlayerSeasonStats sync only on --apply (it writes a lot).
    if (args.apply) {
      try {
        const syncCount = await syncNFLPlayersToDb(args.season ? { season: args.season } : undefined)
        report.syncResultPlayersWritten = syncCount
      } catch (err) {
        report.errors.push(
          `syncNFLPlayersToDb: ${err instanceof Error ? err.message : String(err)}`,
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
    console.log(' E.2.5 — NFL draft stats backfill')
    console.log('────────────────────────────────────────────────────────')
    console.log(` Mode:                    ${report.mode}`)
    console.log(` Teams fetched:           ${report.teamsFetched}`)
    console.log(` Teams processed:         ${report.teamsProcessed}`)
    console.log(` Roster players seen:     ${report.rosterPlayers}`)
    console.log(` Identity rows written:   ${report.identityMapWritten}${args.apply ? '' : ' (would write)'}`)
    console.log(` Identity rows skipped:   ${report.identityMapSkipped}`)
    if (report.syncResultPlayersWritten != null) {
      console.log(` syncNFLPlayersToDb:      ${report.syncResultPlayersWritten} player rows synced`)
    } else if (args.apply) {
      console.log(' syncNFLPlayersToDb:      (not run — see errors)')
    } else {
      console.log(' syncNFLPlayersToDb:      (skipped in dry-run; pass --apply to invoke)')
    }
    if (report.sampleIdentityRows.length) {
      console.log(' Sample identity rows:')
      for (const r of report.sampleIdentityRows) {
        console.log(
          `   • ${r.canonicalName.padEnd(28)} | ${r.normalizedName.padEnd(24)} | ${(r.position ?? '?').padEnd(4)} | ${r.currentTeam ?? '?'} → ri=${r.rollingInsightsId}`,
        )
      }
    }
    const sources = Object.values(report.providerSourceByTeam)
    if (sources.length) {
      const restCount = sources.filter((s) => s === 'rest').length
      const gqlCount = sources.filter((s) => s === 'graphql').length
      const noneCount = sources.filter((s) => s === 'none').length
      console.log(` Provider source:         REST=${restCount}  GraphQL=${gqlCount}  none=${noneCount}`)
    }
    if (report.errors.length) {
      console.log(` Errors (${report.errors.length}):`)
      for (const e of report.errors.slice(0, 5)) console.log(`   ! ${e}`)
      if (report.errors.length > 5) console.log(`   …and ${report.errors.length - 5} more`)
    }
    if (!args.apply) {
      console.log('')
      console.log(' [dry-run] Re-run with --apply to write to the database.')
    }
    console.log('────────────────────────────────────────────────────────')
  }

  await prisma.$disconnect()
}

main().catch(async (err) => {
  console.error('[backfill-nfl-draft-stats] failed:', err)
  await prisma.$disconnect()
  process.exit(1)
})

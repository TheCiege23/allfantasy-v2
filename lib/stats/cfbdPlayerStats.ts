import 'server-only'

import { prisma } from '@/lib/prisma'

/**
 * cfbdPlayerStats — NCAAF season stat lines from CollegeFootballData.
 *
 * Rolling Insights carries no college data (`fetched: 0` for NCAAF), so
 * `fantasy_stat_lines` had nothing for the sport, and compute-projections
 * correctly refused with "no fantasy_stat_lines found for sport=NCAAF". CFBD is
 * the only NCAAF feed we hold a key for, and it does have the stats.
 *
 * SHAPE: /stats/player/season returns LONG format — one row per player per stat
 * type, 139,100 rows covering 14,442 players for 2025. This pivots to one row
 * per player with a flat `category.statType` map, which is what FantasyStatLine
 * expects in `stats`.
 *
 * Follows the NFL path's conventions deliberately (see rollingInsightsPlayerStats):
 *  - `week: 0` marks a SEASON aggregate rather than a real week 0.
 *  - Components nest under `regular_season` with `games_played`, which is the
 *    shape lib/af-projections/core.ts reads. A flat payload is silently
 *    unreadable there: extractSeasonAggregate returns null and every row is
 *    refused as `no_games_played`, which is what the first cut of this did.
 *  - `fantasyPointsByScoringPreset` is left `{}`. Scoring belongs to whatever
 *    reads these under a league's own settings; filling it here would bake one
 *    preset's numbers into the store and call them the truth.
 */

const CFBD_BASE = 'https://api.collegefootballdata.com'
const STAT_TTL_MS = 7 * 24 * 60 * 60 * 1000

/**
 * CFBD's season endpoint carries NO games-played field (54 stat types, none of
 * them a game count), so it is derived by counting the distinct games a player
 * actually appears in. Without it every projection is correctly refused, since
 * per-game rates would otherwise divide by an assumed number.
 */
async function fetchGamesPlayed(season: number, key: string, maxWeek = 15): Promise<Map<string, number>> {
  const appearances = new Map<string, Set<string>>()

  for (let week = 1; week <= maxWeek; week += 1) {
    try {
      const res = await fetch(
        `${CFBD_BASE}/games/players?year=${season}&week=${week}&seasonType=regular`,
        { cache: 'no-store', headers: { Authorization: `Bearer ${key}` } },
      )
      if (!res.ok) continue
      const games = (await res.json()) as unknown
      if (!Array.isArray(games)) continue

      for (const game of games as Record<string, unknown>[]) {
        const gameId = String(game.id ?? '')
        if (!gameId) continue
        for (const team of (game.teams ?? []) as Record<string, unknown>[]) {
          for (const category of (team.categories ?? []) as Record<string, unknown>[]) {
            for (const type of (category.types ?? []) as Record<string, unknown>[]) {
              for (const athlete of (type.athletes ?? []) as Record<string, unknown>[]) {
                const id = athlete.id == null ? null : String(athlete.id)
                if (!id) continue
                let set = appearances.get(id)
                if (!set) {
                  set = new Set<string>()
                  appearances.set(id, set)
                }
                set.add(gameId)
              }
            }
          }
        }
      }
    } catch {
      // A missing week is missing data, not a reason to abandon the season.
    }
  }

  const counts = new Map<string, number>()
  for (const [id, set] of appearances) counts.set(id, set.size)
  return counts
}

/**
 * DraftKings classic scoring, applied to CFBD season totals.
 *
 * lib/af-projections/core.ts reads `regular_season.DK_fantasy_points_per_game`
 * as its scoring basis for a season aggregate. Rolling Insights ships that field;
 * CFBD does not, so without it every offensive player is refused for
 * `no_scoring_basis` — 4,637 of them, measured.
 *
 * This is a derivation from real stats using a published formula, not an
 * invented number. One HONEST LIMITATION: DraftKings pays a +3 bonus for a
 * 300-yard passing or 100-yard rushing/receiving GAME, and a season total
 * cannot tell you how many individual games cleared those lines. Those bonuses
 * are omitted rather than estimated, so this reads slightly LOW for players who
 * earned them. Understating is the safe direction — it never invents production
 * a player did not have.
 */
function dkFantasyPoints(stats: Record<string, number | string>): number | null {
  const n = (key: string): number => {
    const v = stats[key]
    return typeof v === 'number' && Number.isFinite(v) ? v : 0
  }

  const passYds = n('passing.YDS')
  const passTd = n('passing.TD')
  const passInt = n('passing.INT')
  const rushYds = n('rushing.YDS')
  const rushTd = n('rushing.TD')
  const recYds = n('receiving.YDS')
  const recTd = n('receiving.TD')
  const rec = n('receiving.REC')
  const fumLost = n('fumbles.LOST')

  const anyProduction =
    passYds || passTd || rushYds || rushTd || recYds || recTd || rec
  if (!anyProduction) return null

  return (
    passYds * 0.04 +
    passTd * 4 -
    passInt * 1 +
    rushYds * 0.1 +
    rushTd * 6 +
    recYds * 0.1 +
    recTd * 6 +
    rec * 1 -
    fumLost * 1
  )
}

/** Offensive skill positions. Defensive stats exist but no fantasy surface reads them yet. */
const FANTASY_POSITIONS = new Set(['QB', 'RB', 'FB', 'WR', 'TE'])

type CfbdStatRow = {
  season?: number
  playerId?: string | number
  player?: string
  position?: string
  team?: string
  conference?: string
  category?: string
  statType?: string
  stat?: string | number
}

export type CfbdStatSyncResult = {
  season: number
  fetched: number
  players: number
  written: number
  skippedNonFantasy: number
  /** Players we could count real games for; the rest are skipped, not assumed. */
  gamesPlayedResolved: number
  skippedNoGames: number
  errors: string[]
}

function cfbdKey(): string | null {
  return process.env.CFBD_KEY?.trim() || process.env.CFBD_API_KEY?.trim() || null
}

/**
 * CFBD ships stats as strings, including combined forms like "15/26" for
 * completions/attempts. A value that is not cleanly numeric is kept as the raw
 * string rather than coerced — Number("15/26") is NaN, and storing NaN or 0
 * would be worse than storing what the provider actually said.
 */
function parseStat(value: unknown): number | string | null {
  if (value == null) return null
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  const s = String(value).trim()
  if (!s) return null
  const n = Number(s)
  return Number.isFinite(n) ? n : s
}

export async function syncCfbdPlayerStatsToDb(opts?: {
  season?: number
  now?: Date
}): Promise<CfbdStatSyncResult> {
  const now = opts?.now ?? new Date()
  // Before September the current year has no completed games; last season is
  // the only real data, same fallback the NFL path makes.
  const defaultSeason = now.getMonth() + 1 >= 9 ? now.getFullYear() : now.getFullYear() - 1
  const season = opts?.season ?? defaultSeason

  const result: CfbdStatSyncResult = {
    season,
    fetched: 0,
    players: 0,
    written: 0,
    skippedNonFantasy: 0,
    gamesPlayedResolved: 0,
    skippedNoGames: 0,
    errors: [],
  }

  const key = cfbdKey()
  if (!key) {
    result.errors.push('CFBD key not configured')
    return result
  }

  let rows: CfbdStatRow[]
  try {
    const res = await fetch(`${CFBD_BASE}/stats/player/season?year=${season}`, {
      cache: 'no-store',
      headers: { Authorization: `Bearer ${key}` },
    })
    if (!res.ok) {
      result.errors.push(`CFBD responded ${res.status}`)
      return result
    }
    const parsed = (await res.json()) as unknown
    if (!Array.isArray(parsed)) {
      result.errors.push('CFBD returned a non-array payload')
      return result
    }
    rows = parsed as CfbdStatRow[]
  } catch (e) {
    result.errors.push(e instanceof Error ? e.message : String(e))
    return result
  }

  result.fetched = rows.length

  // Pivot long -> wide, one entry per player.
  type Pivoted = {
    playerId: string
    name: string
    position: string | null
    team: string | null
    stats: Record<string, number | string>
  }
  const byPlayer = new Map<string, Pivoted>()

  for (const r of rows) {
    const playerId = r.playerId == null ? null : String(r.playerId).trim()
    if (!playerId) continue
    const category = String(r.category ?? '').trim()
    const statType = String(r.statType ?? '').trim()
    if (!category || !statType) continue

    const value = parseStat(r.stat)
    if (value == null) continue

    let entry = byPlayer.get(playerId)
    if (!entry) {
      entry = {
        playerId,
        name: String(r.player ?? '').trim(),
        position: r.position ? String(r.position).trim().toUpperCase() : null,
        team: r.team ? String(r.team).trim() : null,
        stats: {},
      }
      byPlayer.set(playerId, entry)
    }
    // Position/team arrive on every row; keep the first non-empty.
    if (!entry.position && r.position) entry.position = String(r.position).trim().toUpperCase()
    if (!entry.team && r.team) entry.team = String(r.team).trim()
    entry.stats[`${category}.${statType}`] = value
  }

  result.players = byPlayer.size

  // Derived separately because the season endpoint has no game count.
  const gamesPlayed = await fetchGamesPlayed(season, key)
  result.gamesPlayedResolved = gamesPlayed.size

  const expiresAt = new Date(now.getTime() + STAT_TTL_MS)

  for (const entry of byPlayer.values()) {
    if (!entry.position || !FANTASY_POSITIONS.has(entry.position)) {
      result.skippedNonFantasy += 1
      continue
    }
    if (Object.keys(entry.stats).length === 0) continue

    // No game count means no honest per-game rate. Skipped rather than written
    // with an assumed number that the projection engine would then divide by.
    const gp = gamesPlayed.get(entry.playerId) ?? 0
    if (gp <= 0) {
      result.skippedNoGames += 1
      continue
    }

    // Null when the player recorded no offensive production at all; the field is
    // then omitted rather than written as 0, which would read as "scored zero".
    const dkTotal = dkFantasyPoints(entry.stats)

    try {
      const data = {
        team: entry.team,
        opponent: null,
        // `regular_season` nesting is required by extractSeasonAggregate.
        stats: {
          // `riPlayerName` / `riTeam` are RI-flavoured names, but they are the
          // contract lib/af-projections/core.ts reads for identity, and the
          // writer refuses a row with no position or player name rather than
          // substituting 'UNK'. A CFBD row therefore speaks the same keys
          // instead of teaching the shared extractor a second vocabulary and
          // risking the NFL path.
          riPlayerName: entry.name,
          riTeam: entry.team,
          name: entry.name,
          position: entry.position,
          cfbdPlayerId: entry.playerId,
          regular_season: {
            games_played: gp,
            ...entry.stats,
            ...(dkTotal == null
              ? {}
              : {
                  DK_fantasy_points: Math.round(dkTotal * 100) / 100,
                  DK_fantasy_points_per_game: Math.round((dkTotal / gp) * 100) / 100,
                }),
          },
        } as never,
        // Left empty on purpose — see the module comment.
        fantasyPointsByScoringPreset: {} as never,
        fetchedAt: now,
        expiresAt,
      }
      await prisma.fantasyStatLine.upsert({
        where: {
          uniq_fantasy_stat_line_player_week_source: {
            playerId: entry.playerId,
            sport: 'NCAAF',
            season: String(season),
            week: 0,
            source: 'cfbd',
          },
        },
        update: data,
        create: {
          playerId: entry.playerId,
          sport: 'NCAAF',
          season: String(season),
          week: 0,
          source: 'cfbd',
          ...data,
        },
      })
      result.written += 1
    } catch (e) {
      if (result.errors.length < 5) {
        result.errors.push(
          `upsert failed for ${entry.name}: ${(e instanceof Error ? e.message : String(e)).slice(0, 80)}`,
        )
      }
    }
  }

  return result
}

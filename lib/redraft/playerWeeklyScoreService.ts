import { prisma } from '@/lib/prisma'
import { calculateScoreFromSportConfig } from './scoringEngine'

type JsonRecord = Record<string, unknown>

export type WeeklyScoreSyncSummary = {
  leagueId: string
  seasonId: string
  sport: string
  season: number
  week: number
  rosteredPlayers: number
  cacheRowsRead: number
  scoresUpserted: number
  missingCachePlayerIds: string[]
  missingWeekPlayerIds: string[]
  missingStatPlayerIds: string[]
  warnings: string[]
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function asNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value)
    return Number.isFinite(n) ? n : undefined
  }
  return undefined
}

function firstNumber(source: JsonRecord, keys: string[]): number | undefined {
  for (const key of keys) {
    const n = asNumber(source[key])
    if (n !== undefined) return n
  }
  return undefined
}

function sumNumbers(source: JsonRecord, keys: string[]): number | undefined {
  let total = 0
  let found = false
  for (const key of keys) {
    const n = asNumber(source[key])
    if (n !== undefined) {
      total += n
      found = true
    }
  }
  return found ? total : undefined
}

function setIfNumber(out: Record<string, number>, key: string, value: number | undefined) {
  if (value !== undefined) out[key] = value
}

export function normalizeNflWeeklyStats(raw: unknown): Record<string, number> {
  const source = isRecord(raw) && isRecord(raw.stats) ? raw.stats : raw
  if (!isRecord(source)) return {}

  const out: Record<string, number> = {}

  setIfNumber(out, 'pass_yds', firstNumber(source, ['pass_yds', 'pass_yd', 'passing_yards', 'passingYards']))
  setIfNumber(out, 'pass_td', firstNumber(source, ['pass_td', 'passing_td', 'passing_touchdowns', 'passingTouchdowns']))
  setIfNumber(out, 'pass_int', firstNumber(source, ['pass_int', 'passing_int', 'interception_thrown', 'interceptions']))
  setIfNumber(out, 'rush_yds', firstNumber(source, ['rush_yds', 'rush_yd', 'rushing_yards', 'rushingYards']))
  setIfNumber(out, 'rush_td', firstNumber(source, ['rush_td', 'rushing_td', 'rushing_touchdowns', 'rushingTouchdowns']))
  setIfNumber(out, 'rec', firstNumber(source, ['rec', 'receptions', 'receiving_receptions']))
  setIfNumber(out, 'rec_yds', firstNumber(source, ['rec_yds', 'rec_yd', 'receiving_yards', 'receivingYards']))
  setIfNumber(out, 'rec_td', firstNumber(source, ['rec_td', 'receiving_td', 'receiving_touchdowns', 'receivingTouchdowns']))
  setIfNumber(out, 'two_pt', sumNumbers(source, ['two_pt', 'pass_2pt', 'rush_2pt', 'rec_2pt']))
  setIfNumber(out, 'fum_lost', firstNumber(source, ['fum_lost', 'fumbles_lost', 'fumble_lost']))
  setIfNumber(out, 'fumble_td', firstNumber(source, ['fumble_td', 'fum_rec_td']))
  setIfNumber(out, 'fg_0_39', sumNumbers(source, ['fg_0_39', 'fgm_0_19', 'fgm_20_29', 'fgm_30_39']))
  setIfNumber(out, 'fg_40_49', firstNumber(source, ['fg_40_49', 'fgm_40_49']))
  setIfNumber(out, 'fg_50_plus', firstNumber(source, ['fg_50_plus', 'fgm_50p', 'fgm_50_plus']))
  setIfNumber(out, 'fg_miss', firstNumber(source, ['fg_miss', 'fgmiss', 'fg_missed']))
  setIfNumber(out, 'xp_made', firstNumber(source, ['xp_made', 'xpm', 'pat_made']))
  setIfNumber(out, 'idp_solo', firstNumber(source, ['idp_solo', 'tackle_solo', 'solo_tkl']))
  setIfNumber(out, 'idp_assist', firstNumber(source, ['idp_assist', 'tackle_ast', 'assist_tkl']))
  setIfNumber(out, 'idp_sack', firstNumber(source, ['idp_sack', 'sack']))
  setIfNumber(out, 'idp_int', firstNumber(source, ['idp_int', 'def_int', 'int']))
  setIfNumber(out, 'idp_pd', firstNumber(source, ['idp_pd', 'pass_defended', 'pd']))
  setIfNumber(out, 'idp_ff', firstNumber(source, ['idp_ff', 'fum_forced', 'ff']))
  setIfNumber(out, 'idp_fr', firstNumber(source, ['idp_fr', 'fum_rec', 'fr']))
  setIfNumber(out, 'idp_td', firstNumber(source, ['idp_td', 'def_td']))
  setIfNumber(out, 'idp_safety', firstNumber(source, ['idp_safety', 'safety']))
  setIfNumber(out, 'idp_tfl', firstNumber(source, ['idp_tfl', 'tackle_loss', 'tfl']))
  setIfNumber(out, 'idp_qb_hit', firstNumber(source, ['idp_qb_hit', 'qb_hit', 'qb_hits']))

  return out
}

function rowWeek(row: unknown): number | null {
  if (!isRecord(row)) return null
  const direct = asNumber(row.week)
  if (direct !== undefined) return direct
  if (isRecord(row.stats)) {
    const nested = asNumber(row.stats.week)
    if (nested !== undefined) return nested
  }
  return null
}

export function findCachedWeekPayload(payload: unknown, week: number): unknown | null {
  if (Array.isArray(payload)) {
    return payload.find((row) => rowWeek(row) === week) ?? null
  }
  if (!isRecord(payload)) return null

  const direct = payload[String(week)]
  if (direct) return direct

  for (const key of ['gameLogs', 'weeklyStats', 'weeks', 'stats']) {
    const nested = payload[key]
    const found = findCachedWeekPayload(nested, week)
    if (found) return found
  }

  return rowWeek(payload) === week ? payload : null
}

function candidateSportKeys(sport: string): string[] {
  const upper = sport.toUpperCase()
  const lower = sport.toLowerCase()
  return upper === lower ? [upper] : [upper, lower]
}

async function recordScoreSyncAudit(summary: WeeklyScoreSyncSummary, actorId: string) {
  try {
    await (prisma as any).adminAuditLog?.create({
      data: {
        adminUserId: actorId,
        action: 'redraft_score_sync',
        targetType: 'redraft_season',
        targetId: summary.seasonId,
        details: summary,
      },
    })
  } catch {
    // Audit is best-effort; the sync result remains the source of truth for callers.
  }
}

export async function syncPlayerWeeklyScoresForRedraftSeason(params: {
  seasonId?: string
  leagueId?: string
  week?: number
  actorId?: string
}): Promise<WeeklyScoreSyncSummary> {
  const season = await prisma.redraftSeason.findFirst({
    where: params.seasonId ? { id: params.seasonId } : { leagueId: params.leagueId },
    orderBy: params.seasonId ? undefined : { createdAt: 'desc' },
  })

  if (!season) {
    throw new Error('Redraft season not found')
  }

  const week = Math.max(1, Number(params.week ?? season.currentWeek ?? 1) || 1)
  const sport = String(season.sport || 'NFL').toUpperCase()
  const seasonYear = Number(season.season)

  if (sport !== 'NFL') {
    throw new Error(`Weekly stat sync is currently wired for NFL only; ${sport} is not available yet.`)
  }

  const rosters = await prisma.redraftRoster.findMany({
    where: { seasonId: season.id, leagueId: season.leagueId },
    select: { id: true },
  })
  const rosterIds = rosters.map((r) => r.id)
  const rosterPlayers = rosterIds.length
    ? await prisma.redraftRosterPlayer.findMany({
        where: { rosterId: { in: rosterIds }, droppedAt: null },
        select: { playerId: true, sport: true },
      })
    : []

  const playerIds = Array.from(new Set(rosterPlayers.map((p) => p.playerId).filter(Boolean)))
  const summary: WeeklyScoreSyncSummary = {
    leagueId: season.leagueId,
    seasonId: season.id,
    sport,
    season: seasonYear,
    week,
    rosteredPlayers: playerIds.length,
    cacheRowsRead: 0,
    scoresUpserted: 0,
    missingCachePlayerIds: [],
    missingWeekPlayerIds: [],
    missingStatPlayerIds: [],
    warnings: [],
  }

  if (!playerIds.length) {
    summary.warnings.push('No rostered players found for this redraft season.')
    await recordScoreSyncAudit(summary, params.actorId ?? 'system')
    return summary
  }

  const cachedRows = await prisma.playerGameLogCache.findMany({
    where: {
      playerId: { in: playerIds },
      season: String(seasonYear),
      seasonType: 'regular',
      sport: { in: candidateSportKeys(sport) },
    },
  })
  summary.cacheRowsRead = cachedRows.length

  const cacheByPlayer = new Map(cachedRows.map((row) => [row.playerId, row]))
  const sportByPlayer = new Map(rosterPlayers.map((p) => [p.playerId, String(p.sport || sport).toUpperCase()]))

  for (const playerId of playerIds) {
    const cached = cacheByPlayer.get(playerId)
    if (!cached) {
      summary.missingCachePlayerIds.push(playerId)
      continue
    }

    const weekPayload = findCachedWeekPayload(cached.payload, week)
    if (!weekPayload) {
      summary.missingWeekPlayerIds.push(playerId)
      continue
    }

    const stats = normalizeNflWeeklyStats(weekPayload)
    if (!Object.keys(stats).length) {
      summary.missingStatPlayerIds.push(playerId)
      continue
    }

    const playerSport = sportByPlayer.get(playerId) ?? sport
    const fantasyPts = await calculateScoreFromSportConfig(season.leagueId, playerId, week, stats)

    await prisma.playerWeeklyScore.upsert({
      where: {
        playerId_week_season_sport: {
          playerId,
          week,
          season: seasonYear,
          sport: playerSport,
        },
      },
      update: {
        stats,
        fantasyPts,
        isFinalized: false,
      },
      create: {
        playerId,
        week,
        season: seasonYear,
        sport: playerSport,
        stats,
        fantasyPts,
        isFinalized: false,
      },
    })
    summary.scoresUpserted += 1
  }

  if (summary.missingCachePlayerIds.length) {
    summary.warnings.push('Some rostered players do not have cached game logs. Run the provider/cache job before score sync.')
  }
  if (summary.missingWeekPlayerIds.length) {
    summary.warnings.push(`Some cached players do not have week ${week} rows yet.`)
  }
  if (summary.missingStatPlayerIds.length) {
    summary.warnings.push('Some cached week rows did not contain recognized NFL stat keys.')
  }

  await recordScoreSyncAudit(summary, params.actorId ?? 'system')
  return summary
}

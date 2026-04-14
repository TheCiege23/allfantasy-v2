import 'server-only'

import { prisma } from '@/lib/prisma'
import { normalizeTeamAbbrev } from '@/lib/team-abbrev'
import type { LeagueSport } from '@prisma/client'
import { DEFAULT_SPORT, isSupportedSport, normalizeToSupportedSport } from '@/lib/sport-scope'
import { fetchWithChain } from '@/lib/workers/api-chain'
import { legacySupportedSportToApiChain } from '@/lib/workers/api-config'

export const LIVE_SCORES_FRESHNESS_MS = 60 * 1000

/** ESPN site.api scoreboard path segments (after sports/). */
const ESPN_SCOREBOARD_PATH: Record<LeagueSport, string | null> = {
  NFL: 'football/nfl',
  NBA: 'basketball/nba',
  NHL: 'hockey/nhl',
  MLB: 'baseball/mlb',
  NCAAF: 'football/college-football',
  NCAAB: 'basketball/mens-college-basketball',
  SOCCER: 'soccer/usa.1',
}

export interface LiveScoreRow {
  gameId: string
  homeTeam: string
  homeTeamFull: string
  homeLogo: string
  homeScore: number
  homeRecord: string | null
  awayTeam: string
  awayTeamFull: string
  awayLogo: string
  awayScore: number
  awayRecord: string | null
  status: string
  statusDetail: string
  period: number
  clock: string
  completed: boolean
  startTime: string
  venue: string | null
  broadcast: string | null
  odds: string | null
  overUnder: number | null
  week: number | null
  season: number
}

function asFiniteInt(v: unknown): number {
  const n = typeof v === 'number' ? v : Number.parseInt(String(v ?? ''), 10)
  return Number.isFinite(n) ? n : 0
}

/** Map Rolling Insights / chain score rows into the widget contract. */
export function mapChainScoreToLiveScore(raw: Record<string, unknown>, _sport: LeagueSport): LiveScoreRow | null {
  const gameId = String(raw.gameId ?? raw.id ?? raw.game_id ?? raw.externalId ?? '').trim()
  const homeRaw = String(raw.homeTeam ?? raw.home_team ?? raw.home ?? '').trim()
  const awayRaw = String(raw.awayTeam ?? raw.away_team ?? raw.away ?? '').trim()
  if (!gameId || !homeRaw || !awayRaw) return null

  const homeTeam = normalizeTeamAbbrev(homeRaw) || homeRaw
  const awayTeam = normalizeTeamAbbrev(awayRaw) || awayRaw
  const status =
    String(raw.status ?? raw.game_status ?? raw.state ?? 'scheduled') || 'scheduled'
  const dateRaw = raw.date ?? raw.startTime ?? raw.start_time
  const startTime =
    typeof dateRaw === 'string'
      ? dateRaw
      : dateRaw instanceof Date
        ? dateRaw.toISOString()
        : new Date().toISOString()

  return {
    gameId,
    homeTeam,
    homeTeamFull: String(raw.homeTeamFull ?? raw.homeName ?? homeRaw),
    homeLogo: String(raw.homeLogo ?? raw.home_logo ?? ''),
    homeScore: asFiniteInt(raw.homeScore ?? raw.home_score),
    homeRecord: typeof raw.homeRecord === 'string' ? raw.homeRecord : null,
    awayTeam,
    awayTeamFull: String(raw.awayTeamFull ?? raw.awayName ?? awayRaw),
    awayLogo: String(raw.awayLogo ?? raw.away_logo ?? ''),
    awayScore: asFiniteInt(raw.awayScore ?? raw.away_score),
    awayRecord: typeof raw.awayRecord === 'string' ? raw.awayRecord : null,
    status,
    statusDetail: String(raw.statusDetail ?? raw.status ?? status),
    period: asFiniteInt(raw.period ?? raw.periodNumber),
    clock: String(raw.clock ?? raw.displayClock ?? ''),
    completed: Boolean(raw.completed ?? String(status).toLowerCase().includes('final')),
    startTime,
    venue: typeof raw.venue === 'string' ? raw.venue : null,
    broadcast: typeof raw.broadcast === 'string' ? raw.broadcast : null,
    odds: typeof raw.odds === 'string' ? raw.odds : null,
    overUnder: typeof raw.overUnder === 'number' ? raw.overUnder : null,
    week: typeof raw.week === 'number' ? raw.week : raw.week != null ? asFiniteInt(raw.week) : null,
    season:
      typeof raw.season === 'number'
        ? raw.season
        : asFiniteInt(raw.season) || new Date().getFullYear(),
  }
}

interface ESPNCompetitor {
  team: { abbreviation: string; displayName: string; logo: string; id: string }
  score: string
  homeAway: 'home' | 'away'
  records?: Array<{ summary: string }>
}

interface ESPNCompetition {
  competitors: ESPNCompetitor[]
  status: {
    type: { name: string; shortDetail: string; completed: boolean }
    period: number
    displayClock: string
  }
  venue?: { fullName: string }
  odds?: Array<{ details: string; overUnder: number }>
  broadcasts?: Array<{ names: string[] }>
  startDate: string
}

interface ESPNEvent {
  id: string
  date: string
  season: { year: number }
  week?: { number: number }
  competitions: ESPNCompetition[]
}

async function fetchEspnScoreboard(sport: LeagueSport): Promise<LiveScoreRow[]> {
  const path = ESPN_SCOREBOARD_PATH[sport]
  if (!path) return []

  try {
    const url = `https://site.api.espn.com/apis/site/v2/sports/${path}/scoreboard`
    const response = await fetch(url, { cache: 'no-store' })
    if (!response.ok) return []
    const data = (await response.json()) as { events?: ESPNEvent[] }
    const events = data.events || []

    return events.map((event) => {
      const comp = event.competitions[0]
      const home = comp.competitors.find((c) => c.homeAway === 'home')!
      const away = comp.competitors.find((c) => c.homeAway === 'away')!
      return {
        gameId: event.id,
        homeTeam: normalizeTeamAbbrev(home.team.abbreviation) || home.team.abbreviation,
        homeTeamFull: home.team.displayName,
        homeLogo: home.team.logo,
        homeScore: parseInt(home.score, 10) || 0,
        homeRecord: home.records?.[0]?.summary ?? null,
        awayTeam: normalizeTeamAbbrev(away.team.abbreviation) || away.team.abbreviation,
        awayTeamFull: away.team.displayName,
        awayLogo: away.team.logo,
        awayScore: parseInt(away.score, 10) || 0,
        awayRecord: away.records?.[0]?.summary ?? null,
        status: comp.status.type.name,
        statusDetail: comp.status.type.shortDetail,
        period: comp.status.period,
        clock: comp.status.displayClock,
        completed: comp.status.type.completed,
        startTime: comp.startDate || event.date,
        venue: comp.venue?.fullName ?? null,
        broadcast: comp.broadcasts?.[0]?.names?.join(', ') ?? null,
        odds: comp.odds?.[0]?.details ?? null,
        overUnder: comp.odds?.[0]?.overUnder ?? null,
        week: event.week?.number ?? null,
        season: event.season.year,
      }
    })
  } catch (e) {
    console.error('[LiveScores] ESPN fetch failed:', sport, e)
    return []
  }
}

async function syncLiveScoresToDb(sport: LeagueSport, scores: LiveScoreRow[], source: string): Promise<number> {
  let synced = 0
  const now = new Date()
  const expiresAt = new Date(now.getTime() + LIVE_SCORES_FRESHNESS_MS * 5)

  for (const score of scores) {
    try {
      await prisma.sportsGame.upsert({
        where: {
          sport_externalId_source: {
            sport,
            externalId: score.gameId,
            source,
          },
        },
        update: {
          homeTeam: score.homeTeam,
          awayTeam: score.awayTeam,
          homeScore: score.homeScore,
          awayScore: score.awayScore,
          status: score.statusDetail,
          startTime: new Date(score.startTime),
          venue: score.venue,
          week: score.week,
          season: score.season,
          fetchedAt: now,
          expiresAt,
        },
        create: {
          sport,
          externalId: score.gameId,
          homeTeam: score.homeTeam,
          awayTeam: score.awayTeam,
          homeScore: score.homeScore,
          awayScore: score.awayScore,
          status: score.statusDetail,
          startTime: new Date(score.startTime),
          venue: score.venue,
          week: score.week,
          season: score.season,
          source,
          fetchedAt: now,
          expiresAt,
        },
      })
      synced++
    } catch (err) {
      console.error(`[LiveScores] Failed to sync game ${score.gameId}:`, err)
    }
  }

  return synced
}

function dbRowToLiveScore(g: {
  externalId: string
  homeTeam: string
  awayTeam: string
  homeScore: number | null
  awayScore: number | null
  status: string | null
  startTime: Date | null
  venue: string | null
  week: number | null
  season: number | null
  fetchedAt: Date
}): LiveScoreRow {
  return {
    gameId: g.externalId,
    homeTeam: g.homeTeam,
    homeTeamFull: g.homeTeam,
    homeLogo: '',
    homeScore: g.homeScore ?? 0,
    homeRecord: null,
    awayTeam: g.awayTeam,
    awayTeamFull: g.awayTeam,
    awayLogo: '',
    awayScore: g.awayScore ?? 0,
    awayRecord: null,
    status: g.status ?? 'STATUS_SCHEDULED',
    statusDetail: g.status ?? 'Scheduled',
    period: 0,
    clock: '0:00',
    completed: (g.status ?? '').toLowerCase().includes('final'),
    startTime: g.startTime?.toISOString() ?? '',
    venue: g.venue,
    broadcast: null,
    odds: null,
    overUnder: null,
    week: g.week,
    season: g.season ?? new Date().getFullYear(),
  }
}

/**
 * DB-first live scores: prefer Rolling Insights (`fetchWithChain` scores), then ESPN, persisted under distinct `source` keys.
 */
export async function getLiveScoresForSport(options: {
  sport: string
  team?: string | null
  forceRefresh?: boolean
}): Promise<{
  scores: LiveScoreRow[]
  source: string
  refreshed: boolean
  hasLiveGames: boolean
  nextRefreshMs: number
  fetchedAt: string | null
}> {
  const sport = normalizeToSupportedSport(options.sport)
  const team = options.team?.trim() || null
  const refresh = options.forceRefresh === true

  const cachedGames = await prisma.sportsGame.findMany({
    where: {
      sport,
      source: { in: ['rolling_insights', 'espn_live'] },
      ...(team
        ? {
            OR: [
              { homeTeam: normalizeTeamAbbrev(team) || team },
              { awayTeam: normalizeTeamAbbrev(team) || team },
            ],
          }
        : {}),
    },
    orderBy: { startTime: 'asc' },
  })

  const now = new Date()
  const stale =
    cachedGames.length === 0 ||
    cachedGames.some(
      (g) => g.fetchedAt && now.getTime() - g.fetchedAt.getTime() > LIVE_SCORES_FRESHNESS_MS
    )

  let scores: LiveScoreRow[] = []
  let refreshed = false
  let source: string = 'db_cache'
  let fetchedAt: string | null = cachedGames[0]?.fetchedAt?.toISOString() ?? null

  if (refresh || stale) {
    const chainSport = legacySupportedSportToApiChain(sport)
    const ri = await fetchWithChain({
      sport: chainSport,
      dataType: 'scores',
      query: { season: String(new Date().getFullYear()) },
      forceRefresh: refresh,
    })

    const rawList = Array.isArray(ri.data) ? ri.data : []
    const fromRi: LiveScoreRow[] = []
    for (const item of rawList) {
      if (!item || typeof item !== 'object') continue
      const row = mapChainScoreToLiveScore(item as Record<string, unknown>, sport)
      if (row) fromRi.push(row)
    }

    if (fromRi.length > 0) {
      await syncLiveScoresToDb(sport, fromRi, 'rolling_insights')
      scores = fromRi
      refreshed = true
      source = 'rolling_insights'
      fetchedAt = new Date().toISOString()
    } else {
      const espn = await fetchEspnScoreboard(sport)
      if (espn.length > 0) {
        await syncLiveScoresToDb(sport, espn, 'espn_live')
        scores = espn
        refreshed = true
        source = 'espn_live'
        fetchedAt = new Date().toISOString()
      }
    }
  }

  if (scores.length === 0) {
    const preferredRi = cachedGames.filter((g) => g.source === 'rolling_insights')
    const useRows = preferredRi.length > 0 ? preferredRi : cachedGames
    scores = useRows.map(dbRowToLiveScore)
    source = useRows[0]?.source === 'rolling_insights' ? 'db_cache_ri' : 'db_cache'
    fetchedAt = useRows[0]?.fetchedAt?.toISOString() ?? null
  }

  const filtered = team
    ? scores.filter((s) => {
        const norm = normalizeTeamAbbrev(team) || team
        return s.homeTeam === norm || s.awayTeam === norm
      })
    : scores

  const hasLiveGames = filtered.some(
    (s) => s.status === 'STATUS_IN_PROGRESS' || s.status === 'STATUS_HALFTIME'
  )

  return {
    scores: filtered,
    source,
    refreshed,
    hasLiveGames,
    nextRefreshMs: hasLiveGames ? LIVE_SCORES_FRESHNESS_MS : LIVE_SCORES_FRESHNESS_MS * 5,
    fetchedAt,
  }
}

export function parseSportQueryParam(raw: string | null | undefined): LeagueSport {
  if (!raw || raw.trim() === '') return DEFAULT_SPORT
  const u = raw.trim().toUpperCase()
  if (isSupportedSport(u)) return normalizeToSupportedSport(u)
  return DEFAULT_SPORT
}

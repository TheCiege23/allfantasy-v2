import 'server-only'

import { fetchClearSportsProjections, type ClearSportsSport } from '@/lib/clear-sports'
import type { AppPrismaClient } from '@/lib/sports-data-normalization/appPrismaClient'
import { fetchRollingInsights } from '@/lib/upstream-apis'
import type { NormalizedScoringRules } from '@/lib/league-context-engine/types'
import { normalizeToSupportedSport, type SupportedSport } from '@/lib/sport-scope'
import {
  PIPELINE_ID,
  SPORTS_DATA_NORMALIZATION_SCHEMA_VERSION,
} from '@/lib/sports-data-normalization/constants'
import { indexClearSportsProjections, pickProjectionRowForPlayer } from '@/lib/sports-data-normalization/clearSportsProjectionIndex'
import {
  extractFantasyPointsPerGame,
  extractProjectionPoints,
  extractReceptionsPerGame,
} from '@/lib/sports-data-normalization/extractNumeric'
import { injuryVolatility01 } from '@/lib/sports-data-normalization/injuryVolatility'
import { confidenceFromSources } from '@/lib/sports-data-normalization/projection/confidence'
import { adjustProjectionForLeagueScoring } from '@/lib/sports-data-normalization/projection/scoringRulesAdjust'
import { defaultGameTimeForSport } from '@/lib/weather/defaultGameTimes'
import {
  buildWeatherAugmentFromCachedWeather,
  mergeWeatherIntoNormalizedProjection,
} from '@/lib/weather/applyWeatherToFantasyProjection'
import { applyInjuryNewsToNormalizedProjection } from '@/lib/news-injury-aggregation/applyInjuryNewsProjection'
import { resolvePlayerInjuryNewsBatch } from '@/lib/news-injury-aggregation/resolveBatch'
import { fetchWeatherForTeamHomeWindow } from '@/lib/weather/venueResolver'
import type { NormalizedWeather } from '@/lib/weather/weatherService'
import type {
  NormalizedActualPerformance,
  NormalizedFantasyProjection,
  NormalizedInjuryStatus,
  NormalizedPlayerSportsProfile,
  NormalizedSportsDataBatch,
  NormalizedTeamRef,
  NormalizedTrendUsage,
  ProjectionBasis,
} from '@/lib/sports-data-normalization/types'

export type SportsPlayerRowInput = {
  name: string
  position: string | null
  team: string | null
  injuryStatus?: string | null
  projections?: unknown
  stats?: unknown
  externalId?: string | null
}

export type NormalizePlayerInput = {
  name: string
  rosterPlayerId?: string | null
  sportsPlayerRow?: SportsPlayerRowInput | null
}

function asSport(s: SupportedSport): ClearSportsSport {
  return s as ClearSportsSport
}

function mergeInjuryStatusWithLayer(
  current: NormalizedInjuryStatus | null,
  layer: import('@/lib/news-injury-aggregation/types').NormalizedPlayerInjuryNewsLayer,
): NormalizedInjuryStatus {
  const status =
    layer.canonicalStatus === 'unknown' ? current?.status ?? null : layer.canonicalStatus
  return {
    status,
    detail: layer.playerNewsSummary ?? current?.detail ?? null,
    updatedAt: layer.primarySourceAt ?? current?.updatedAt ?? null,
    source: 'news_injury_aggregation',
  }
}

function buildProjection(args: {
  sport: SupportedSport
  name: string
  position: string | null
  injuryStatus: string | null
  weeklyFromDb: number | null
  weeklyFromClearSports: number | null
  riFppg: number | null
  riSeasonStats: Record<string, unknown> | null
  dbFppg: number | null
  leagueScoring: NormalizedScoringRules | null | undefined
}): NormalizedFantasyProjection {
  const basisNotes: string[] = []
  const scoringNotes: string[] = []

  let projectedFantasyPoints: number | null = null
  let basis: ProjectionBasis = 'unknown'
  let providerProjectionPayload: Record<string, unknown> | null = null

  if (args.weeklyFromDb != null) {
    projectedFantasyPoints = args.weeklyFromDb
    basis = 'weekly_provider_projection'
    providerProjectionPayload = { layer: 'sports_db_projections_json' }
  } else if (args.weeklyFromClearSports != null) {
    projectedFantasyPoints = args.weeklyFromClearSports
    basis = 'weekly_provider_projection'
    providerProjectionPayload = { layer: 'clear_sports' }
  } else if (args.riFppg != null) {
    projectedFantasyPoints = args.riFppg
    basis = 'season_fppg_proxy'
    basisNotes.push(
      'Using Rolling Insights season fantasy points per game as a period proxy — not a provider weekly projection.',
    )
  } else if (args.dbFppg != null) {
    projectedFantasyPoints = args.dbFppg
    basis = 'season_avg_actual_proxy'
    basisNotes.push('Using DB stats FPPG as a proxy — not a weekly projection.')
  }

  const hasWeekly = args.weeklyFromDb != null || args.weeklyFromClearSports != null
  const hasRi = args.riFppg != null
  const hasDbProj = args.weeklyFromDb != null
  const hasCs = args.weeklyFromClearSports != null
  const { score: projectionConfidence, band: projectionConfidenceBand } = confidenceFromSources({
    hasWeeklyProjection: hasWeekly,
    hasSeasonFppg: hasRi || args.dbFppg != null,
    hasDbProjection: hasDbProj,
    hasClearSports: hasCs,
  })

  const rpg = extractReceptionsPerGame(args.riSeasonStats ?? undefined)

  let scoringRuleAdjustedProjection: number | null = null
  if (projectedFantasyPoints != null && args.sport === 'NFL' && basis === 'season_fppg_proxy') {
    const adj = adjustProjectionForLeagueScoring({
      sport: args.sport,
      position: args.position,
      basePoints: projectedFantasyPoints,
      basis: 'draftkings_fppg',
      rules: args.leagueScoring ?? null,
      receptionsPerGame: rpg,
    })
    scoringRuleAdjustedProjection = adj.value
    scoringNotes.push(...adj.notes)
  } else if (projectedFantasyPoints != null && basis === 'weekly_provider_projection') {
    scoringNotes.push(
      'Weekly projection from provider; league-specific stat weights may differ — use league scoring snapshot for interpretation.',
    )
  }

  const vol = injuryVolatility01(args.injuryStatus)
  let low: number | null = null
  let high: number | null = null
  if (projectedFantasyPoints != null) {
    low = projectedFantasyPoints * (1 - 0.35 * vol)
    high = projectedFantasyPoints * (1 + 0.45 * vol)
  }

  return {
    schemaVersion: 1,
    sport: args.sport,
    projectedFantasyPoints,
    projectedFantasyPointsRange: { low, high },
    projectionConfidence,
    projectionConfidenceBand,
    scoringRuleAdjustedProjection,
    injuryNews: null,
    weatherAdjustedProjection: null,
    weatherRiskLevel: null,
    weatherSummary: null,
    weatherConfidence: null,
    weatherImpactReason: null,
    scheduleAdjustedProjection: null,
    recentTrendAdjustedProjection: null,
    basis,
    basisNotes,
    providerProjectionPayload,
    scoringNotes,
  }
}

/**
 * Batch resolver: Rolling Insights → sports DB row → ClearSports projections.
 * Does not invent players or stats; surfaces gaps explicitly.
 */
export async function resolveNormalizedPlayerSportsProfiles(args: {
  prisma: AppPrismaClient
  sport: SupportedSport | string
  players: NormalizePlayerInput[]
  leagueScoring?: NormalizedScoringRules | null
  /** When false, skips ClearSports bulk fetch (faster). Default true. */
  includeClearSportsProjections?: boolean
}): Promise<NormalizedSportsDataBatch> {
  const sport = normalizeToSupportedSport(String(args.sport))
  const names = args.players.map((p) => p.name.trim()).filter(Boolean)
  const fetchedAt = new Date().toISOString()
  const batchDataGaps: string[] = []

  const ri = await fetchRollingInsights(
    { prisma: args.prisma },
    { playerNames: names, sport, includeStats: true },
  ).catch((): Awaited<ReturnType<typeof fetchRollingInsights>> => ({
    players: [],
    teams: [],
    fetchedAt: new Date().toISOString(),
    source: 'db_cache',
  }))

  if (ri.players.length === 0 && names.length > 0) {
    batchDataGaps.push('Rolling Insights returned no player rows for the requested names (cache or API).')
  }

  const riByName = new Map(ri.players.map((p) => [p.name.toLowerCase(), p]))

  let csIndex = { byName: new Map<string, Record<string, unknown>>(), byId: new Map<string, Record<string, unknown>>() }
  const useCs = args.includeClearSportsProjections !== false
  if (useCs && names.length > 0) {
    try {
      const rows = await fetchClearSportsProjections(asSport(sport))
      const capped = rows.length > 1200 ? rows.slice(0, 1200) : rows
      if (rows.length > 1200) {
        batchDataGaps.push('ClearSports projection list truncated to 1200 rows for indexing.')
      }
      csIndex = indexClearSportsProjections(capped, asSport(sport))
    } catch {
      batchDataGaps.push('ClearSports projections fetch failed (non-fatal).')
    }
  }

  const out: NormalizedPlayerSportsProfile[] = []

  for (const entry of args.players) {
    const name = entry.name.trim()
    if (!name) continue

    const row = entry.sportsPlayerRow ?? null
    const riRow = riByName.get(name.toLowerCase())

    const position = row?.position ?? riRow?.position ?? null
    const team: NormalizedTeamRef = {
      externalId: row?.externalId ?? riRow?.playerId ?? null,
      abbrev: row?.team ?? riRow?.team ?? null,
      name: null,
    }

    const weeklyFromDb = row?.projections != null ? extractProjectionPoints(row.projections) : null

    const csRow = pickProjectionRowForPlayer({
      name,
      externalId: row?.externalId ?? riRow?.playerId ?? null,
      index: csIndex,
    })
    const weeklyFromCs = csRow ? extractProjectionPoints(csRow) : null

    const riFppg = riRow?.fantasyPointsPerGame ?? null
    const riSeasonStats =
      riRow?.seasonStats && typeof riRow.seasonStats === 'object' && !Array.isArray(riRow.seasonStats)
        ? (riRow.seasonStats as Record<string, unknown>)
        : null

    const dbFppg = row?.stats != null ? extractFantasyPointsPerGame(row.stats) : null

    const injury: NormalizedInjuryStatus | null =
      row?.injuryStatus != null
        ? {
            status: row.injuryStatus,
            detail: null,
            updatedAt: null,
            source: 'sports_players_row',
          }
        : riRow?.status
          ? {
              status: riRow.status,
              detail: null,
              updatedAt: null,
              source: 'rolling_insights',
            }
          : null

    const actualPerformance: NormalizedActualPerformance | null =
      riFppg != null || riSeasonStats != null
        ? {
            fantasyPointsPerGame: riFppg,
            gamesPlayed: riRow?.gamesPlayed ?? null,
            seasonStats: riSeasonStats,
            source: 'rolling_insights',
          }
        : row?.stats
          ? {
              fantasyPointsPerGame: dbFppg,
              gamesPlayed: null,
              seasonStats: typeof row.stats === 'object' && row.stats && !Array.isArray(row.stats) ? (row.stats as Record<string, unknown>) : null,
              source: 'sports_db',
            }
          : null

    const trendUsage: NormalizedTrendUsage | null =
      riFppg != null
        ? {
            rollingFppg: riFppg,
            trendHint: 'Season FPPG from Rolling Insights / synced stats.',
            source: 'rolling_insights',
          }
        : null

    const projection = buildProjection({
      sport,
      name,
      position,
      injuryStatus: injury?.status ?? null,
      weeklyFromDb,
      weeklyFromClearSports: weeklyFromCs,
      riFppg,
      riSeasonStats,
      dbFppg,
      leagueScoring: args.leagueScoring,
    })

    const sourcesTried: NormalizedPlayerSportsProfile['sourcesTried'] = ['rolling_insights', 'sports_db']
    if (useCs) sourcesTried.push('clear_sports')

    const dataGaps: string[] = []
    if (projection.projectedFantasyPoints == null) {
      dataGaps.push('No real projection or FPPG proxy available for this player from configured sources.')
    }

    out.push({
      schemaVersion: 1,
      pipelineId: PIPELINE_ID,
      pipelineVersion: SPORTS_DATA_NORMALIZATION_SCHEMA_VERSION,
      sport,
      player: {
        id: entry.rosterPlayerId ?? row?.externalId ?? riRow?.playerId ?? null,
        name,
        position: { code: position, bucket: null },
        team,
      },
      injury,
      injuryNewsLayer: null,
      projection,
      actualPerformance,
      trendUsage,
      upcomingGame: null,
      sourcesTried,
      dataGaps,
    })
  }

  const injuryNewsMap = await resolvePlayerInjuryNewsBatch({
    prisma: args.prisma,
    sport,
    players: out.map((p) => ({
      playerName: p.player.name,
      playerId: p.player.id,
      teamAbbrev: p.player.team.abbrev,
    })),
  })

  for (const prof of out) {
    const layer = injuryNewsMap.get(prof.player.name.toLowerCase()) ?? null
    prof.injuryNewsLayer = layer
    prof.projection = applyInjuryNewsToNormalizedProjection(prof.projection, layer)
    if (layer) {
      prof.injury = mergeInjuryStatusWithLayer(prof.injury, layer)
      prof.sourcesTried.push('news_injury_aggregation')
    }
  }

  if (process.env.OPENWEATHERMAP_API_KEY?.trim() && out.length > 0) {
    const gameTime = defaultGameTimeForSport(sport)
    const teamAbbrevs = [
      ...new Set(
        out
          .map((p) => p.player.team.abbrev?.trim().toUpperCase())
          .filter((x): x is string => Boolean(x)),
      ),
    ]
    const wxByTeam = new Map<string, NormalizedWeather | null>()
    for (const t of teamAbbrevs) {
      try {
        const w = await fetchWeatherForTeamHomeWindow({ sport, teamAbbrev: t, gameTime })
        wxByTeam.set(t, w)
      } catch {
        wxByTeam.set(t, null)
      }
    }
    for (const prof of out) {
      const base =
        prof.projection.injuryNews?.adjustedPoints ??
        prof.projection.projectedFantasyPoints
      const abbrev = prof.player.team.abbrev?.trim().toUpperCase()
      if (base == null || !abbrev) continue
      const w = wxByTeam.get(abbrev) ?? null
      const aug = buildWeatherAugmentFromCachedWeather({
        sport,
        position: prof.player.position.code,
        teamAbbrev: abbrev,
        baselinePoints: base,
        weather: w,
      })
      if (aug) {
        prof.projection = mergeWeatherIntoNormalizedProjection(prof.projection, aug)
        if (aug.weather != null || aug.weatherAdjustedProjection != null) {
          prof.sourcesTried.push('openweathermap')
        }
      }
    }
  }

  return {
    schemaVersion: 1,
    pipelineId: PIPELINE_ID,
    pipelineVersion: SPORTS_DATA_NORMALIZATION_SCHEMA_VERSION,
    sport,
    fetchedAt,
    players: out,
    batchDataGaps,
  }
}

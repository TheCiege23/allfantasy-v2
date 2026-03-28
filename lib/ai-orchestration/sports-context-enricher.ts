/**
 * PROMPT 154 — AI + ClearSports orchestration. Enriches AI context envelopes with
 * normalized sports data (ClearSports or fallback). Deterministic-first; missing data
 * surfaced via dataQualityMetadata; no invented stats.
 */

import type { AIContextEnvelope } from '@/lib/unified-ai/types'
import { getSportsData, type DataType as SportsRouterDataType } from '@/lib/sports-router'
import { isSupportedSport, type SupportedSport } from '@/lib/sport-scope'
import { normalizeOrchestrationToolKey } from './tool-key-normalizer'
import { isClearSportsAvailable } from '@/lib/provider-config'
import {
  fetchClearSportsProjections,
  fetchClearSportsRankings,
  fetchClearSportsTrends,
  fetchClearSportsNews,
  type ClearSportsSport,
} from '@/lib/clear-sports'

type SportWithData = SupportedSport

function canFetchSportsData(sport: string): sport is SportWithData {
  return isSupportedSport(sport)
}

type CoreSportsEnrichmentDataType = Extract<
  SportsRouterDataType,
  'teams' | 'games' | 'schedule' | 'players' | 'standings' | 'team_stats'
>
type OptionalSportsEnrichmentDataType = 'projections' | 'rankings' | 'trends' | 'news'
export type SportsEnrichmentDataTypes = CoreSportsEnrichmentDataType | OptionalSportsEnrichmentDataType

export interface EnrichmentOptions {
  /** Which data types to fetch. When omitted, inferred from featureType. */
  dataTypes?: SportsEnrichmentDataTypes[]
  /** Optional player search terms to resolve player rows for deterministic tools. */
  playerSearchTerms?: string[]
  /** Optional season for games/schedule (e.g. "2024"). */
  season?: string
}

interface SportsContextFetchResult {
  sportsData: Record<string, unknown> | null
  source: string
  cached: boolean
  missing: string[]
  stale?: boolean
  attemptedSources: string[]
}

const FEATURE_PROFILE_WITH_STANDINGS = new Set([
  'rankings',
  'commentary',
  'power_rankings',
])

const FEATURE_PROFILE_WITH_GAMES = new Set([
  'matchup',
  'simulation',
  'matchup_simulator',
  'commentary',
  'story_creator',
  'chimmy_chat',
  'fantasy_coach',
])

const FEATURE_PROFILE_WITH_PLAYERS = new Set([
  'trade_analyzer',
  'trade_evaluator',
  'waiver_ai',
  'draft_helper',
  'matchup',
  'simulation',
  'rankings',
  'chimmy_chat',
  'fantasy_coach',
  'trend_detection',
  'player_comparison',
])

function unique<T>(items: T[]): T[] {
  return Array.from(new Set(items))
}

function toRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  return value as Record<string, unknown>
}

function collectCandidatePlayerTerms(input: unknown, out: Set<string>, depth: number = 0): void {
  if (depth > 3 || input == null) return
  if (typeof input === 'string') {
    const trimmed = input.trim()
    if (trimmed.length >= 3 && trimmed.length <= 60) out.add(trimmed)
    return
  }
  if (Array.isArray(input)) {
    for (const item of input.slice(0, 25)) collectCandidatePlayerTerms(item, out, depth + 1)
    return
  }
  if (typeof input !== 'object') return
  const record = input as Record<string, unknown>
  const directNameKeys = ['name', 'player', 'playerName', 'fullName', 'displayName']
  for (const key of directNameKeys) {
    const value = record[key]
    if (typeof value === 'string') {
      const trimmed = value.trim()
      if (trimmed.length >= 3 && trimmed.length <= 60) out.add(trimmed)
    }
  }
  const nestedKeys = [
    'players',
    'candidates',
    'targets',
    'board',
    'lineup',
    'lineups',
    'roster',
    'comparison',
    'comparisons',
    'waiverTargets',
  ]
  for (const key of nestedKeys) {
    if (key in record) collectCandidatePlayerTerms(record[key], out, depth + 1)
  }
}

function extractPlayerSearchTermsFromEnvelope(envelope: AIContextEnvelope): string[] {
  const terms = new Set<string>()
  collectCandidatePlayerTerms(envelope.deterministicPayload, terms, 0)
  collectCandidatePlayerTerms(envelope.statisticsPayload, terms, 0)
  return Array.from(terms).slice(0, 8)
}

function resolveDataTypesForFeature(featureType: string, explicit?: SportsEnrichmentDataTypes[]): SportsEnrichmentDataTypes[] {
  if (explicit && explicit.length > 0) return unique(explicit)
  const normalizedFeature = normalizeOrchestrationToolKey(featureType)
  const raw = featureType.toLowerCase()

  const types: SportsEnrichmentDataTypes[] = ['teams']
  if (
    FEATURE_PROFILE_WITH_GAMES.has(normalizedFeature) ||
    raw.includes('matchup') ||
    raw.includes('simulation') ||
    raw.includes('power-rankings')
  ) {
    types.push('games')
  }
  if (
    FEATURE_PROFILE_WITH_PLAYERS.has(normalizedFeature) ||
    raw.includes('player-comparison') ||
    raw.includes('waiver') ||
    raw.includes('draft')
  ) {
    types.push('players')
  }
  if (
    FEATURE_PROFILE_WITH_STANDINGS.has(normalizedFeature) ||
    raw.includes('rankings') ||
    raw.includes('power-rankings')
  ) {
    types.push('standings')
  }
  if (raw.includes('trend')) types.push('trends')
  if (raw.includes('chimmy') || raw.includes('coach') || raw.includes('story')) types.push('news')
  if (raw.includes('draft') || raw.includes('waiver') || raw.includes('matchup') || raw.includes('comparison')) {
    types.push('projections')
  }
  if (raw.includes('rankings')) types.push('rankings')
  return unique(types)
}

/**
 * Fetch normalized sports data (ClearSports or fallback) and return a payload safe for
 * statisticsPayload.sportsData. Never throws; on failure returns null and missing list.
 */
export async function fetchSportsContextForEnvelope(
  sport: string,
  options: EnrichmentOptions = {},
): Promise<SportsContextFetchResult> {
  const dataTypes = options.dataTypes ?? ['teams']
  const missing: string[] = []
  const attemptedSources: string[] = []

  if (!sport || !isSupportedSport(sport)) {
    return {
      sportsData: null,
      source: 'none',
      cached: false,
      missing: ['teams', 'games', 'schedule'].filter((d) => dataTypes.includes(d as any)),
      attemptedSources,
    }
  }

  if (!canFetchSportsData(sport)) {
    return {
      sportsData: null,
      source: 'none',
      cached: false,
      missing: dataTypes.slice(),
      stale: false,
      attemptedSources,
    }
  }

  const sportTyped = sport as SportWithData
  const clearSportsSport = sport as ClearSportsSport
  const out: Record<string, unknown> = {}
  let source = 'none'
  let cached = false
  let stale = false

  const trackSource = (value: string | undefined, fallbackSources?: string[]) => {
    if (value && value !== 'none' && source === 'none') source = value
    if (Array.isArray(fallbackSources)) attemptedSources.push(...fallbackSources)
  }

  try {
    if (dataTypes.includes('teams')) {
      const res = await getSportsData({ sport: sportTyped, dataType: 'teams' })
      const teams = Array.isArray(res.data) ? res.data : []
      out.teams = teams.slice(0, 50)
      if (teams.length > 0) {
        trackSource(res.source, res.attemptedSources)
        cached = cached || res.cached
        stale = stale || Boolean(res.stale)
      } else missing.push('teams')
    }

    if (dataTypes.includes('games') || dataTypes.includes('schedule')) {
      const res = await getSportsData({
        sport: sportTyped,
        dataType: 'games',
        season: options.season,
      })
      const games = Array.isArray(res.data) ? res.data : []
      out.games = games.slice(0, 30)
      if (games.length > 0) {
        trackSource(res.source, res.attemptedSources)
        cached = cached || res.cached
        stale = stale || Boolean(res.stale)
      }
      if (games.length === 0) missing.push('games')
    }

    if (dataTypes.includes('standings')) {
      const res = await getSportsData({
        sport: sportTyped,
        dataType: 'standings',
      })
      const standings = Array.isArray(res.data) ? res.data : []
      out.standings = standings.slice(0, 30)
      if (standings.length > 0) {
        trackSource(res.source, res.attemptedSources)
        cached = cached || res.cached
        stale = stale || Boolean(res.stale)
      } else {
        missing.push('standings')
      }
    }

    if (dataTypes.includes('team_stats')) {
      const res = await getSportsData({
        sport: sportTyped,
        dataType: 'team_stats',
      })
      const teamStats = Array.isArray(res.data) ? res.data : []
      out.teamStats = teamStats.slice(0, 30)
      if (teamStats.length > 0) {
        trackSource(res.source, res.attemptedSources)
        cached = cached || res.cached
        stale = stale || Boolean(res.stale)
      } else {
        missing.push('team_stats')
      }
    }

    if (dataTypes.includes('players')) {
      const terms = unique(options.playerSearchTerms ?? []).filter((term) => term.trim().length >= 3).slice(0, 6)
      if (terms.length === 0) {
        missing.push('players_query_context')
      } else {
        const players: Array<Record<string, unknown>> = []
        for (const term of terms) {
          const res = await getSportsData({
            sport: sportTyped,
            dataType: 'players',
            identifier: term,
          })
          const rows = Array.isArray(res.data) ? res.data : []
          trackSource(res.source, res.attemptedSources)
          cached = cached || res.cached
          stale = stale || Boolean(res.stale)
          for (const row of rows.slice(0, 10)) {
            const rec = toRecord(row)
            if (rec) players.push(rec)
          }
        }
        const deduped = Array.from(
          new Map(
            players.map((item) => {
              const id = typeof item.id === 'string' ? item.id : JSON.stringify(item).slice(0, 80)
              return [id, item]
            })
          ).values()
        )
        out.players = deduped.slice(0, 60)
        if (deduped.length === 0) missing.push('players')
      }
    }

    const clearSportsOnline = isClearSportsAvailable()
    if (dataTypes.includes('projections')) {
      if (!clearSportsOnline) missing.push('projections_provider_unavailable')
      else {
        const projections = await fetchClearSportsProjections(clearSportsSport, options.season)
        if (projections.length > 0) {
          out.projections = projections.slice(0, 80)
          trackSource('clear_sports')
        } else {
          missing.push('projections')
        }
      }
    }

    if (dataTypes.includes('rankings')) {
      if (!clearSportsOnline) missing.push('rankings_provider_unavailable')
      else {
        const rankings = await fetchClearSportsRankings(clearSportsSport, options.season)
        if (rankings.length > 0) {
          out.rankings = rankings.slice(0, 80)
          trackSource('clear_sports')
        } else {
          missing.push('rankings')
        }
      }
    }

    if (dataTypes.includes('trends')) {
      if (!clearSportsOnline) missing.push('trends_provider_unavailable')
      else {
        const trends = await fetchClearSportsTrends(clearSportsSport)
        if (trends.length > 0) {
          out.trends = trends.slice(0, 80)
          trackSource('clear_sports')
        } else {
          missing.push('trends')
        }
      }
    }

    if (dataTypes.includes('news')) {
      if (!clearSportsOnline) missing.push('news_provider_unavailable')
      else {
        const news = await fetchClearSportsNews(clearSportsSport, 25)
        if (news.length > 0) {
          out.news = news.slice(0, 25)
          trackSource('clear_sports')
        } else {
          missing.push('news')
        }
      }
    }
  } catch (_e) {
    for (const item of dataTypes) {
      if (!missing.includes(item)) missing.push(item)
    }
  }

  const hasAny = Object.values(out).some((value) => Array.isArray(value) && value.length > 0)
  const finalMissing = unique(missing)
  const finalSources = unique(attemptedSources)
  return {
    sportsData: hasAny ? out : null,
    source,
    cached,
    missing: finalMissing,
    stale: stale || cached,
    attemptedSources: finalSources,
  }
}

/**
 * Enrich an envelope with sports data when sport is set. Merges into statisticsPayload.sportsData,
 * sets dataQualityMetadata when data is missing or from fallback. Never throws.
 */
export async function enrichEnvelopeWithSportsData(
  envelope: AIContextEnvelope,
  options?: EnrichmentOptions,
): Promise<AIContextEnvelope> {
  const sport = envelope.sport?.trim()
  if (!sport) return envelope

  const dataTypes = resolveDataTypesForFeature(envelope.featureType, options?.dataTypes)
  const inferredPlayerTerms = options?.playerSearchTerms?.length
    ? options.playerSearchTerms
    : extractPlayerSearchTermsFromEnvelope(envelope)

  const { sportsData, source, missing, stale, cached, attemptedSources } = await fetchSportsContextForEnvelope(sport, {
    dataTypes,
    playerSearchTerms: inferredPlayerTerms,
    season: options?.season,
  })

  const statisticsPayload = { ...(envelope.statisticsPayload ?? {}) }
  statisticsPayload.sportsDataSource = source
  statisticsPayload.sportsDataCached = stale ?? false
  statisticsPayload.sportsDataState = sportsData ? (stale ? 'stale' : cached ? 'cached' : 'live') : 'missing'
  statisticsPayload.sportsDataCoverage = {
    requested: dataTypes,
    available: sportsData ? Object.keys(sportsData) : [],
    missing,
  }
  statisticsPayload.sportsDataAttemptedSources = attemptedSources
  if (sportsData && Object.keys(sportsData).length > 0) {
    statisticsPayload.sportsData = sportsData
  }

  const dataQualityMetadata = { ...(envelope.dataQualityMetadata ?? {}) }
  const missingForMetadata = missing.map((item) => `sports:${item}`)
  if (missingForMetadata.length > 0) {
    dataQualityMetadata.missing = [...new Set([...(dataQualityMetadata.missing ?? []), ...missingForMetadata])]
  }
  if (stale) dataQualityMetadata.stale = true

  const hardConstraints = [...(envelope.hardConstraints ?? [])]
  hardConstraints.push(
    'Use deterministic context and statisticsPayload.sportsData as the only factual sports context. Do not invent unsupported player/team/game stats.'
  )
  if (sportsData) {
    hardConstraints.push(
      `Sports context keys available: ${Object.keys(sportsData).join(', ')}. Cite only values present in these keys when making sports-specific claims.`
    )
  }
  if (missingForMetadata.length > 0) {
    hardConstraints.push(
      `Do not invent or assume data for: ${missingForMetadata.join(', ')}. When information is unavailable, say so explicitly.`,
    )
  }

  return {
    ...envelope,
    statisticsPayload: Object.keys(statisticsPayload).length > 0 ? statisticsPayload : envelope.statisticsPayload,
    dataQualityMetadata: Object.keys(dataQualityMetadata).length > 0 ? dataQualityMetadata : envelope.dataQualityMetadata,
    hardConstraints: hardConstraints.length > 0 ? hardConstraints : envelope.hardConstraints,
  }
}

/**
 * PROMPT 154 — AI + ClearSports orchestration. Enriches AI context envelopes with
 * normalized sports data (ClearSports or fallback). Deterministic-first; missing data
 * surfaced via dataQualityMetadata; no invented stats.
 */

import type { AIContextEnvelope } from '@/lib/unified-ai/types'
import { getSportsData } from '@/lib/sports-router'
import { isSupportedSport } from '@/lib/sport-scope'

/** Sports supported by getSportsData (sports-router). Other sports get metadata only. */
const SPORTS_WITH_DATA = ['NFL', 'NBA', 'MLB'] as const
type SportWithData = (typeof SPORTS_WITH_DATA)[number]

function canFetchSportsData(sport: string): sport is SportWithData {
  return SPORTS_WITH_DATA.includes(sport.toUpperCase() as SportWithData)
}

export type SportsEnrichmentDataTypes = 'teams' | 'games' | 'schedule'

export interface EnrichmentOptions {
  /** Which data types to fetch. Default: ['teams']. Add 'games' | 'schedule' for matchup/explainer. */
  dataTypes?: SportsEnrichmentDataTypes[]
  /** Optional season for games/schedule (e.g. "2024"). */
  season?: string
}

/**
 * Fetch normalized sports data (ClearSports or fallback) and return a payload safe for
 * statisticsPayload.sportsData. Never throws; on failure returns null and missing list.
 */
export async function fetchSportsContextForEnvelope(
  sport: string,
  options: EnrichmentOptions = {},
): Promise<{
  sportsData: Record<string, unknown> | null
  source: string
  cached: boolean
  missing: string[]
  stale?: boolean
}> {
  const dataTypes = options.dataTypes ?? ['teams']
  const missing: string[] = []

  if (!sport || !isSupportedSport(sport)) {
    return { sportsData: null, source: 'none', cached: false, missing: ['teams', 'games', 'schedule'].filter((d) => dataTypes.includes(d as any)) }
  }

  if (!canFetchSportsData(sport)) {
    return {
      sportsData: null,
      source: 'none',
      cached: false,
      missing: dataTypes.slice(),
      stale: false,
    }
  }

  const sportTyped = sport as SportWithData
  const out: Record<string, unknown> = {}
  let source = ''
  let cached = false

  try {
    if (dataTypes.includes('teams')) {
      const res = await getSportsData({ sport: sportTyped, dataType: 'teams' })
      const teams = Array.isArray(res.data) ? res.data : []
      out.teams = teams.slice(0, 50)
      if (teams.length > 0) {
        source = res.source
        cached = res.cached
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
      if (games.length > 0 && !source) {
        source = res.source
        cached = res.cached
      }
      if (games.length === 0) missing.push('games')
    }
  } catch (_e) {
    missing.push(...dataTypes)
  }

  const teamsLen = Array.isArray(out.teams) ? out.teams.length : 0
  const gamesLen = Array.isArray(out.games) ? out.games.length : 0
  const hasAny = Object.keys(out).length > 0 && (teamsLen + gamesLen) > 0
  return {
    sportsData: hasAny ? out : null,
    source: source || 'none',
    cached,
    missing,
    stale: cached,
  }
}

/** Feature types that benefit from games/schedule in addition to teams. */
const FEATURE_TYPES_WITH_GAMES = new Set([
  'matchup',
  'matchup_simulator',
  'rankings',
  'commentary',
  'story_creator',
])

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

  const wantGames = options?.dataTypes?.includes('games') ?? FEATURE_TYPES_WITH_GAMES.has(envelope.featureType)
  const dataTypes: SportsEnrichmentDataTypes[] = wantGames ? ['teams', 'games'] : ['teams']

  const { sportsData, source, missing, stale } = await fetchSportsContextForEnvelope(sport, {
    dataTypes,
    season: options?.season,
  })

  const statisticsPayload = { ...(envelope.statisticsPayload ?? {}) }
  if (sportsData && Object.keys(sportsData).length > 0) {
    statisticsPayload.sportsData = sportsData
    statisticsPayload.sportsDataSource = source
    statisticsPayload.sportsDataCached = stale ?? false
  }

  const dataQualityMetadata = { ...(envelope.dataQualityMetadata ?? {}) }
  if (missing.length > 0) {
    dataQualityMetadata.missing = [...new Set([...(dataQualityMetadata.missing ?? []), ...missing])]
  }
  if (stale) dataQualityMetadata.stale = true

  const hardConstraints = [...(envelope.hardConstraints ?? [])]
  if (missing.length > 0) {
    hardConstraints.push(
      `Do not invent or assume data for: ${missing.join(', ')}. When information is unavailable, say so explicitly.`,
    )
  }

  return {
    ...envelope,
    statisticsPayload: Object.keys(statisticsPayload).length > 0 ? statisticsPayload : envelope.statisticsPayload,
    dataQualityMetadata: Object.keys(dataQualityMetadata).length > 0 ? dataQualityMetadata : envelope.dataQualityMetadata,
    hardConstraints: hardConstraints.length > 0 ? hardConstraints : envelope.hardConstraints,
  }
}

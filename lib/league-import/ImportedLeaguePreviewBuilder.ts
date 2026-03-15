/**
 * Builds a user-facing import preview from NormalizedImportResult.
 * Aligns with AF Legacy league transfer preview expectations (managers, data quality, settings).
 */

import type { NormalizedImportResult } from './types'

export interface ImportPreviewLeague {
  id: string
  name: string
  sport: string
  season: number | null
  type: string
  teamCount: number
  playoffTeams: number | undefined
  avatar: string | null
  settings: {
    ppr?: boolean
    superflex?: boolean
    tep?: boolean
    rosterPositions?: string[]
  }
}

export interface ImportPreviewManager {
  rosterId: string
  ownerId: string
  username: string
  displayName: string
  avatar: string | null
  wins: number
  losses: number
  ties: number
  pointsFor: string
  rosterSize: number
  starters: string[]
  players: string[]
  reserve: string[]
  taxi: string[]
}

export interface ImportPreviewDataQuality {
  fetchedAt: number
  sources: {
    users: boolean
    rosters: boolean
    matchups: boolean
    trades: boolean
    draftPicks: boolean
    playerMap: boolean
    history: boolean
  }
  rosterCoverage: number
  matchupWeeksCovered: number
  completenessScore: number
  tier: 'FULL' | 'PARTIAL' | 'MINIMAL'
  signals: string[]
}

export interface ImportPreviewResponse {
  dataQuality: ImportPreviewDataQuality
  league: ImportPreviewLeague
  managers: ImportPreviewManager[]
  rosterPositions: string[]
  playerMap: Record<string, { name: string; position: string; team: string }>
  draftPickCount: number
  transactionCount: number
  matchupWeeks: number
  source: NormalizedImportResult['source']
}

function buildDataQuality(normalized: NormalizedImportResult): ImportPreviewDataQuality {
  const rosters = normalized.rosters
  const hasRosters = rosters.length > 0
  const rostersWithPlayers = rosters.filter((r) => (r.player_ids?.length ?? 0) > 0).length
  const rosterCoverage = hasRosters ? Math.round((rostersWithPlayers / rosters.length) * 100) : 0
  const matchupWeeksCovered = normalized.schedule?.length ?? 0
  const hasTrades = normalized.transactions.some((t) => t.type === 'trade')
  const sourcesAvailable = [
    rosters.length > 0,
    normalized.rosters.some((r) => r.owner_name),
    matchupWeeksCovered > 0,
    hasTrades,
    (normalized.draft_picks?.length ?? 0) > 0,
    Object.keys(normalized.player_map ?? {}).length > 0,
  ].filter(Boolean).length
  const completenessScore = Math.round(
    (sourcesAvailable / 6) * 50 +
      (rosterCoverage / 100) * 25 +
      (Math.min(matchupWeeksCovered, 17) / 17) * 25
  )
  const tier: 'FULL' | 'PARTIAL' | 'MINIMAL' =
    completenessScore >= 80 ? 'FULL' : completenessScore >= 50 ? 'PARTIAL' : 'MINIMAL'
  const signals: string[] = [
    ...(rosterCoverage < 100 ? [`${100 - rosterCoverage}% of rosters missing player data`] : []),
    ...(!hasTrades ? ['No trade history available'] : []),
    ...((normalized.draft_picks?.length ?? 0) === 0 ? ['No draft data available'] : []),
    ...(matchupWeeksCovered < 5 ? [`Only ${matchupWeeksCovered} weeks of matchup data`] : []),
    ...((normalized.previous_seasons?.length ?? 0) === 0 ? ['No previous season history'] : []),
    ...(Object.keys(normalized.player_map ?? {}).length === 0 ? ['Player name resolution unavailable'] : []),
  ]
  return {
    fetchedAt: Date.now(),
    sources: {
      users: rosters.some((r) => r.owner_name && r.owner_name !== 'Unknown'),
      rosters: hasRosters,
      matchups: matchupWeeksCovered > 0,
      trades: hasTrades,
      draftPicks: (normalized.draft_picks?.length ?? 0) > 0,
      playerMap: Object.keys(normalized.player_map ?? {}).length > 0,
      history: (normalized.previous_seasons?.length ?? 0) > 0,
    },
    rosterCoverage,
    matchupWeeksCovered,
    completenessScore: Math.max(0, Math.min(100, completenessScore)),
    tier,
    signals,
  }
}

/**
 * Build preview payload for UI from normalized import result.
 */
export function buildImportedLeaguePreview(normalized: NormalizedImportResult): ImportPreviewResponse {
  const leagueSettings = normalized.league as Record<string, unknown>
  const rosterPositions = (leagueSettings.roster_positions as string[]) ?? []
  const ppr = (leagueSettings.scoring_settings as Record<string, number>)?.rec ?? 0
  const superflex = rosterPositions.filter((p: string) => p === 'SUPER_FLEX').length > 0
  const tep = (leagueSettings.scoring_settings as Record<string, number>)?.bonus_rec_te ?? 0

  const league: ImportPreviewLeague = {
    id: normalized.source.source_league_id,
    name: normalized.league.name,
    sport: normalized.league.sport,
    season: normalized.league.season,
    type: normalized.league.isDynasty ? 'Dynasty' : 'Redraft',
    teamCount: normalized.league.leagueSize,
    playoffTeams: normalized.league.playoff_team_count,
    avatar: normalized.league_branding?.avatar_url ?? null,
    settings: {
      ppr: ppr > 0,
      superflex,
      tep: tep > 0,
      rosterPositions: rosterPositions.length ? rosterPositions : undefined,
    },
  }

  const managers: ImportPreviewManager[] = normalized.rosters.map((r) => ({
    rosterId: r.source_team_id,
    ownerId: r.source_manager_id,
    username: r.owner_name,
    displayName: r.owner_name,
    avatar: r.avatar_url,
    wins: r.wins,
    losses: r.losses,
    ties: r.ties,
    pointsFor: r.points_for.toFixed(2),
    rosterSize: r.player_ids?.length ?? 0,
    starters: r.starter_ids ?? [],
    players: r.player_ids ?? [],
    reserve: r.reserve_ids ?? [],
    taxi: r.taxi_ids ?? [],
  }))

  return {
    dataQuality: buildDataQuality(normalized),
    league,
    managers,
    rosterPositions,
    playerMap: normalized.player_map ?? {},
    draftPickCount: normalized.draft_picks?.length ?? 0,
    transactionCount: normalized.transactions?.length ?? 0,
    matchupWeeks: normalized.schedule?.length ?? 0,
    source: normalized.source,
  }
}

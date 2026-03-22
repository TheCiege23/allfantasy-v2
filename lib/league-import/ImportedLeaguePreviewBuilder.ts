/**
 * Builds a user-facing import preview from NormalizedImportResult.
 * Aligns with AF Legacy league transfer preview expectations (managers, data quality, settings).
 */

import type {
  ImportCoverageKey,
  ImportCoverageState,
  NormalizedImportResult,
} from './types'
import { normalizeToSupportedSport } from '@/lib/sport-scope'
import { getPrimaryLogoUrlForTeam, getTeamByAbbreviation } from '@/lib/sport-teams/SportTeamMetadataRegistry'

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
  teamName: string
  teamAbbreviation: string | null
  teamLogo: string | null
  managerAvatar: string | null
  /** Backward-compatible avatar field; mirrors managerAvatar. */
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

function inferTeamAbbreviationForSport(sport: string, teamName: string): string | null {
  const normalizedSport = normalizeToSupportedSport(sport)
  const raw = teamName.trim()
  if (!raw) return null

  const candidates: string[] = []
  const compact = raw.toUpperCase().replace(/[^A-Z0-9]/g, '')
  if (compact.length >= 2 && compact.length <= 5) candidates.push(compact)
  for (const token of raw.split(/\s+/)) {
    const t = token.toUpperCase().replace(/[^A-Z0-9]/g, '')
    if (t.length >= 2 && t.length <= 5) candidates.push(t)
  }

  for (const candidate of candidates) {
    if (getTeamByAbbreviation(normalizedSport, candidate)) return candidate
  }
  return null
}

function resolveImportTeamIdentity(
  sport: string,
  teamName: string,
  providerLogo: string | null | undefined
): { teamAbbreviation: string | null; teamLogo: string | null } {
  const explicitLogo = providerLogo ?? null
  if (explicitLogo) {
    const inferredAbbr = inferTeamAbbreviationForSport(sport, teamName)
    return { teamAbbreviation: inferredAbbr, teamLogo: explicitLogo }
  }

  const inferredAbbr = inferTeamAbbreviationForSport(sport, teamName)
  if (!inferredAbbr) return { teamAbbreviation: null, teamLogo: null }
  return {
    teamAbbreviation: inferredAbbr,
    teamLogo: getPrimaryLogoUrlForTeam(normalizeToSupportedSport(sport), inferredAbbr),
  }
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
  coverageSummary: Array<{
    key: ImportCoverageKey
    label: string
    state: ImportCoverageState
    count?: number | null
    note?: string | null
  }>
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

const COVERAGE_LABELS: Record<ImportCoverageKey, string> = {
  leagueSettings: 'League settings',
  currentRosters: 'Current rosters',
  historicalRosterSnapshots: 'Historical rosters',
  scoringSettings: 'Scoring settings',
  playoffSettings: 'Playoff settings',
  currentStandings: 'Standings',
  currentSchedule: 'Schedule',
  draftHistory: 'Draft history',
  tradeHistory: 'Trade history',
  previousSeasons: 'Previous seasons',
  playerIdentityMap: 'Player identity map',
}

const COVERAGE_WEIGHTS: Record<ImportCoverageKey, number> = {
  leagueSettings: 10,
  currentRosters: 15,
  historicalRosterSnapshots: 10,
  scoringSettings: 10,
  playoffSettings: 10,
  currentStandings: 10,
  currentSchedule: 5,
  draftHistory: 10,
  tradeHistory: 10,
  previousSeasons: 5,
  playerIdentityMap: 5,
}

function getCoverageStateScore(state: ImportCoverageState): number {
  switch (state) {
    case 'full':
      return 1
    case 'partial':
      return 0.5
    default:
      return 0
  }
}

function buildDataQuality(normalized: NormalizedImportResult): ImportPreviewDataQuality {
  const rosters = normalized.rosters
  const hasRosters = rosters.length > 0
  const rostersWithPlayers = rosters.filter((r) => (r.player_ids?.length ?? 0) > 0).length
  const rosterCoverage = hasRosters ? Math.round((rostersWithPlayers / rosters.length) * 100) : 0
  const matchupWeeksCovered = normalized.schedule?.length ?? 0
  const coverageSummary = (Object.entries(normalized.coverage) as Array<
    [ImportCoverageKey, NormalizedImportResult['coverage'][ImportCoverageKey]]
  >).map(([key, value]) => ({
    key,
    label: COVERAGE_LABELS[key],
    state: value.state,
    count: value.count ?? null,
    note: value.note ?? null,
  }))
  const weightedCoverage = coverageSummary.reduce(
    (total, item) => total + COVERAGE_WEIGHTS[item.key] * getCoverageStateScore(item.state),
    0
  )
  const completenessScore = Math.round(
    Math.max(0, Math.min(100, weightedCoverage))
  )
  const tier: 'FULL' | 'PARTIAL' | 'MINIMAL' =
    completenessScore >= 80 ? 'FULL' : completenessScore >= 50 ? 'PARTIAL' : 'MINIMAL'
  const signals: string[] = coverageSummary.flatMap((item) => {
    if (item.state === 'full') {
      return []
    }

    const base =
      item.state === 'partial'
        ? `${item.label} is partial`
        : `${item.label} is missing`
    return item.note ? [`${base}: ${item.note}`] : [base]
  })
  return {
    fetchedAt: Date.now(),
    sources: {
      users: rosters.some((r) => r.owner_name && r.owner_name !== 'Unknown'),
      rosters: normalized.coverage.currentRosters.state !== 'missing',
      matchups: normalized.coverage.currentSchedule.state !== 'missing',
      trades: normalized.coverage.tradeHistory.state !== 'missing',
      draftPicks: normalized.coverage.draftHistory.state !== 'missing',
      playerMap: normalized.coverage.playerIdentityMap.state !== 'missing',
      history:
        normalized.coverage.previousSeasons.state !== 'missing' ||
        normalized.coverage.historicalRosterSnapshots.state !== 'missing',
    },
    rosterCoverage,
    matchupWeeksCovered,
    completenessScore: Math.max(0, Math.min(100, completenessScore)),
    tier,
    signals,
    coverageSummary,
  }
}

/**
 * Build preview payload for UI from normalized import result.
 */
export function buildImportedLeaguePreview(normalized: NormalizedImportResult): ImportPreviewResponse {
  const leagueSettings = normalized.league as Record<string, unknown>
  const rosterPositions = (leagueSettings.roster_positions as string[]) ?? []
  const ppr =
    (leagueSettings.scoring_settings as Record<string, number>)?.rec ??
    (normalized.scoring?.scoring_format === 'ppr' || normalized.scoring?.scoring_format === 'half'
      ? 1
      : normalized.league.scoring === 'ppr' || normalized.league.scoring === 'half'
        ? 1
        : 0)
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

  const managers: ImportPreviewManager[] = normalized.rosters.map((r) => {
    const teamName = r.team_name?.trim() || r.owner_name
    const identity = resolveImportTeamIdentity(normalized.league.sport, teamName, r.avatar_url)
    return {
      teamName,
      teamAbbreviation: identity.teamAbbreviation,
      teamLogo: identity.teamLogo,
      rosterId: r.source_team_id,
      ownerId: r.source_manager_id,
      username: r.owner_name,
      displayName: r.owner_name,
      managerAvatar: r.avatar_url,
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
    }
  })

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

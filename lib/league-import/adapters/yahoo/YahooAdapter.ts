import type { ILeagueImportAdapter } from '../ILeagueImportAdapter'
import type { NormalizedImportResult, SourceTracking } from '../../types'
import type { YahooImportPayload } from './types'

function detectYahooScoringFormat(raw: YahooImportPayload): string | null {
  const receptionCategory = raw.settings?.statCategories.find((category) => {
    const name = `${category.name ?? ''} ${category.displayName ?? ''}`.toLowerCase()
    return name.includes('reception') || name === 'rec'
  })
  if (!receptionCategory?.statId) {
    return raw.league.sport === 'NFL' ? 'standard' : raw.settings?.scoringType ?? null
  }

  const receptionModifier = raw.settings?.statModifiers.find(
    (modifier) => modifier.statId === receptionCategory.statId
  )
  const receptionValue = receptionModifier?.value ?? 0
  if (receptionValue >= 1) return 'ppr'
  if (receptionValue >= 0.5) return 'half'
  return 'standard'
}

function detectYahooDynasty(raw: YahooImportPayload): boolean {
  const settings = raw.settings?.raw ?? {}
  const keeperLikeKeys = ['keeper_players', 'is_keeper', 'uses_keepers', 'keeper_deadline']
  return keeperLikeKeys.some((key) => Boolean(settings[key]))
}

export const YahooAdapter: ILeagueImportAdapter<YahooImportPayload> = {
  provider: 'yahoo',

  async normalize(raw) {
    const importBatchId = `yahoo-${raw.league.leagueKey}-${Date.now()}`
    const source: SourceTracking = {
      source_provider: 'yahoo',
      source_league_id: raw.league.leagueKey,
      source_season_id: raw.league.season != null ? String(raw.league.season) : undefined,
      import_batch_id: importBatchId,
      imported_at: new Date().toISOString(),
    }

    const rosterPositions = raw.settings?.rosterPositions ?? []
    const rosterSize =
      rosterPositions.length > 0
        ? rosterPositions.reduce((total, slot) => total + Math.max(0, slot.count), 0)
        : null
    const scoringFormat = detectYahooScoringFormat(raw)
    const isDynasty = detectYahooDynasty(raw)
    const regularSeasonLength =
      raw.settings?.usesPlayoff && raw.settings.playoffStartWeek != null && raw.league.startWeek != null
        ? Math.max(0, raw.settings.playoffStartWeek - raw.league.startWeek)
        : raw.league.endWeek ?? undefined

    const rosters = raw.teams.map((team) => ({
      source_team_id: team.teamKey,
      source_manager_id: team.managerGuid || team.managerId || team.teamKey,
      owner_name: team.managerName || team.teamName,
      team_name: team.teamName,
      avatar_url: team.logoUrl,
      wins: team.wins,
      losses: team.losses,
      ties: team.ties,
      points_for: team.pointsFor,
      points_against: team.pointsAgainst ?? undefined,
      player_ids: team.rosterPlayerIds,
      starter_ids: team.starterPlayerIds,
      reserve_ids: team.reservePlayerIds,
      taxi_ids: [],
      faab_remaining: team.faabBalance,
      waiver_priority: team.waiverPriority,
    }))

    const statCategoryById = new Map(
      (raw.settings?.statCategories ?? []).map((category) => [category.statId, category])
    )
    const scoring = raw.settings
      ? {
          scoring_format: scoringFormat ?? raw.settings.scoringType ?? 'standard',
          rules: raw.settings.statModifiers.map((rule) => {
            const category = statCategoryById.get(rule.statId)
            return {
              stat_key: `yahoo_stat_${rule.statId}`,
              points_value: rule.value,
              multiplier: undefined,
              name: category?.name ?? undefined,
              display_name: category?.displayName ?? undefined,
            }
          }),
          raw: raw.settings.raw,
        }
      : null

    const schedule = raw.schedule.map((week) => ({
      week: week.week,
      season: week.season,
      matchups: week.matchups.map((matchup) => ({
        roster_id_1: matchup.teamKey1,
        roster_id_2: matchup.teamKey2,
        points_1: matchup.points1,
        points_2: matchup.points2,
      })),
    }))

    const transactions = raw.transactions
      .map((transaction) => {
        const normalizedType =
          transaction.type === 'trade'
            ? 'trade'
            : transaction.type.includes('add')
              ? 'free_agent'
              : 'drop'
        return {
          source_transaction_id: transaction.transactionId,
          type: normalizedType as 'trade' | 'drop' | 'free_agent',
          status: transaction.status,
          created_at: transaction.createdAt ?? source.imported_at,
          adds: Object.keys(transaction.adds).length > 0 ? transaction.adds : undefined,
          drops: Object.keys(transaction.drops).length > 0 ? transaction.drops : undefined,
          roster_ids: transaction.teamKeys,
          draft_picks: [],
        }
      })
      .filter((transaction) => transaction.roster_ids.length > 0 || transaction.type === 'trade')

    const standings = raw.teams.map((team) => ({
      source_team_id: team.teamKey,
      rank: team.rank ?? raw.teams.length,
      wins: team.wins,
      losses: team.losses,
      ties: team.ties,
      points_for: team.pointsFor,
      points_against: team.pointsAgainst ?? undefined,
    }))

    const playerMap = raw.teams.reduce<Record<string, { name: string; position: string; team: string }>>(
      (acc, team) => {
        Object.assign(acc, team.playerMap)
        return acc
      },
      {}
    )

    const result: NormalizedImportResult = {
      source,
      league: {
        name: raw.league.name,
        sport: raw.league.sport,
        season: raw.league.season,
        leagueSize: raw.league.numTeams,
        rosterSize,
        scoring: scoringFormat,
        isDynasty,
        playoff_team_count: raw.settings?.usesPlayoff ? undefined : 0,
        regular_season_length: regularSeasonLength,
        schedule_unit: raw.league.sport === 'NFL' ? 'week' : 'period',
        matchup_frequency: raw.settings?.scoringType ?? 'head',
        waiver_type: raw.settings?.usesFaab ? 'faab' : 'priority',
        faab_budget: null,
        roster_positions: rosterPositions.map((slot) => `${slot.position}:${slot.count}`),
        yahoo_settings: raw.settings?.raw ?? null,
      },
      rosters,
      scoring,
      schedule,
      draft_picks: [],
      transactions,
      standings,
      player_map: playerMap,
      previous_seasons: [],
      coverage: {
        leagueSettings: {
          state: 'full',
          count: 1,
        },
        currentRosters: {
          state: rosters.length > 0 ? 'full' : 'missing',
          count: rosters.length,
        },
        historicalRosterSnapshots: {
          state: 'missing',
          note: 'Historical Yahoo roster snapshots are not imported yet.',
        },
        scoringSettings: {
          state: raw.settings?.statModifiers.length ? 'full' : raw.settings ? 'partial' : 'missing',
          count: raw.settings?.statModifiers.length ?? 0,
          note:
            raw.settings?.statModifiers.length
              ? null
              : 'Yahoo scoring settings were only partially available from league metadata.',
        },
        playoffSettings: {
          state: raw.settings ? 'full' : 'partial',
          note:
            raw.settings?.usesPlayoff != null
              ? null
              : 'Yahoo playoff settings were only partially available from league metadata.',
        },
        currentStandings: {
          state: standings.length > 0 ? 'full' : 'missing',
          count: standings.length,
        },
        currentSchedule: {
          state: schedule.length > 0 ? 'partial' : 'missing',
          count: schedule.length,
          note:
            schedule.length > 0
              ? 'Yahoo import currently captures the available in-season scoreboard snapshot, not the full season schedule.'
              : 'No Yahoo scoreboard data was available for this league preview.',
        },
        draftHistory: {
          state: 'missing',
          note: 'Yahoo draft history import is not wired into the unified import pipeline yet.',
        },
        tradeHistory: {
          state: 'partial',
          count: transactions.length,
          note: 'Yahoo import currently captures available league transactions, but not full historical trade history across prior seasons.',
        },
        previousSeasons: {
          state: 'missing',
          note: 'Previous Yahoo seasons are not linked into the unified import pipeline yet.',
        },
        playerIdentityMap: {
          state: Object.keys(playerMap).length > 0 ? 'partial' : 'missing',
          count: Object.keys(playerMap).length,
          note:
            Object.keys(playerMap).length > 0
              ? 'Current Yahoo rosters include provider-local player identity metadata.'
              : 'Yahoo player identity metadata was not available from the fetched rosters.',
        },
      },
    }

    return result
  },
}

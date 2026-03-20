import type { IExternalHistoryMapper, NormalizedHistory } from '../../mappers/ExternalHistoryMapper'
import type { FantraxImportPayload } from './types'

export const FantraxHistoryMapper: IExternalHistoryMapper<FantraxImportPayload> = {
  map(source) {
    const transactions = source.transactions.map((transaction) => ({
      source_transaction_id: transaction.transactionId,
      type:
        transaction.type === 'trade'
          ? ('trade' as const)
          : transaction.type === 'drop'
            ? ('drop' as const)
            : transaction.type === 'waiver'
              ? ('waiver' as const)
              : ('free_agent' as const),
      status: transaction.status,
      created_at: transaction.createdAt ?? new Date().toISOString(),
      adds: Object.keys(transaction.adds).length > 0 ? transaction.adds : undefined,
      drops: Object.keys(transaction.drops).length > 0 ? transaction.drops : undefined,
      roster_ids: transaction.teamIds,
      draft_picks: [],
    }))

    const draft_picks = source.draftPicks.map((pick) => ({
      round: pick.round,
      pick_no: pick.pickNumber,
      source_roster_id: pick.teamId,
      source_player_id: pick.playerId,
      season: source.league.season,
      source_draft_id: `${source.league.leagueId}:${source.league.season ?? 'unknown'}`,
      player_name: pick.playerName ?? null,
      position: pick.position ?? null,
      team: pick.team ?? null,
    }))

    const standings = source.teams.map((team) => ({
      source_team_id: team.teamId,
      rank: team.rank ?? source.teams.length,
      wins: team.wins,
      losses: team.losses,
      ties: team.ties,
      points_for: team.pointsFor,
      points_against: team.pointsAgainst ?? undefined,
    }))

    return {
      draft_picks,
      transactions,
      standings,
    } satisfies NormalizedHistory
  },
}

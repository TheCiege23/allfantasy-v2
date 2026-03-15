import type { IExternalRosterMapper } from '../../mappers/ExternalRosterMapper'
import type { NormalizedRoster } from '../../types'
import type { SleeperImportPayload } from './types'

export const SleeperRosterMapper: IExternalRosterMapper<SleeperImportPayload> = {
  map(source) {
    const rosters = source.rosters ?? []
    const users = source.users ?? []
    return rosters.map((roster) => {
      const user = users.find((u) => u.user_id === roster.owner_id)
      const displayName = user?.display_name || user?.username || 'Unknown'
      const avatarUrl = user?.avatar ? `https://sleepercdn.com/avatars/thumbs/${user.avatar}` : null
      const fpts = (roster.settings?.fpts ?? 0) + (roster.settings?.fpts_decimal ?? 0) / 100
      return {
        source_team_id: String(roster.roster_id),
        source_manager_id: roster.owner_id,
        owner_name: displayName,
        team_name: displayName,
        avatar_url: avatarUrl,
        wins: roster.settings?.wins ?? 0,
        losses: roster.settings?.losses ?? 0,
        ties: roster.settings?.ties ?? 0,
        points_for: fpts,
        points_against: undefined,
        player_ids: roster.players ?? [],
        starter_ids: roster.starters?.filter((s) => s && s !== '0') ?? [],
        reserve_ids: roster.reserve,
        taxi_ids: roster.taxi,
        faab_remaining: null,
        waiver_priority: null,
      } satisfies NormalizedRoster
    })
  },
}

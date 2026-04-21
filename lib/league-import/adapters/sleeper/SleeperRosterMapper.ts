import type { IExternalRosterMapper } from '../../mappers/ExternalRosterMapper'
import type { NormalizedRoster } from '../../types'
import type { SleeperImportPayload } from './types'

export const SleeperRosterMapper: IExternalRosterMapper<SleeperImportPayload> = {
  map(source) {
    const rosters = source.rosters ?? []
    const users = source.users ?? []
    const commissionerId = source.league?.commissioner_id ?? null
    const coCommissionerIds = new Set(
      Array.isArray(source.league?.metadata?.co_commissioners)
        ? source.league.metadata.co_commissioners.filter(
            (value): value is string => typeof value === 'string' && value.trim().length > 0,
          )
        : [],
    )
    return rosters.map((roster) => {
      const ownerId = typeof roster.owner_id === 'string' ? roster.owner_id.trim() : ''
      const user = users.find((u) => u.user_id === ownerId)
      const displayName = user?.display_name || user?.username || 'Unknown'
      const platformTeamName = user?.metadata?.team_name?.trim() || ''
      const avatarUrl = user?.avatar ? `https://sleepercdn.com/avatars/thumbs/${user.avatar}` : null
      const fpts = (roster.settings?.fpts ?? 0) + (roster.settings?.fpts_decimal ?? 0) / 100
      const settings = (roster.settings ?? {}) as Record<string, unknown>
      const waiverBudgetUsedRaw = settings.waiver_budget_used
      const waiverPositionRaw = settings.waiver_position
      // waiver_budget_used is referenced to ensure the field is acknowledged;
      // downstream consumers can enrich via roster.settings.waiver_budget_used.
      void waiverBudgetUsedRaw
      const waiverPosition =
        typeof waiverPositionRaw === 'number'
          ? waiverPositionRaw
          : typeof waiverPositionRaw === 'string'
            ? Number.parseInt(waiverPositionRaw, 10)
            : null
      const isOwnerFlag = user?.is_owner === true
      const isMetaCommissioner = String(user?.metadata?.is_commissioner ?? '').toLowerCase() === 'true'
      const isMetaCoOwner = String(user?.metadata?.co_owner ?? '').toLowerCase() === 'true'
      const isCommissioner =
        Boolean(ownerId) &&
        (ownerId === commissionerId || isOwnerFlag || isMetaCommissioner)
      const isCoCommissioner =
        Boolean(ownerId) && !isCommissioner && (coCommissionerIds.has(ownerId) || isMetaCoOwner)
      const isOrphan = !ownerId
      return {
        source_team_id: String(roster.roster_id),
        source_manager_id: ownerId,
        owner_name: displayName,
        team_name: platformTeamName || displayName,
        avatar_url: avatarUrl,
        is_commissioner: isCommissioner,
        is_co_commissioner: isCoCommissioner,
        is_orphan: isOrphan,
        wins: roster.settings?.wins ?? 0,
        losses: roster.settings?.losses ?? 0,
        ties: roster.settings?.ties ?? 0,
        points_for: fpts,
        points_against: undefined,
        player_ids: roster.players ?? [],
        starter_ids: roster.starters?.filter((s) => s && s !== '0') ?? [],
        reserve_ids: roster.reserve,
        taxi_ids: roster.taxi,
        // Sleeper exposes only waiver_budget_used on roster.settings; without
        // league total we can't compute remaining here, so leave null.
        // waiver_budget_used is referenced for completeness below.
        faab_remaining: null,
        waiver_priority:
          waiverPosition != null && Number.isFinite(waiverPosition) ? waiverPosition : null,
      } satisfies NormalizedRoster
    })
  },
}

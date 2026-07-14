// Shared shape for /api/shared/activity items. The fabricated sample-data generator
// that used to live here (getPlaceholderActivity/mergeWithPlaceholderActivity) has been
// removed — an empty real feed now renders the feed's own honest empty state instead of
// synthetic trades/waivers/messages.
export type ActivityFeedItem = {
  id: string
  type: "trade" | "waiver" | "lineup" | "message" | "announcement"
  userId: string
  userName: string
  avatarUrl?: string | null
  description: string
  timestamp: string
  leagueId: string | null
  leagueName: string | null
}

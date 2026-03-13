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

/**
 * Placeholder activity feed for when the API returns no items.
 */
export function getPlaceholderActivity(): ActivityFeedItem[] {
  const now = Date.now()
  return [
    {
      id: "a1",
      type: "trade",
      userId: "u2",
      userName: "Rival GM",
      avatarUrl: null,
      description: "Completed a trade: sent Brandon Aiyuk, received Garrett Wilson + 2025 2nd.",
      timestamp: new Date(now - 3600000).toISOString(),
      leagueId: "lg1",
      leagueName: "AllFantasy Dynasty 1",
    },
    {
      id: "a2",
      type: "waiver",
      userId: "u3",
      userName: "Stacked Contender",
      avatarUrl: null,
      description: "Claimed Jayden Reed off waivers.",
      timestamp: new Date(now - 7200000).toISOString(),
      leagueId: "lg1",
      leagueName: "AllFantasy Dynasty 1",
    },
    {
      id: "a3",
      type: "lineup",
      userId: "u1",
      userName: "You",
      avatarUrl: null,
      description: "Updated starting lineup for Week 12.",
      timestamp: new Date(now - 86400000).toISOString(),
      leagueId: "lg1",
      leagueName: "AllFantasy Dynasty 1",
    },
    {
      id: "a4",
      type: "message",
      userId: "u2",
      userName: "Rival GM",
      avatarUrl: null,
      description: "Who's trading a RB1 for picks?",
      timestamp: new Date(now - 90000).toISOString(),
      leagueId: "lg1",
      leagueName: "AllFantasy Dynasty 1",
    },
    {
      id: "a5",
      type: "announcement",
      userId: "comm",
      userName: "Commissioner",
      avatarUrl: null,
      description: "Trade deadline is Sunday 11:59 PM ET. No exceptions.",
      timestamp: new Date(now - 172800000).toISOString(),
      leagueId: "lg1",
      leagueName: "AllFantasy Dynasty 1",
    },
  ]
}

export function mergeWithPlaceholderActivity(
  fromApi: ActivityFeedItem[],
  usePlaceholder = true
): ActivityFeedItem[] {
  if (!usePlaceholder || fromApi.length > 0) return fromApi
  return getPlaceholderActivity()
}

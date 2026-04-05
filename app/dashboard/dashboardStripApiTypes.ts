/** Shared types for GET /api/dashboard/waivers and /trades — safe for client import. */

export type WaiverPickup = {
  playerId: string
  playerName: string
  position: string
  team: string
  addReason: string
}

export type WaiverDrop = {
  playerId: string
  playerName: string
  position: string
  team: string
}

export type WaiverLeagueRec = {
  leagueId: string
  leagueName: string
  leagueAvatar: string | null
  sport: string
  platform: string
  pickups: WaiverPickup[]
  drops: WaiverDrop[]
  chimmyAdvice: string
  waiverDeadline: string | null
}

export type WaiverDashboardResponse = {
  totalLeagues: number
  recommendations: WaiverLeagueRec[]
}

export type TradeAsset = {
  playerId: string | null
  playerName: string
  position: string
  team: string
  isPick?: boolean
  pickRound?: string
}

export type PendingTrade = {
  transactionId: string
  proposedBy: string
  proposedAt: string | null
  assetsGiven: TradeAsset[]
  assetsReceived: TradeAsset[]
  chimmyVerdict: 'accept' | 'decline' | 'negotiate'
  chimmyReason: string
}

export type PendingTradeLeague = {
  leagueId: string
  leagueName: string
  leagueAvatar: string | null
  sport: string
  trades: PendingTrade[]
}

export type TradesDashboardResponse = {
  totalPending: number
  trades: PendingTradeLeague[]
}

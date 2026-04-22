/**
 * Canonical shape for league feed rows (stored in `LeagueEvent.payload` + title/description).
 */

export type LeagueFeedActorType = "user" | "ai" | "system" | "commissioner"

export type LeagueFeedImportance = "low" | "normal" | "high"

/** Stored inside LeagueEvent.payload JSON */
export type LeagueFeedPayload = {
  actorType: LeagueFeedActorType
  actorId?: string | null
  actorName?: string | null
  actorAvatar?: string | null
  teamId?: string | null
  teamName?: string | null
  flavorLine?: string | null
  category?: LeagueFeedCategory
  importance?: LeagueFeedImportance
  botArchetypeId?: string | null
  botArchetypeLabel?: string | null
  /** Original structured fields */
  details?: Record<string, unknown>
}

export type LeagueFeedCategory =
  | "draft"
  | "waivers"
  | "trades"
  | "lineups"
  | "matchups"
  | "commissioner"
  | "ai"
  | "system"
  | "other"

export type LeagueFeedEventType =
  | "draft_pick"
  | "auto_pick"
  | "waiver_claim"
  | "drop"
  | "trade_proposed"
  | "trade_accepted"
  | "trade_rejected"
  | "trade_countered"
  | "lineup_set"
  | "player_moved"
  | "commissioner_message"
  | "ai_team_enabled"
  | "ai_team_takeover"
  | "matchup_result"
  | "playoff_clinch"
  | "eliminated"
  | "league_joined"
  | "league_created"
  | "draft_started"
  | "draft_completed"

export type CreateLeagueFeedEventInput = {
  leagueId: string
  eventType: string
  /** Primary one-line summary — always accurate */
  message: string
  actorType: LeagueFeedActorType
  actorId?: string | null
  actorName?: string | null
  actorAvatar?: string | null
  teamId?: string | null
  teamName?: string | null
  flavorLine?: string | null
  category?: LeagueFeedCategory
  importance?: LeagueFeedImportance
  botArchetypeId?: string | null
  botArchetypeLabel?: string | null
  details?: Record<string, unknown>
  visibility?: "league" | "commissioners_only"
}

/**
 * In-app tournament notification types (client). Push copy can map to spoiler-safe strings.
 */
export type TournamentNotificationPriority = 'critical' | 'high' | 'medium' | 'low'

export type TournamentNotificationKind =
  | 'tournament_created'
  | 'opening_league_assigned'
  | 'weekly_standings_updated'
  | 'bubble_warning'
  | 'qualified'
  | 'wildcard_qualified'
  | 'eliminated'
  | 'next_league_assigned'
  | 'draft_starts_soon'
  | 'draft_room_live'
  | 'round_completed'
  | 'finals_reached'
  | 'champion_crowned'

export type TournamentNotification = {
  id: string
  kind: TournamentNotificationKind
  priority: TournamentNotificationPriority
  title: string
  body: string
  createdAt: string
  href?: string
  read?: boolean
}

export const TOURNAMENT_NOTIFICATION_SPOILER: Partial<Record<TournamentNotificationKind, string>> = {
  qualified: 'Something good happened in your tournament',
  wildcard_qualified: 'Something good happened in your tournament',
  eliminated: 'Your tournament update is ready',
  draft_room_live: 'Your draft is now open — tap to join',
  champion_crowned: 'Tournament results are in',
}

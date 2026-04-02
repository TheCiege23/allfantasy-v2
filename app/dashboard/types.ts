/** 3-panel dashboard layout widths (px) — master spec */
export const DASHBOARD_LEFT_PANEL_WIDTH = 280
export const DASHBOARD_RIGHT_PANEL_WIDTH = 300

export interface UserLeague {
  id: string
  name: string
  platform: string
  sport: string
  format: string
  scoring: string
  teamCount: number
  season: string | number
  status?: string
  isDynasty?: boolean
  settings?: Record<string, unknown>
  sleeperLeagueId?: string
}

/** Props contract for `LeftChatPanel` (shared with /dashboard and /league/[id]) */
export type LeftChatPanelLayoutProps = {
  selectedLeague: UserLeague | null
  userId: string
  width: number
  rootId?: string | null
}

/** Props contract for `RightControlPanel` */
export type RightControlPanelLayoutProps = {
  leagues: UserLeague[]
  leaguesLoading: boolean
  selectedId: string | null
  onSelectLeague: (league: UserLeague | null) => void
  userId: string
  onImport: () => void
  onAfterLeagueNavigate?: () => void
}

export interface DashboardConnectedLeague extends UserLeague {
  sourceLeagueId: string
  syncStatus?: string | null
  avatarUrl?: string | null
  platformLeagueId?: string | null
}

export interface LeagueTeamSlot {
  id: string
  externalId: string
  teamName: string
  ownerName: string
  avatarUrl: string | null
  role: string
  isOrphan: boolean
  claimedByUserId: string | null
  draftPosition: number | null
  wins: number
  losses: number
  ties: number
  pointsFor: number
}

export interface LeagueDetail {
  id: string
  name: string
  sport: string
  format: string
  scoring: string
  teamCount: number
  season: number | null
  platform: string
  isDynasty: boolean
  settings: Record<string, unknown> | null
  userRole: string
  inviteToken: string | null
  inviteUrl: string | null
  draftDate: string | null
  draftStatus: string | null
  teams: LeagueTeamSlot[]
}

export interface LeagueChatMessage {
  id: string
  authorName: string
  authorAvatar: string | null
  text: string
  messageType: string
  relativeTime: string
  createdAt: string
}

export interface ChecklistStep {
  id: string
  label: string
  description: string
  done: boolean
  ctaHref?: string
  ctaLabel?: string
}

export type LeagueTab =
  | 'draft'
  | 'team'
  | 'league'
  | 'players'
  | 'trend'
  | 'trades'
  | 'scores'

export type AFChatTab = 'chimmy' | 'direct' | 'groups' | 'league'

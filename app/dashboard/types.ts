/** Legacy default; left panel uses responsive width in DashboardShell / LeftChatPanel */
export const DASHBOARD_LEFT_PANEL_WIDTH = 280
export const DASHBOARD_RIGHT_PANEL_WIDTH = 300

export type LeagueListStatus = 'pre_draft' | 'drafting' | 'in_season' | 'complete' | string

export interface UserLeague {
  id: string
  name: string
  /** Source platform — always set by list/detail mappers */
  platform: 'sleeper' | 'yahoo' | 'espn' | 'cbs' | string
  /** Normalized sport — always set by list/detail mappers */
  sport: 'NFL' | 'NBA' | 'MLB' | 'NHL' | string
  format: string
  scoring?: string
  teamCount: number
  season?: number | string
  status?: LeagueListStatus
  /** Sleeper-style current week label when in season */
  currentWeek?: number | null
  isDynasty?: boolean
  settings?: Record<string, unknown>
  sleeperLeagueId?: string
  /** Sleeper avatar id — resolved to sleepercdn.com/avatars/{id} in UI */
  avatarUrl?: string | null
  /** ISO string from league detail / Sleeper draft when available */
  draftDate?: string | null
}

/** Props contract for `LeftChatPanel` (shared with /dashboard and /league/[id]) */
export type LeftChatPanelLayoutProps = {
  selectedLeague: UserLeague | null
  userId: string
  rootId?: string | null
  /** Dashboard home: connected leagues for Chimmy context selector */
  leagues?: UserLeague[]
}

/** Props contract for `RightControlPanel` */
export type RightControlPanelLayoutProps = {
  leagues: UserLeague[]
  leaguesLoading: boolean
  selectedId: string | null
  onSelectLeague: (league: UserLeague | null) => void
  userId: string
  /** Display name (session name / email / Manager) */
  userName: string
  /** Resolved avatar URL (optional); hash-only values resolved server-side */
  userImage?: string | null
  /** e.g. plan tier; when absent, footer shows "AllFantasy" as subtitle */
  userSubtitle?: string | null
  onImport: () => void
  onAfterLeagueNavigate?: () => void
}

export interface DashboardConnectedLeague extends UserLeague {
  sourceLeagueId: string
  syncStatus?: string | null
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

/** League team row for tab UIs (draft, league, trades) */
export type UserLeagueTeam = LeagueTeamSlot

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

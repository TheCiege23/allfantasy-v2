export type LeagueTopTab = 'DRAFT' | 'TEAM' | 'PLAYERS' | 'LEAGUE'

export type LeaguePlayersSubtab = 'search' | 'trend' | 'available' | 'leaders' | 'trade'

export type LeagueVariantMode = 'standard' | 'devy' | 'c2c'

export type LeagueRecord = {
  wins: number
  losses: number
  ties: number
}

export type LeagueHeaderInfo = {
  id: string
  name: string
  sport: string
  season: number | null
  leagueSize: number | null
  avatarUrl: string | null
  leagueVariant: string | null
  leagueType: string | null
  isDynasty: boolean
}

export type LeagueTeamRow = {
  id: string
  externalId: string
  rank: number
  name: string
  handle: string | null
  avatarUrl: string | null
  faab: number | null
  waiverPriority: number | null
  draftPosition: number | null
  record: LeagueRecord
  pointsFor: number
  pointsAgainst: number
  isCurrentUser: boolean
}

export type LeagueScoringRow = {
  id: string
  label: string
  value: string
  numericValue: number
  isPositive: boolean
  isNegative: boolean
  isHighlighted: boolean
}

export type LeagueScoringSection = {
  id: string
  title: string
  rows: LeagueScoringRow[]
}

export type LeagueSettingsItem = {
  id: string
  label: string
  value: string
  badge?: string | null
}

export type ResolvedLeaguePlayer = {
  id: string
  name: string
  position: string
  team: string | null
  headshotUrl: string | null
  teamLogoUrl: string | null
  injuryStatus: string | null
  rosterPercent: number | null
  startPercent: number | null
  score: number | null
  trendValue: number | null
  adp: number | null
  ownerLabel?: string | null
  source?: 'pro' | 'college'
  collegeSport?: string | null
  school?: string | null
  conference?: string | null
  classYearLabel?: string | null
  draftGrade?: string | null
  draftYear?: number | null
  projectedLandingSpot?: string | null
  nextGameLabel?: string | null
  badges?: string[]
  stats: Array<{ label: string; value: string }>
}

export type LeagueRosterSlot = {
  id: string
  slot: string
  slotLabel: string
  pill: string
  player: ResolvedLeaguePlayer
}

export type LeagueRosterSection = {
  id: string
  title: string
  emptyLabel: string
  items: LeagueRosterSlot[]
}

export type LeagueRosterCard = {
  rosterId: string
  sourceTeamId: string | null
  teamId: string | null
  teamName: string
  ownerName: string | null
  avatarUrl: string | null
  record: LeagueRecord
  faabRemaining: number | null
  waiverPriority: number | null
  overRosterLimitBy: number
  sections: LeagueRosterSection[]
  collegeSections?: LeagueRosterSection[]
  draftPicks: string[]
}

export type LeagueActivityLine = {
  type: 'add' | 'drop' | 'note'
  label: string
  playerName?: string | null
  playerMeta?: string | null
  headshotUrl?: string | null
}

export type LeagueActivityItem = {
  id: string
  type: 'waiver' | 'trade' | 'message'
  managerName: string
  badge: string
  badgeTone: 'neutral' | 'teal' | 'green'
  timestamp: string
  amountLabel?: string | null
  summary?: string | null
  lines: LeagueActivityLine[]
}

export type LeagueTradeAsset = {
  id: string
  label: string
  sublabel: string | null
  headshotUrl: string | null
  accent: 'teal' | 'blue' | 'orange' | 'slate'
}

export type LeagueTradeHistoryItem = {
  id: string
  direction: 'incoming' | 'outgoing' | 'complete'
  partnerName: string
  timestamp: string
  sent: LeagueTradeAsset[]
  received: LeagueTradeAsset[]
}

export type LeagueTradeBlockItem = {
  id: string
  name: string
  sublabel: string
  headshotUrl: string | null
  accent: 'teal' | 'blue' | 'orange' | 'slate'
}

export type LeagueTradesData = {
  tradeBlock: LeagueTradeBlockItem[]
  activeTrades: LeagueTradeHistoryItem[]
  history: LeagueTradeHistoryItem[]
}

export type LeagueSearchDefenseItem = {
  id: string
  name: string
  teamCode: string | null
  logoUrl: string | null
  watchLabel: string
}

export type LeaguePlayersData = {
  search: LeagueSearchDefenseItem[]
  trend: ResolvedLeaguePlayer[]
  available: ResolvedLeaguePlayer[]
  leaders: ResolvedLeaguePlayer[]
  college: {
    trend: ResolvedLeaguePlayer[]
    available: ResolvedLeaguePlayer[]
    leaders: ResolvedLeaguePlayer[]
    availablePositions: string[]
    availableSports: string[]
  } | null
}

export type LeagueVariantSummary = {
  mode: LeagueVariantMode
  collegeSports: string[]
  devy: {
    slotCount: number
    irSlots: number
    taxiSlots: number
    scoringEnabled: boolean
  } | null
  c2c: {
    rosterSize: number
    scoringSystem: string
    standingsModel: string
    mixProPlayers: boolean
  } | null
}

export type LeagueDraftSummaryCard = {
  id: string
  title: string
  description: string
  values: Array<{ label: string; value: string }>
}

export type LeagueBracketMatchupTeam = {
  seed: number | null
  name: string
  avatarUrl: string | null
  score: number | null
  isCurrentUser: boolean
}

export type LeagueBracketMatchup = {
  id: string
  label: string
  teamA: LeagueBracketMatchupTeam | null
  teamB: LeagueBracketMatchupTeam | null
}

export type LeagueBracketRound = {
  id: string
  title: string
  subtitle: string
  matchups: LeagueBracketMatchup[]
}

export type LeaguePlayoffBracketData = {
  rounds: LeagueBracketRound[]
}

export type LeagueChatPreview = {
  href: string
  preview: string
  senderName: string | null
}

export type LeagueHomeData = {
  league: LeagueHeaderInfo
  variant: LeagueVariantSummary
  currentUserId: string
  isCommissioner: boolean
  activeTab: LeagueTopTab
  teamsInDraftOrder: LeagueTeamRow[]
  standings: LeagueTeamRow[]
  settingsItems: LeagueSettingsItem[]
  scoringSections: LeagueScoringSection[]
  roster: LeagueRosterCard
  activity: LeagueActivityItem[]
  trades: LeagueTradesData
  players: LeaguePlayersData
  draftSummaryCards: LeagueDraftSummaryCard[]
  bracket: LeaguePlayoffBracketData
  chat: LeagueChatPreview
}

export type TabDef = {
  id: string
  label: string
  icon?: string
}

const NFL_TABS: TabDef[] = [
  { id: 'draft', label: 'Draft' },
  { id: 'team', label: 'Team' },
  { id: 'league', label: 'League' },
  { id: 'players', label: 'Players' },
  { id: 'trend', label: 'Trend' },
  { id: 'trades', label: 'Trades' },
  { id: 'scores', label: 'Scores' },
  { id: 'history', label: 'History' },
]

const BASKETBALL_LIKE_TABS: TabDef[] = [
  { id: 'roster', label: 'Roster' },
  { id: 'team', label: 'My Team' },
  { id: 'league', label: 'League' },
  { id: 'players', label: 'Players' },
  { id: 'standings', label: 'Standings' },
  { id: 'trades', label: 'Trades' },
  { id: 'scores', label: 'Scores' },
  { id: 'history', label: 'History' },
]

const SOCCER_TABS: TabDef[] = [
  { id: 'squad', label: 'Squad' },
  { id: 'team', label: 'My Team' },
  { id: 'league', label: 'League' },
  { id: 'players', label: 'Players' },
  { id: 'fixtures', label: 'Fixtures' },
  { id: 'transfers', label: 'Transfers' },
  { id: 'table', label: 'Table' },
  { id: 'history', label: 'History' },
]

const NCAAF_TABS: TabDef[] = [
  { id: 'roster', label: 'Roster' },
  { id: 'team', label: 'My Team' },
  { id: 'league', label: 'League' },
  { id: 'players', label: 'Players' },
  { id: 'trend', label: 'Trend' },
  { id: 'trades', label: 'Trades' },
  { id: 'scores', label: 'Scores' },
  { id: 'history', label: 'History' },
]

const PGA_TABS: TabDef[] = [
  { id: 'leaderboard', label: 'Leaderboard' },
  { id: 'my-picks', label: 'My Picks' },
  { id: 'league', label: 'League' },
  { id: 'players', label: 'Players' },
  { id: 'schedule', label: 'Schedule' },
  { id: 'history', label: 'History' },
]

/** Primary tab sets by canonical sport key (see Prisma `LeagueSport` + PGA for future). */
const SPORT_TABS: Record<string, TabDef[]> = {
  NFL: NFL_TABS,
  NBA: BASKETBALL_LIKE_TABS,
  MLB: BASKETBALL_LIKE_TABS,
  NHL: BASKETBALL_LIKE_TABS,
  SOCCER: SOCCER_TABS,
  NCAAF: NCAAF_TABS,
  NCAAB: BASKETBALL_LIKE_TABS,
  PGA: PGA_TABS,
}

const TAB_ALIASES: Record<string, string> = {
  NCAAFB: 'NCAAF',
  NCAABB: 'NCAAB',
  EPL: 'SOCCER',
  MLS: 'SOCCER',
}

export function getLeagueTabs(sport: string): TabDef[] {
  const key = sport.trim().toUpperCase()
  const resolved = TAB_ALIASES[key] ?? key
  const tabs = SPORT_TABS[resolved]
  if (tabs?.length) return tabs
  return SPORT_TABS.NFL ?? NFL_TABS
}

export function leagueTabSportEmoji(sport: string): string {
  const map: Record<string, string> = {
    NFL: '🏈',
    NBA: '🏀',
    MLB: '⚾',
    NHL: '🏒',
    SOCCER: '⚽',
    EPL: '⚽',
    MLS: '⚽',
    NCAAF: '🏈',
    NCAAFB: '🏈',
    NCAAB: '🏀',
    NCAABB: '🏀',
    PGA: '⛳',
  }
  return map[sport.toUpperCase()] ?? '🏆'
}

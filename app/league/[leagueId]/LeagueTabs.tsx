export type TabDef = {
  id: string
  label: string
  icon?: string
}

/** NFL redraft simplified shell — settings use header gear only, not a tab. */
export const NFL_REDRAFT_CORE_TAB_IDS = [
  'home',
  'roster',
  'matchups',
  'players',
  'trades',
  'league',
] as const

export type NflRedraftCoreTabId = (typeof NFL_REDRAFT_CORE_TAB_IDS)[number]

/** Sleeper-style primary strip: Draft → Team (roster) → League → Players → Trend → Trades → Scores; extras after. */
const NFL_TABS: TabDef[] = [
  { id: 'draft', label: 'Draft' },
  { id: 'team', label: 'Team' },
  { id: 'league', label: 'League' },
  { id: 'players', label: 'Players' },
  { id: 'waivers', label: 'Waivers' },
  { id: 'trend', label: 'Trend' },
  { id: 'trades', label: 'Trades' },
  { id: 'scores', label: 'Scores' },
  { id: 'finance', label: 'Finance' },
  { id: 'war_room', label: 'War Room' },
  { id: 'ai_coaching', label: 'AI Coaching' },
  { id: 'redraft', label: 'Redraft' },
  { id: 'history', label: 'History' },
]

const BASKETBALL_LIKE_TABS: TabDef[] = [
  { id: 'roster', label: 'Roster' },
  { id: 'redraft', label: 'Redraft' },
  { id: 'team', label: 'My Team' },
  { id: 'league', label: 'League' },
  { id: 'players', label: 'Players' },
  { id: 'waivers', label: 'Waivers' },
  { id: 'standings', label: 'Standings' },
  { id: 'trades', label: 'Trades' },
  { id: 'scores', label: 'Scores' },
  { id: 'finance', label: 'Finance' },
  { id: 'war_room', label: 'War Room' },
  { id: 'ai_coaching', label: 'AI Coaching' },
  { id: 'history', label: 'History' },
]

const SOCCER_TABS: TabDef[] = [
  { id: 'squad', label: 'Squad' },
  { id: 'redraft', label: 'Redraft' },
  { id: 'team', label: 'My Team' },
  { id: 'league', label: 'League' },
  { id: 'players', label: 'Players' },
  { id: 'waivers', label: 'Waivers' },
  { id: 'fixtures', label: 'Fixtures' },
  { id: 'transfers', label: 'Transfers' },
  { id: 'table', label: 'Table' },
  { id: 'finance', label: 'Finance' },
  { id: 'war_room', label: 'War Room' },
  { id: 'ai_coaching', label: 'AI Coaching' },
  { id: 'history', label: 'History' },
]

const NCAAF_TABS: TabDef[] = [
  { id: 'roster', label: 'Roster' },
  { id: 'redraft', label: 'Redraft' },
  { id: 'team', label: 'My Team' },
  { id: 'league', label: 'League' },
  { id: 'players', label: 'Players' },
  { id: 'waivers', label: 'Waivers' },
  { id: 'trend', label: 'Trend' },
  { id: 'trades', label: 'Trades' },
  { id: 'scores', label: 'Scores' },
  { id: 'finance', label: 'Finance' },
  { id: 'war_room', label: 'War Room' },
  { id: 'ai_coaching', label: 'AI Coaching' },
  { id: 'history', label: 'History' },
]

const PGA_TABS: TabDef[] = [
  { id: 'leaderboard', label: 'Leaderboard' },
  { id: 'redraft', label: 'Redraft' },
  { id: 'my-picks', label: 'My Picks' },
  { id: 'league', label: 'League' },
  { id: 'players', label: 'Players' },
  { id: 'waivers', label: 'Waivers' },
  { id: 'schedule', label: 'Schedule' },
  { id: 'finance', label: 'Finance' },
  { id: 'war_room', label: 'War Room' },
  { id: 'ai_coaching', label: 'AI Coaching' },
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

/** Maps tab id → i18n key under translations.en (`league.tab.*`). */
const LEAGUE_TAB_I18N_KEY: Record<string, string> = {
  home: 'league.tab.home',
  matchup: 'league.tab.matchup',
  matchups: 'league.tab.matchups',
  draft: 'league.tab.draft',
  redraft: 'league.tab.redraft',
  team: 'league.tab.team',
  roster: 'league.tab.roster',
  league: 'league.tab.league',
  players: 'league.tab.players',
  waivers: 'league.tab.waivers',
  trend: 'league.tab.trend',
  trades: 'league.tab.trades',
  scores: 'league.tab.scores',
  finance: 'league.tab.finance',
  war_room: 'league.tab.warRoom',
  ai_coaching: 'league.tab.aiCoaching',
  history: 'league.tab.history',
  standings: 'league.tab.standings',
  squad: 'league.tab.squad',
  fixtures: 'league.tab.fixtures',
  transfers: 'league.tab.transfers',
  table: 'league.tab.table',
  leaderboard: 'league.tab.leaderboard',
  'my-picks': 'league.tab.myPicks',
  schedule: 'league.tab.schedule',
  bestball: 'league.tab.bestball',
  guillotine: 'league.tab.guillotine',
  survivor: 'league.tab.survivor',
  survivor_tribal: 'league.tab.survivorTribal',
  survivor_challenges: 'league.tab.survivorChallenges',
  survivor_chimmy: 'league.tab.survivorChimmy',
  survivor_exile: 'league.tab.survivorExile',
  survivor_jury: 'league.tab.survivorJury',
  survivor_command: 'league.tab.survivorCommand',
  zombie: 'league.tab.zombie',
  big_brother: 'league.tab.bigBrother',
  bb_hoh: 'league.tab.bbHoh',
  bb_veto: 'league.tab.bbVeto',
  bb_voting: 'league.tab.bbVoting',
  bb_jury: 'league.tab.bbJury',
  bb_twists: 'league.tab.bbTwists',
  bb_history: 'league.tab.bbHistory',
  bb_command: 'league.tab.bbCommand',
  idp: 'league.tab.idp',
  keeper: 'league.tab.keepers',
  settings: 'league.tab.settings',
}

/**
 * Apply `t()` to tab labels so the league hub matches the selected language (es filled via API + Google).
 */
export function localizeLeagueTabs(tabs: TabDef[], t: (key: string) => string): TabDef[] {
  return tabs.map((tab) => {
    const key = LEAGUE_TAB_I18N_KEY[tab.id] ?? `league.tab.${tab.id}`
    const next = t(key)
    return { ...tab, label: next !== key ? next : tab.label }
  })
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

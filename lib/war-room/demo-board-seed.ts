import type { DraftFormatKind, LiveDraftBrainContext, LiveDraftBrainInput, LiveDraftBrainPoolPlayer } from '@/lib/live-draft-brain'
import type { SupportedSport } from '@/lib/sport-scope'
import { resolveBrainMode } from './strategy-mode-map'

/**
 * Thin demo pool so War Room can render before live draft wiring passes a full board.
 * Disable in production UI via `useDemoBoard={false}`.
 */
export function buildDemoLiveBrainInput(args: {
  sport: SupportedSport
  leagueId: string
  strategyMode: string
  totalTeams?: number
  round?: number
  pick?: number
  overallPick?: number
}): LiveDraftBrainInput {
  const sport = args.sport
  const totalTeams = args.totalTeams ?? 12
  const round = args.round ?? 3
  const pick = args.pick ?? 3
  const overall = args.overallPick ?? (round - 1) * totalTeams + pick

  const pool: LiveDraftBrainPoolPlayer[] =
    sport === 'NFL'
      ? [
          { name: "Ja'Marr Chase", position: 'WR', team: 'CIN', adp: 6, byeWeek: 10 },
          { name: 'Bijan Robinson', position: 'RB', team: 'ATL', adp: 5, byeWeek: 9 },
          { name: 'Josh Allen', position: 'QB', team: 'BUF', adp: 22, byeWeek: 7 },
          { name: 'Sam LaPorta', position: 'TE', team: 'DET', adp: 28, byeWeek: 8 },
          { name: 'Garrett Wilson', position: 'WR', team: 'NYJ', adp: 18, byeWeek: 9 },
          { name: "De'Von Achane", position: 'RB', team: 'MIA', adp: 14, byeWeek: 6 },
        ]
      : sport === 'NBA'
        ? [
            { name: 'Shai Gilgeous-Alexander', position: 'PG', team: 'OKC', adp: 3 },
            { name: 'Luka Dončić', position: 'PG', team: 'DAL', adp: 2 },
            { name: 'Nikola Jokić', position: 'C', team: 'DEN', adp: 1 },
            { name: 'Anthony Edwards', position: 'SG', team: 'MIN', adp: 8 },
            { name: 'Victor Wembanyama', position: 'C', team: 'SAS', adp: 5 },
          ]
        : [
            { name: 'Demo Player A', position: 'F', team: 'TM1', adp: 10 },
            { name: 'Demo Player B', position: 'D', team: 'TM2', adp: 12 },
            { name: 'Demo Player C', position: 'G', team: 'TM3', adp: 15 },
          ]

  const context: LiveDraftBrainContext = {
    sport: sport as LiveDraftBrainContext['sport'],
    draftFormat: 'SNAKE' as DraftFormatKind,
    leagueType: 'redraft',
    isSuperflex: false,
    isTePremium: false,
    isIdp: false,
    rosterSize: 16,
    startupVsRookie: 'na',
    round,
    pick,
    totalTeams,
    overallPick: overall,
  }

  return {
    context,
    mode: resolveBrainMode(args.strategyMode),
    available: pool,
    myTeam: {
      teamRoster: [
        { position: 'RB', playerName: 'Starter RB', team: 'DAL' },
        { position: 'WR', playerName: 'Starter WR', team: 'DAL' },
      ],
      rosterSlots: ['QB', 'RB', 'RB', 'WR', 'WR', 'TE', 'FLEX', 'BN', 'BN', 'BN', 'BN', 'BN'],
    },
    upcomingTeamOrder: ['t2', 't3', 't4'],
    managerHintsByTeamId: {
      t2: { managerId: 't2', displayName: 'Team 2' },
      t3: { managerId: 't3', displayName: 'Team 3' },
      t4: { managerId: 't4', displayName: 'Team 4' },
    },
  }
}

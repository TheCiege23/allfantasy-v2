/**
 * Sport-specific configuration for zombie league rules documents, scheduling,
 * thresholds, weapon/serum logic, and automation tuning. Covers all 7 supported sports.
 */

export type WeaponThresholdConfig = {
  type: string
  label: string
  minPoints: number
  description: string
}

export type SerumAwardConfig = {
  trigger: string
  label: string
  description: string
}

export type ZombieSportConfig = {
  sport: string
  label: string
  positions: string[]
  rosterSize: number
  starterCount: number
  benchCount: number
  irSlots: number
  lineupFrequency: 'weekly' | 'daily'
  scoringWindow: string
  lockRule: string
  bashingThreshold: number
  maulingThreshold: number
  weaponThresholds: WeaponThresholdConfig[]
  serumAwards: SerumAwardConfig[]
  serumAwardSummary: string
  infectionTiming: string
  weeklySchedule: string
  challengeFrequency: string
  edgeCases: string[]
  seasonLength: number
  defaultTeamCount: number
  resolutionDay: string
  ambushDeadline: string
  scoringType: 'weekly' | 'period'
}

export const ZOMBIE_SPORT_CONFIGS: Record<string, ZombieSportConfig> = {
  nfl: {
    sport: 'nfl',
    label: 'NFL',
    positions: ['QB', 'RB', 'RB', 'WR', 'WR', 'TE', 'FLEX', 'K', 'DEF'],
    rosterSize: 15,
    starterCount: 9,
    benchCount: 6,
    irSlots: 2,
    lineupFrequency: 'weekly',
    scoringWindow: 'Thursday through Monday (NFL schedule)',
    lockRule: 'Individual game kickoff locks each player',
    bashingThreshold: 30,
    maulingThreshold: 50,
    weaponThresholds: [
      { type: 'weapon_knife', label: 'Knife', minPoints: 120, description: 'Score 120+ pts in a week' },
      { type: 'weapon_axe', label: 'Axe', minPoints: 140, description: 'Score 140+ pts in a week' },
      { type: 'weapon_bow', label: 'Bow', minPoints: 100, description: 'Top 2 scorer among survivors' },
      { type: 'weapon_gun', label: 'Gun', minPoints: 160, description: 'Score 160+ pts in a week' },
      { type: 'weapon_bomb', label: 'Bomb', minPoints: 180, description: 'Season-high score (one-time)' },
    ],
    serumAwards: [
      { trigger: 'season_high', label: 'Season High', description: 'Set the league season-high score' },
      { trigger: 'bashing_survived', label: 'Bashing Survived', description: 'Survive a bashing as a Survivor' },
      { trigger: 'weekly_top', label: 'Weekly Top', description: 'Highest-scoring Survivor of the week' },
    ],
    serumAwardSummary: 'Awarded for season-high score, surviving a bashing, or being top Survivor scorer',
    infectionTiming: 'Status changes finalize Tuesday morning after MNF stat corrections',
    weeklySchedule: 'Week resolves Tuesday. Whisperer ambush deadline: Wednesday 11:59pm ET',
    challengeFrequency: '1 mini-game per week',
    edgeCases: [
      'Monday Night Football finishes: stat corrections may reverse infections within 48h window',
      'Thursday Night games: early lock considerations for ambush timing',
      'Bye weeks reduce active starters — bench management critical for Survivors',
      'Fantasy playoffs (Weeks 15-17): increased infection stakes',
    ],
    seasonLength: 17,
    defaultTeamCount: 12,
    resolutionDay: 'Tuesday',
    ambushDeadline: 'Wednesday 11:59pm ET',
    scoringType: 'weekly',
  },
  nba: {
    sport: 'nba',
    label: 'NBA',
    positions: ['PG', 'SG', 'SF', 'PF', 'C', 'UTIL', 'UTIL', 'UTIL'],
    rosterSize: 13,
    starterCount: 8,
    benchCount: 5,
    irSlots: 2,
    lineupFrequency: 'daily',
    scoringWindow: 'Daily slates; weekly aggregate determines matchup winner',
    lockRule: 'Tip-off locks per player per day',
    bashingThreshold: 45,
    maulingThreshold: 70,
    weaponThresholds: [
      { type: 'weapon_knife', label: 'Knife', minPoints: 350, description: 'Score 350+ weekly aggregate' },
      { type: 'weapon_axe', label: 'Axe', minPoints: 420, description: 'Score 420+ weekly aggregate' },
      { type: 'weapon_bow', label: 'Bow', minPoints: 300, description: 'Top 2 scorer among survivors' },
      { type: 'weapon_gun', label: 'Gun', minPoints: 480, description: 'Score 480+ weekly aggregate' },
      { type: 'weapon_bomb', label: 'Bomb', minPoints: 550, description: 'Season-high weekly score (one-time)' },
    ],
    serumAwards: [
      { trigger: 'weekly_top', label: 'Weekly Top', description: 'Top scorer among survivors each week' },
      { trigger: 'daily_triple', label: 'Daily Triple', description: 'Win 3+ daily slates in a week' },
      { trigger: 'bashing_survived', label: 'Bashing Survived', description: 'Survive a bashing as a Survivor' },
    ],
    serumAwardSummary: 'Awarded for weekly top scorer, winning 3+ daily slates, or surviving a bashing',
    infectionTiming: 'Status changes finalize Monday morning after Sunday games complete',
    weeklySchedule: 'Week resolves Monday. Whisperer ambush window: Mon-Tue',
    challengeFrequency: '2-3 mini-games per week',
    edgeCases: [
      'Back-to-backs and rest days affect availability — use bench strategically',
      'All-Star break: reduced slate may affect weekly scoring averages',
      'Trade deadline: player movement can disrupt roster composition',
      'Daily lineup management is critical — missed starts cost points',
    ],
    seasonLength: 23,
    defaultTeamCount: 14,
    resolutionDay: 'Monday',
    ambushDeadline: 'Tuesday 11:59pm ET',
    scoringType: 'period',
  },
  mlb: {
    sport: 'mlb',
    label: 'MLB',
    positions: ['C', '1B', '2B', '3B', 'SS', 'OF', 'OF', 'OF', 'UTIL', 'SP', 'SP', 'RP', 'RP'],
    rosterSize: 20,
    starterCount: 13,
    benchCount: 7,
    irSlots: 3,
    lineupFrequency: 'daily',
    scoringWindow: 'Daily games; weekly aggregate determines matchup winner',
    lockRule: 'First pitch locks per player per day',
    bashingThreshold: 40,
    maulingThreshold: 65,
    weaponThresholds: [
      { type: 'weapon_knife', label: 'Knife', minPoints: 280, description: 'Score 280+ weekly aggregate' },
      { type: 'weapon_axe', label: 'Axe', minPoints: 350, description: 'Score 350+ weekly aggregate' },
      { type: 'weapon_bow', label: 'Bow', minPoints: 240, description: 'Top 2 scorer among survivors' },
      { type: 'weapon_gun', label: 'Gun', minPoints: 400, description: 'Score 400+ weekly aggregate' },
      { type: 'weapon_bomb', label: 'Bomb', minPoints: 450, description: 'Season-high weekly score (one-time)' },
    ],
    serumAwards: [
      { trigger: 'weekly_top', label: 'Weekly Top', description: 'Highest aggregate weekly score among survivors' },
      { trigger: 'perfect_start', label: 'Perfect Start', description: 'All starters play with no empty slots for 5+ days' },
      { trigger: 'pitcher_dominant', label: 'Pitcher Dominant', description: 'Starting pitchers combine for 30+ fantasy points in a week' },
    ],
    serumAwardSummary: 'Awarded for highest weekly aggregate, perfect daily starts, or dominant pitching performances',
    infectionTiming: 'Status changes finalize Monday morning after Sunday night games',
    weeklySchedule: 'Week resolves Monday. Whisperer ambush window: Mon-Tue',
    challengeFrequency: '2-3 mini-games per week',
    edgeCases: [
      'Doubleheaders count both games — potential scoring spikes',
      'Rainouts reschedule; PPD players unlock for re-slot',
      'Daily pitcher streaming is key — SP usage limits may apply',
      'All-Star break creates a scoring gap week',
    ],
    seasonLength: 23,
    defaultTeamCount: 12,
    resolutionDay: 'Monday',
    ambushDeadline: 'Tuesday 11:59pm ET',
    scoringType: 'period',
  },
  nhl: {
    sport: 'nhl',
    label: 'NHL',
    positions: ['C', 'C', 'LW', 'RW', 'D', 'D', 'UTIL', 'G', 'G'],
    rosterSize: 14,
    starterCount: 9,
    benchCount: 5,
    irSlots: 2,
    lineupFrequency: 'daily',
    scoringWindow: 'Daily games; weekly aggregate determines matchup winner',
    lockRule: 'Puck drop locks per player per day',
    bashingThreshold: 8,
    maulingThreshold: 14,
    weaponThresholds: [
      { type: 'weapon_knife', label: 'Knife', minPoints: 45, description: 'Score 45+ weekly aggregate' },
      { type: 'weapon_axe', label: 'Axe', minPoints: 55, description: 'Score 55+ weekly aggregate' },
      { type: 'weapon_bow', label: 'Bow', minPoints: 38, description: 'Top 2 scorer among survivors' },
      { type: 'weapon_gun', label: 'Gun', minPoints: 65, description: 'Score 65+ weekly aggregate' },
      { type: 'weapon_bomb', label: 'Bomb', minPoints: 75, description: 'Season-high weekly score (one-time)' },
    ],
    serumAwards: [
      { trigger: 'weekly_top', label: 'Weekly Top', description: 'Top-scoring survivor each week' },
      { trigger: 'goalie_shutout', label: 'Goalie Shutout', description: 'Your goalie records a shutout' },
      { trigger: 'bashing_survived', label: 'Bashing Survived', description: 'Survive a bashing as a Survivor' },
    ],
    serumAwardSummary: 'Awarded for weekly top scorer, goalie shutout, or surviving a bashing',
    infectionTiming: 'Status changes finalize Monday morning after Sunday games',
    weeklySchedule: 'Week resolves Monday. Whisperer ambush window: Mon-Tue',
    challengeFrequency: '2-3 mini-games per week',
    edgeCases: [
      'Goalie starts are critical — goalie decisions drive scoring variance',
      'Overtime and shootout goals count toward fantasy scoring',
      'Condensed schedule periods increase daily slate sizes',
      'Trade deadline can significantly shift roster value',
    ],
    seasonLength: 23,
    defaultTeamCount: 12,
    resolutionDay: 'Monday',
    ambushDeadline: 'Tuesday 11:59pm ET',
    scoringType: 'period',
  },
  ncaaf: {
    sport: 'ncaaf',
    label: 'College Football',
    positions: ['QB', 'RB', 'RB', 'WR', 'WR', 'TE', 'FLEX', 'K', 'DEF'],
    rosterSize: 15,
    starterCount: 9,
    benchCount: 6,
    irSlots: 2,
    lineupFrequency: 'weekly',
    scoringWindow: 'Saturday games (plus occasional weeknight games)',
    lockRule: 'Individual game kickoff locks each player',
    bashingThreshold: 35,
    maulingThreshold: 55,
    weaponThresholds: [
      { type: 'weapon_knife', label: 'Knife', minPoints: 130, description: 'Score 130+ pts in a week' },
      { type: 'weapon_axe', label: 'Axe', minPoints: 155, description: 'Score 155+ pts in a week' },
      { type: 'weapon_bow', label: 'Bow', minPoints: 110, description: 'Top 2 scorer among survivors' },
      { type: 'weapon_gun', label: 'Gun', minPoints: 175, description: 'Score 175+ pts in a week' },
      { type: 'weapon_bomb', label: 'Bomb', minPoints: 200, description: 'Season-high score (one-time)' },
    ],
    serumAwards: [
      { trigger: 'season_high', label: 'Season High', description: 'Set the league season-high score' },
      { trigger: 'bashing_survived', label: 'Bashing Survived', description: 'Survive a bashing as a Survivor' },
      { trigger: 'weekly_top', label: 'Weekly Top', description: 'Highest-scoring Survivor of the week' },
    ],
    serumAwardSummary: 'Awarded for season-high score, surviving a bashing, or being top Survivor scorer',
    infectionTiming: 'Status changes finalize Sunday morning after Saturday night games',
    weeklySchedule: 'Week resolves Sunday. Whisperer ambush deadline: Monday 11:59pm ET',
    challengeFrequency: '1 mini-game per week',
    edgeCases: [
      'Bye weeks are less uniform than NFL — check schedule carefully',
      'Conference championship weeks may create scheduling gaps',
      'Bowl games can extend the season beyond the regular fantasy playoffs',
      'Transfer portal activity between seasons can shift roster values dramatically',
    ],
    seasonLength: 14,
    defaultTeamCount: 12,
    resolutionDay: 'Sunday',
    ambushDeadline: 'Monday 11:59pm ET',
    scoringType: 'weekly',
  },
  ncaab: {
    sport: 'ncaab',
    label: 'College Basketball',
    positions: ['PG', 'SG', 'SF', 'PF', 'C', 'UTIL', 'UTIL'],
    rosterSize: 12,
    starterCount: 7,
    benchCount: 5,
    irSlots: 2,
    lineupFrequency: 'daily',
    scoringWindow: 'Daily games; weekly aggregate determines matchup winner',
    lockRule: 'Tip-off locks per player per day',
    bashingThreshold: 40,
    maulingThreshold: 65,
    weaponThresholds: [
      { type: 'weapon_knife', label: 'Knife', minPoints: 280, description: 'Score 280+ weekly aggregate' },
      { type: 'weapon_axe', label: 'Axe', minPoints: 340, description: 'Score 340+ weekly aggregate' },
      { type: 'weapon_bow', label: 'Bow', minPoints: 240, description: 'Top 2 scorer among survivors' },
      { type: 'weapon_gun', label: 'Gun', minPoints: 400, description: 'Score 400+ weekly aggregate' },
      { type: 'weapon_bomb', label: 'Bomb', minPoints: 450, description: 'Season-high weekly score (one-time)' },
    ],
    serumAwards: [
      { trigger: 'weekly_top', label: 'Weekly Top', description: 'Top scorer among survivors each week' },
      { trigger: 'bashing_survived', label: 'Bashing Survived', description: 'Survive a bashing as a Survivor' },
      { trigger: 'tournament_hero', label: 'Tournament Hero', description: 'Highest scorer during March Madness weeks' },
    ],
    serumAwardSummary: 'Awarded for weekly top scorer, surviving a bashing, or March Madness heroics',
    infectionTiming: 'Status changes finalize Monday morning after Sunday games',
    weeklySchedule: 'Week resolves Monday. Whisperer ambush window: Mon-Tue',
    challengeFrequency: '2-3 mini-games per week',
    edgeCases: [
      'March Madness disrupts schedules — conference tournaments create scoring spikes',
      'Smaller rosters mean each start slot is high-value',
      'Mid-major players can be high-ceiling sleepers',
      'Season ends abruptly for eliminated tournament teams',
    ],
    seasonLength: 18,
    defaultTeamCount: 10,
    resolutionDay: 'Monday',
    ambushDeadline: 'Tuesday 11:59pm ET',
    scoringType: 'period',
  },
  soccer: {
    sport: 'soccer',
    label: 'Soccer',
    positions: ['GK', 'DEF', 'DEF', 'DEF', 'DEF', 'MID', 'MID', 'MID', 'FWD', 'FWD', 'FWD'],
    rosterSize: 18,
    starterCount: 11,
    benchCount: 7,
    irSlots: 2,
    lineupFrequency: 'weekly',
    scoringWindow: 'Matchweek games (Sat-Mon for most leagues)',
    lockRule: 'Match kickoff locks per player',
    bashingThreshold: 25,
    maulingThreshold: 40,
    weaponThresholds: [
      { type: 'weapon_knife', label: 'Knife', minPoints: 70, description: 'Score 70+ pts in a matchweek' },
      { type: 'weapon_axe', label: 'Axe', minPoints: 85, description: 'Score 85+ pts in a matchweek' },
      { type: 'weapon_bow', label: 'Bow', minPoints: 60, description: 'Top 2 scorer among survivors' },
      { type: 'weapon_gun', label: 'Gun', minPoints: 100, description: 'Score 100+ pts in a matchweek' },
      { type: 'weapon_bomb', label: 'Bomb', minPoints: 120, description: 'Season-high matchweek score (one-time)' },
    ],
    serumAwards: [
      { trigger: 'clean_sheet', label: 'Clean Sheet', description: 'Your GK + DEF combine for a clean sheet' },
      { trigger: 'weekly_top', label: 'Weekly Top', description: 'Highest weekly score among survivors' },
      { trigger: 'bashing_survived', label: 'Bashing Survived', description: 'Survive a bashing as a Survivor' },
    ],
    serumAwardSummary: 'Awarded for clean sheet performance, highest weekly score, or surviving a bashing',
    infectionTiming: 'Status changes finalize Tuesday morning after Monday night matches',
    weeklySchedule: 'Week resolves Tuesday. Whisperer ambush deadline: Wednesday 11:59pm ET',
    challengeFrequency: '1 mini-game per week',
    edgeCases: [
      'Midweek cup fixtures may or may not count depending on commissioner settings',
      'International breaks create 2-week gaps — scoring pauses may be needed',
      'Double gameweeks: some teams play twice — massive scoring potential',
      'Blank gameweeks: some teams don\'t play — bench depth critical',
    ],
    seasonLength: 38,
    defaultTeamCount: 12,
    resolutionDay: 'Tuesday',
    ambushDeadline: 'Wednesday 11:59pm ET',
    scoringType: 'weekly',
  },
}

export function getZombieSportConfig(sport: string): ZombieSportConfig {
  const key = sport.toLowerCase().replace(/[^a-z]/g, '')
  return ZOMBIE_SPORT_CONFIGS[key] ?? ZOMBIE_SPORT_CONFIGS.nfl
}

export function getSportLabel(sport: string): string {
  return getZombieSportConfig(sport).label
}

export function getAllSportKeys(): string[] {
  return Object.keys(ZOMBIE_SPORT_CONFIGS)
}

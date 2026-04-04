import type { SportConfigFull } from '../types'

export const NCAAB_CONFIG: SportConfigFull = {
  sport: 'NCAAB',
  displayName: 'NCAA Basketball',
  slug: 'ncaab',
  defaultScoringSystem: 'points',
  lineupFrequency: 'daily',
  hasBye: false,

  scoringCategories: [
    { key: 'pts', label: 'Points', defaultPoints: 1, isToggleable: false, group: 'offense', sport: 'NCAAB' },
    { key: 'reb', label: 'Rebounds', defaultPoints: 1.2, isToggleable: false, group: 'boards', sport: 'NCAAB' },
    { key: 'ast', label: 'Assists', defaultPoints: 1.5, isToggleable: false, group: 'playmaking', sport: 'NCAAB' },
    { key: 'stl', label: 'Steals', defaultPoints: 3, isToggleable: true, group: 'defense', sport: 'NCAAB' },
    { key: 'blk', label: 'Blocks', defaultPoints: 3, isToggleable: true, group: 'defense', sport: 'NCAAB' },
    { key: 'to', label: 'Turnovers', defaultPoints: -1, isToggleable: true, group: 'negative', sport: 'NCAAB' },
    { key: 'threes', label: '3-Pointers Made', defaultPoints: 0.5, isToggleable: true, group: 'offense', sport: 'NCAAB' },
  ],

  scoringPresets: [{ name: 'Standard', categories: [] }],

  defaultRosterSlots: [
    { key: 'PG', label: 'Point Guard', eligiblePositions: ['PG'], defaultCount: 1, minCount: 1, maxCount: 2, isOptional: false },
    { key: 'SG', label: 'Shooting Guard', eligiblePositions: ['SG'], defaultCount: 1, minCount: 1, maxCount: 2, isOptional: false },
    { key: 'SF', label: 'Small Forward', eligiblePositions: ['SF'], defaultCount: 1, minCount: 1, maxCount: 2, isOptional: false },
    { key: 'PF', label: 'Power Forward', eligiblePositions: ['PF'], defaultCount: 1, minCount: 1, maxCount: 2, isOptional: false },
    { key: 'C', label: 'Center', eligiblePositions: ['C'], defaultCount: 1, minCount: 1, maxCount: 2, isOptional: false },
    { key: 'UTIL', label: 'Utility', eligiblePositions: ['PG', 'SG', 'SF', 'PF', 'C'], defaultCount: 2, minCount: 0, maxCount: 3, isOptional: true },
  ],

  defaultBenchSlots: 3,
  defaultIRSlots: 0,
  defaultTaxiSlots: 0,
  defaultDevySlots: 0,

  positionEligibility: {
    PG: ['PG', 'UTIL'],
    SG: ['SG', 'UTIL'],
    SF: ['SF', 'UTIL'],
    PF: ['PF', 'UTIL'],
    C: ['C', 'UTIL'],
  },

  defaultSeasonWeeks: 18,
  defaultPlayoffStartWeek: 16,
  defaultPlayoffTeams: 4,
  defaultMatchupPeriodDays: 7,
  lineupLockType: 'daily',

  supportsRedraft: true,
  supportsDynasty: true,
  supportsKeeper: true,
  supportsDevy: false,
  supportsC2C: true,
  supportsIDP: false,
  supportsSuperflex: false,
  supportsTEPremium: false,
  supportsPPR: false,
  supportsCategories: true,
  supportsDailyLineups: true,

  commissionerSettings: [
    { key: 'marchMadnessMode', label: 'March Madness bracket tie-in', type: 'toggle', defaultValue: false, section: 'schedule' },
    { key: 'seasonWeeks', label: 'Regular Season Weeks', type: 'number', defaultValue: 16, min: 12, max: 22, section: 'schedule', locksAfterStart: true },
  ],

  aiMetadata: {
    scoringStyle: 'points',
    keyPositions: ['PG', 'C'],
    lineupNotes: 'Conference tournaments and March Madness create schedule spikes.',
  },
}

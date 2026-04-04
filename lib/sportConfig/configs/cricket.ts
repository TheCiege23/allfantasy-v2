import type { SportConfigFull } from '../types'

export const CRICKET_CONFIG: SportConfigFull = {
  sport: 'CRICKET',
  displayName: 'Cricket',
  slug: 'cricket',
  defaultScoringSystem: 'points',
  lineupFrequency: 'weekly',
  hasBye: false,

  scoringCategories: [
    { key: 'runs_bat', label: 'Runs (batting)', defaultPoints: 1, isToggleable: false, group: 'batting', sport: 'CRICKET' },
    { key: 'wickets_bowl', label: 'Wickets', defaultPoints: 20, isToggleable: false, group: 'bowling', sport: 'CRICKET' },
    { key: 'maidens', label: 'Maidens', defaultPoints: 4, isToggleable: true, group: 'bowling', sport: 'CRICKET' },
    { key: 'catches', label: 'Catches', defaultPoints: 8, isToggleable: true, group: 'fielding', sport: 'CRICKET' },
    { key: 'run_outs', label: 'Run outs', defaultPoints: 12, isToggleable: true, group: 'fielding', sport: 'CRICKET' },
    { key: 'stumpings', label: 'Stumpings (WK)', defaultPoints: 15, isToggleable: true, group: 'fielding', sport: 'CRICKET' },
  ],

  scoringPresets: [{ name: 'T20 baseline', categories: [] }],

  defaultRosterSlots: [
    { key: 'BAT', label: 'Batter', eligiblePositions: ['BAT'], defaultCount: 4, minCount: 3, maxCount: 6, isOptional: false },
    { key: 'BOWL', label: 'Bowler', eligiblePositions: ['BOWL'], defaultCount: 4, minCount: 3, maxCount: 6, isOptional: false },
    { key: 'AR', label: 'All-rounder', eligiblePositions: ['AR'], defaultCount: 2, minCount: 1, maxCount: 3, isOptional: true },
    { key: 'WK', label: 'Wicket-keeper', eligiblePositions: ['WK'], defaultCount: 1, minCount: 1, maxCount: 2, isOptional: false },
  ],

  defaultBenchSlots: 3,
  defaultIRSlots: 0,
  defaultTaxiSlots: 0,
  defaultDevySlots: 0,

  positionEligibility: {
    BAT: ['BAT', 'AR'],
    BOWL: ['BOWL', 'AR'],
    AR: ['AR'],
    WK: ['WK'],
  },

  defaultSeasonWeeks: 20,
  defaultPlayoffStartWeek: 18,
  defaultPlayoffTeams: 4,
  defaultMatchupPeriodDays: 7,
  lineupLockType: 'per_event',

  supportsRedraft: true,
  supportsDynasty: false,
  supportsKeeper: false,
  supportsDevy: false,
  supportsC2C: false,
  supportsIDP: false,
  supportsSuperflex: false,
  supportsTEPremium: false,
  supportsPPR: false,
  supportsCategories: false,
  supportsDailyLineups: false,

  commissionerSettings: [
    { key: 'format', label: 'Primary format', type: 'select', defaultValue: 'T20', options: [{ value: 'T20', label: 'T20' }, { value: 'ODI', label: 'ODI' }, { value: 'TEST', label: 'Test' }], section: 'scoring' },
  ],

  aiMetadata: {
    scoringStyle: 'match_format_dependent',
    lineupNotes: 'T20 vs Test scoring differs materially — set format expectations in league rules.',
  },
}

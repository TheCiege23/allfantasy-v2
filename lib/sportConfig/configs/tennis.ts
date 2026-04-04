import type { SportConfigFull } from '../types'

export const TENNIS_CONFIG: SportConfigFull = {
  sport: 'TENNIS',
  displayName: 'Tennis',
  slug: 'tennis',
  defaultScoringSystem: 'points',
  lineupFrequency: 'weekly',
  hasBye: false,

  scoringCategories: [
    { key: 'match_win', label: 'Match Win', defaultPoints: 10, isToggleable: false, group: 'match', sport: 'TENNIS' },
    { key: 'set_win', label: 'Set Win', defaultPoints: 3, isToggleable: true, group: 'match', sport: 'TENNIS' },
    { key: 'aces', label: 'Aces', defaultPoints: 0.5, isToggleable: true, group: 'serve', sport: 'TENNIS' },
    { key: 'dfs_saved', label: 'Double faults (negative)', defaultPoints: -1, isToggleable: true, group: 'serve', sport: 'TENNIS' },
    { key: 'breaks', label: 'Service breaks', defaultPoints: 2, isToggleable: true, group: 'return', sport: 'TENNIS' },
  ],

  scoringPresets: [{ name: 'ATP/WTA weekly', categories: [] }],

  defaultRosterSlots: [
    { key: 'ATP', label: 'ATP Player', eligiblePositions: ['ATP'], defaultCount: 3, minCount: 2, maxCount: 5, isOptional: false },
    { key: 'WTA', label: 'WTA Player', eligiblePositions: ['WTA'], defaultCount: 3, minCount: 2, maxCount: 5, isOptional: false },
  ],

  defaultBenchSlots: 2,
  defaultIRSlots: 0,
  defaultTaxiSlots: 0,
  defaultDevySlots: 0,

  positionEligibility: { ATP: ['ATP'], WTA: ['WTA'] },

  defaultSeasonWeeks: 45,
  defaultPlayoffStartWeek: 42,
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
    { key: 'grandSlamMultiplier', label: 'Grand Slam multiplier', type: 'number', defaultValue: 2, min: 1, max: 3, section: 'scoring' },
  ],

  aiMetadata: {
    scoringStyle: 'tournament_rounds',
    lineupNotes: 'Surface and draw path matter — use deterministic bonus rules.',
  },
}

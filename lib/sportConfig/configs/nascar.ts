import type { SportConfigFull } from '../types'

export const NASCAR_CONFIG: SportConfigFull = {
  sport: 'NASCAR',
  displayName: 'NASCAR',
  slug: 'nascar',
  defaultScoringSystem: 'points',
  lineupFrequency: 'weekly',
  hasBye: false,

  scoringCategories: [
    { key: 'finish_pos_pts', label: 'Finish position points', defaultPoints: 1, isToggleable: false, group: 'race', sport: 'NASCAR' },
    { key: 'stage_pts', label: 'Stage points', defaultPoints: 1, isToggleable: true, group: 'race', sport: 'NASCAR' },
    { key: 'laps_led', label: 'Laps led', defaultPoints: 0.25, isToggleable: true, group: 'race', sport: 'NASCAR', unit: 'per_yard' },
    { key: 'top_10', label: 'Top-10 bonus', defaultPoints: 2, isToggleable: true, group: 'race', sport: 'NASCAR' },
    { key: 'pole', label: 'Pole position', defaultPoints: 3, isToggleable: true, group: 'qualifying', sport: 'NASCAR' },
  ],

  scoringPresets: [{ name: 'Cup Series', categories: [] }],

  defaultRosterSlots: [
    { key: 'DRIVER', label: 'Driver', eligiblePositions: ['DRIVER'], defaultCount: 5, minCount: 3, maxCount: 8, isOptional: false },
  ],

  defaultBenchSlots: 2,
  defaultIRSlots: 0,
  defaultTaxiSlots: 0,
  defaultDevySlots: 0,

  positionEligibility: { DRIVER: ['DRIVER'] },

  defaultSeasonWeeks: 36,
  defaultPlayoffStartWeek: 28,
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

  commissionerSettings: [{ key: 'driverCount', label: 'Active drivers', type: 'number', defaultValue: 5, min: 3, max: 8, section: 'roster' }],

  aiMetadata: {
    scoringStyle: 'race_points',
    lineupNotes: 'Race calendar — playoffs reset formats in real NASCAR.',
  },
}

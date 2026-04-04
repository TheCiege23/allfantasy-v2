import type { SportConfigFull } from '../types'

export const GOLF_CONFIG: SportConfigFull = {
  sport: 'GOLF',
  displayName: 'Golf',
  slug: 'golf',
  defaultScoringSystem: 'points',
  lineupFrequency: 'weekly',
  hasBye: false,

  scoringCategories: [
    { key: 'strokes_vs_par', label: 'Strokes vs Par (cumulative)', defaultPoints: -1, isToggleable: false, group: 'scoring', sport: 'GOLF' },
    { key: 'top_10', label: 'Top-10 Finish', defaultPoints: 4, isToggleable: true, group: 'placement', sport: 'GOLF' },
    { key: 'top_20', label: 'Top-20 Finish', defaultPoints: 2, isToggleable: true, group: 'placement', sport: 'GOLF' },
    { key: 'cut_made', label: 'Cut Made', defaultPoints: 2, isToggleable: true, group: 'placement', sport: 'GOLF' },
    { key: 'eagles', label: 'Eagles', defaultPoints: 5, isToggleable: true, group: 'scoring', sport: 'GOLF' },
    { key: 'birdies', label: 'Birdies', defaultPoints: 1, isToggleable: true, group: 'scoring', sport: 'GOLF' },
  ],

  scoringPresets: [{ name: 'Tournament', categories: [] }],

  defaultRosterSlots: [
    { key: 'GOLFER', label: 'Golfer', eligiblePositions: ['GOLFER'], defaultCount: 6, minCount: 4, maxCount: 8, isOptional: false },
  ],

  defaultBenchSlots: 2,
  defaultIRSlots: 0,
  defaultTaxiSlots: 0,
  defaultDevySlots: 0,

  positionEligibility: { GOLFER: ['GOLFER'] },

  defaultSeasonWeeks: 30,
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

  commissionerSettings: [
    { key: 'rosterSize', label: 'Golfers rostered', type: 'number', defaultValue: 6, min: 4, max: 10, section: 'roster' },
  ],

  aiMetadata: {
    scoringStyle: 'event_points',
    lineupNotes: 'Tournament weeks — not classic weekly NFL-style matchups.',
  },
}

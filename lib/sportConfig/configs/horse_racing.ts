import type { SportConfigFull } from '../types'

export const HORSE_RACING_CONFIG: SportConfigFull = {
  sport: 'HORSE_RACING',
  displayName: 'Horse Racing',
  slug: 'horse-racing',
  defaultScoringSystem: 'points',
  lineupFrequency: 'weekly',
  hasBye: false,

  scoringCategories: [
    { key: 'win', label: 'Win', defaultPoints: 50, isToggleable: false, group: 'finish', sport: 'HORSE_RACING' },
    { key: 'place', label: 'Place', defaultPoints: 25, isToggleable: true, group: 'finish', sport: 'HORSE_RACING' },
    { key: 'show', label: 'Show', defaultPoints: 10, isToggleable: true, group: 'finish', sport: 'HORSE_RACING' },
    { key: 'exacta', label: 'Exacta (bonus)', defaultPoints: 30, isToggleable: true, group: 'exotic', sport: 'HORSE_RACING' },
  ],

  scoringPresets: [{ name: 'Triple Crown lite', categories: [] }],

  defaultRosterSlots: [
    { key: 'HORSE', label: 'Horse', eligiblePositions: ['HORSE'], defaultCount: 6, minCount: 3, maxCount: 10, isOptional: false },
  ],

  defaultBenchSlots: 0,
  defaultIRSlots: 0,
  defaultTaxiSlots: 0,
  defaultDevySlots: 0,

  positionEligibility: { HORSE: ['HORSE'] },

  defaultSeasonWeeks: 40,
  defaultPlayoffStartWeek: 36,
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

  commissionerSettings: [{ key: 'scratchedPolicy', label: 'Scratched horse policy', type: 'select', defaultValue: 'bench', options: [{ value: 'bench', label: 'Move to bench' }, { value: 'zero', label: 'Score zero' }], section: 'scoring' }],

  aiMetadata: {
    scoringStyle: 'race_card',
    lineupNotes: 'Post-time scratches require deterministic commissioner rules.',
  },
}

import type { SportConfigFull } from '../types'

export const WWE_CONFIG: SportConfigFull = {
  sport: 'WWE',
  displayName: 'WWE',
  slug: 'wwe',
  defaultScoringSystem: 'points',
  lineupFrequency: 'weekly',
  hasBye: false,

  scoringCategories: [
    { key: 'win_match', label: 'Match Win', defaultPoints: 5, isToggleable: false, group: 'match', sport: 'WWE' },
    { key: 'title_change', label: 'Title Change (pick)', defaultPoints: 10, isToggleable: true, group: 'story', sport: 'WWE' },
    { key: 'pinfall', label: 'Pinfall / Submission', defaultPoints: 3, isToggleable: true, group: 'match', sport: 'WWE' },
    { key: 'appearance', label: 'TV Appearance', defaultPoints: 1, isToggleable: true, group: 'misc', sport: 'WWE' },
  ],

  scoringPresets: [{ name: 'Standard', categories: [] }],

  defaultRosterSlots: [
    { key: 'SUPERSTAR', label: 'Superstar', eligiblePositions: ['SUPERSTAR'], defaultCount: 5, minCount: 3, maxCount: 8, isOptional: false },
  ],

  defaultBenchSlots: 2,
  defaultIRSlots: 0,
  defaultTaxiSlots: 0,
  defaultDevySlots: 0,

  positionEligibility: { SUPERSTAR: ['SUPERSTAR'] },

  defaultSeasonWeeks: 52,
  defaultPlayoffStartWeek: 48,
  defaultPlayoffTeams: 4,
  defaultMatchupPeriodDays: 7,
  lineupLockType: 'weekly',

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

  commissionerSettings: [{ key: 'ppvWeight', label: 'PPV event weight multiplier', type: 'number', defaultValue: 2, min: 1, max: 4, section: 'scoring' }],

  aiMetadata: {
    scoringStyle: 'storyline_events',
    lineupNotes: 'PPV-heavy calendar; kayfabe results still need deterministic scoring rules.',
  },
}

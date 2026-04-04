import type { SportConfigFull } from '../types'

/** College football — mirrors NFL-style scoring with shorter season. */
export const NCAAF_CONFIG: SportConfigFull = {
  sport: 'NCAAF',
  displayName: 'NCAA Football',
  slug: 'ncaaf',
  defaultScoringSystem: 'points',
  lineupFrequency: 'weekly',
  hasBye: false,

  scoringCategories: [
    { key: 'pass_yds', label: 'Pass Yds', defaultPoints: 0.04, isToggleable: false, group: 'passing', sport: 'NCAAF', unit: 'per_yard' },
    { key: 'pass_td', label: 'Pass TD', defaultPoints: 4, isToggleable: false, group: 'passing', sport: 'NCAAF' },
    { key: 'pass_int', label: 'Interception', defaultPoints: -2, isToggleable: true, group: 'passing', sport: 'NCAAF' },
    { key: 'rush_yds', label: 'Rush Yds', defaultPoints: 0.1, isToggleable: false, group: 'rushing', sport: 'NCAAF', unit: 'per_yard' },
    { key: 'rush_td', label: 'Rush TD', defaultPoints: 6, isToggleable: false, group: 'rushing', sport: 'NCAAF' },
    { key: 'rec', label: 'Reception', defaultPoints: 1, isToggleable: true, group: 'receiving', sport: 'NCAAF' },
    { key: 'rec_yds', label: 'Rec Yds', defaultPoints: 0.1, isToggleable: false, group: 'receiving', sport: 'NCAAF', unit: 'per_yard' },
    { key: 'rec_td', label: 'Rec TD', defaultPoints: 6, isToggleable: false, group: 'receiving', sport: 'NCAAF' },
    { key: 'fum_lost', label: 'Fumble Lost', defaultPoints: -2, isToggleable: true, group: 'special', sport: 'NCAAF' },
  ],

  scoringPresets: [{ name: 'Campus PPR', categories: [] }],

  defaultRosterSlots: [
    { key: 'QB', label: 'Quarterback', eligiblePositions: ['QB'], defaultCount: 1, minCount: 1, maxCount: 2, isOptional: false },
    { key: 'RB', label: 'Running Back', eligiblePositions: ['RB'], defaultCount: 2, minCount: 1, maxCount: 4, isOptional: false },
    { key: 'WR', label: 'Wide Receiver', eligiblePositions: ['WR'], defaultCount: 2, minCount: 1, maxCount: 4, isOptional: false },
    { key: 'TE', label: 'Tight End', eligiblePositions: ['TE'], defaultCount: 1, minCount: 0, maxCount: 2, isOptional: false },
    { key: 'FLEX', label: 'Flex', eligiblePositions: ['RB', 'WR', 'TE'], defaultCount: 1, minCount: 0, maxCount: 2, isOptional: true },
    { key: 'K', label: 'Kicker', eligiblePositions: ['K'], defaultCount: 1, minCount: 0, maxCount: 1, isOptional: true },
  ],

  defaultBenchSlots: 5,
  defaultIRSlots: 0,
  defaultTaxiSlots: 0,
  defaultDevySlots: 0,

  positionEligibility: {
    QB: ['QB'],
    RB: ['RB', 'FLEX'],
    WR: ['WR', 'FLEX'],
    TE: ['TE', 'FLEX'],
    K: ['K'],
  },

  defaultSeasonWeeks: 13,
  defaultPlayoffStartWeek: 12,
  defaultPlayoffTeams: 4,
  defaultMatchupPeriodDays: 7,
  lineupLockType: 'per_player_kickoff',

  supportsRedraft: true,
  supportsDynasty: true,
  supportsKeeper: true,
  supportsDevy: true,
  supportsC2C: true,
  supportsIDP: false,
  supportsSuperflex: false,
  supportsTEPremium: false,
  supportsPPR: true,
  supportsCategories: false,
  supportsDailyLineups: false,

  commissionerSettings: [
    { key: 'seasonWeeks', label: 'Regular Season Weeks', type: 'number', defaultValue: 12, min: 8, max: 14, section: 'schedule', locksAfterStart: true },
    { key: 'benchSlots', label: 'Bench Slots', type: 'number', defaultValue: 5, min: 3, max: 12, section: 'roster' },
  ],

  aiMetadata: {
    scoringStyle: 'points',
    keyPositions: ['QB', 'RB', 'WR'],
    lineupNotes: 'Shorter season than NFL; playoff alignment with conference championships.',
  },
}

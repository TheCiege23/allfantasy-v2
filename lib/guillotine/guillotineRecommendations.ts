/**
 * Guillotine League Recommendations — features beyond the base spec
 * that make the format more engaging, fair, and commissioner-friendly.
 */

/**
 * Recommendations that should be implemented or are implemented.
 * This serves as a living checklist for feature completeness.
 */
export const GUILLOTINE_RECOMMENDATIONS = {
  // ===== ALREADY IMPLEMENTED =====
  implemented: [
    'Chop animation on elimination',
    'Intro video on first league entry',
    'Sport-specific elimination timing',
    'Configurable tiebreakers (bench, cumulative, projected, commissioner)',
    'Protected Week 1 option',
    'Endgame formats (Last Team Standing, Final Four, Final 3, Final 2)',
    'FAAB blind bidding as default waiver system',
    'Roster release to waivers on elimination',
    'Danger tier computation (safe/danger/chop_zone)',
    'Survival standings with margin from chop line',
    'AI survival assistant (subscription)',
    'AI FAAB coach (subscription)',
    'AI elimination risk model (subscription)',
    'AI storyline generator (subscription)',
    'Stat correction handling with configurable window',
    'GuillotineSeason auto-creation on league bootstrap',
    'League chat elimination announcements',
    'Chop day + waiver day per sport',
    'Default team count = sport weeks - 1',
  ],

  // ===== RECOMMENDED ADDITIONS =====
  recommended: [
    {
      feature: 'Danger Zone Alerts',
      description: 'Push notification 2 hours before chop if team is in danger zone',
      priority: 'high',
      status: 'recommended',
    },
    {
      feature: 'FAAB Visibility Toggle',
      description: 'Commissioner can choose: all FAAB balances visible vs hidden until spent',
      priority: 'medium',
      status: 'recommended',
    },
    {
      feature: 'Roster Lock After Chop',
      description: 'Prevent eliminated teams from making moves between chop and waiver processing',
      priority: 'high',
      status: 'implemented_via_guard',
    },
    {
      feature: 'Bye Week Survival Insurance (NFL)',
      description: 'Warn managers when >3 starters share a bye week — high elimination risk',
      priority: 'medium',
      status: 'recommended',
    },
    {
      feature: 'Late Swap Protection',
      description: 'For daily sports (NBA/MLB/NHL), allow late swaps until each game locks individually',
      priority: 'high',
      status: 'recommended',
    },
    {
      feature: 'Uneven Game Count Warning',
      description: 'For NBA/MLB/NHL, warn when your team has fewer games than league average this week',
      priority: 'medium',
      status: 'recommended',
    },
    {
      feature: 'FAAB Remaining Leaderboard',
      description: 'Show who has the most FAAB remaining as a strategic intel card',
      priority: 'low',
      status: 'recommended',
    },
    {
      feature: 'Elimination Probability Pre-Lock',
      description: 'Before the scoring period locks, show projected elimination probability based on lineup projections',
      priority: 'high',
      status: 'ai_gated',
    },
    {
      feature: 'Post-Elimination Draft Order for Next Season',
      description: 'Eliminated teams get priority draft picks next season in order of elimination (first out = first pick)',
      priority: 'low',
      status: 'recommended',
    },
    {
      feature: 'Survival Streak Badges',
      description: 'Track and display how many consecutive weeks each manager has survived',
      priority: 'low',
      status: 'recommended',
    },
    {
      feature: 'Chop Clock Countdown',
      description: 'Real-time countdown timer to chop day visible on the survival board',
      priority: 'medium',
      status: 'recommended',
    },
    {
      feature: 'Multi-Chop Acceleration for Large Leagues',
      description: 'For 20+ team leagues, chop 2 teams per week in early weeks to keep the season tight',
      priority: 'medium',
      status: 'configurable',
    },
    {
      feature: 'Ghost Roster Scoring',
      description: 'After elimination, ghost-score eliminated rosters each week for bragging rights (no impact on standings)',
      priority: 'low',
      status: 'recommended',
    },
    {
      feature: 'Consolation Pick-Em for Eliminated Teams',
      description: 'Eliminated managers can still participate in weekly pick-em for fun, no impact on survival',
      priority: 'low',
      status: 'recommended',
    },
  ],
} as const

/**
 * Get the recommended FAAB budget based on sport and team count.
 * More teams = more eliminated rosters = more valuable players entering waivers = need more FAAB.
 */
export function getRecommendedFaabBudget(teamCount: number): number {
  if (teamCount <= 10) return 100
  if (teamCount <= 15) return 150
  if (teamCount <= 20) return 200
  return 250
}

/**
 * Get the recommended accelerated chop schedule for large leagues.
 * Returns which weeks should chop 2 teams instead of 1.
 */
export function getAcceleratedChopWeeks(teamCount: number, regularSeasonWeeks: number): number[] {
  // If team count > regularSeasonWeeks - 1, we need double-chop weeks
  const surplus = teamCount - (regularSeasonWeeks - 1)
  if (surplus <= 0) return []

  // Double-chop the first N weeks
  const acceleratedWeeks: number[] = []
  for (let i = 1; i <= surplus; i++) {
    acceleratedWeeks.push(i)
  }
  return acceleratedWeeks
}

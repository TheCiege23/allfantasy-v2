/**
 * Mini-Game Registry — Pre-built challenge definitions.
 *
 * Each definition is a reusable template that any league format can use.
 * League-specific engines (Survivor, Big Brother, etc.) select from this registry.
 */

import type { MiniGameDefinition } from './types'

const ALL_SPORTS = ['NFL', 'NBA', 'MLB', 'NHL', 'NCAAF', 'NCAAB', 'SOCCER']
const ALL_LEAGUES = ['survivor', 'big_brother', 'guillotine', 'zombie', 'tournament', 'redraft', 'dynasty', 'keeper', 'best_ball', 'salary_cap', 'custom']

export const MINI_GAME_REGISTRY: MiniGameDefinition[] = [
  // ===== FANTASY PERFORMANCE GAMES =====
  {
    id: 'highest_total_points',
    name: 'Highest Total Points',
    description: 'The participant with the highest total fantasy points wins.',
    category: 'fantasy_performance',
    participantType: 'individual',
    resultType: 'single_winner',
    supportedLeagueTypes: ALL_LEAGUES,
    supportedSports: ALL_SPORTS,
    scoringRules: [{ metric: 'total_points', weight: 1, direction: 'highest', sourceType: 'fantasy_score' }],
    tiebreakers: [
      { order: 1, metric: 'bench_points', direction: 'highest' },
      { order: 2, metric: 'best_starter', direction: 'highest' },
      { order: 3, metric: 'random', direction: 'random' },
    ],
    rewards: ['immunity', 'safe_status'],
    penalties: [],
    requiresManualInput: false,
    allowsRandomModifier: false,
    randomWeight: 0,
    minParticipants: 2,
    maxParticipants: null,
    estimatedDurationMinutes: 0,
    isActive: true,
  },
  {
    id: 'closest_to_projection',
    name: 'Closest to Projection',
    description: 'The participant whose actual score is closest to their projected score wins.',
    category: 'fantasy_performance',
    participantType: 'individual',
    resultType: 'single_winner',
    supportedLeagueTypes: ALL_LEAGUES,
    supportedSports: ALL_SPORTS,
    scoringRules: [{ metric: 'projection_delta', weight: 1, direction: 'closest_to', targetValue: 0, sourceType: 'projection' }],
    tiebreakers: [
      { order: 1, metric: 'total_points', direction: 'highest' },
      { order: 2, metric: 'random', direction: 'random' },
    ],
    rewards: ['immunity'],
    penalties: [],
    requiresManualInput: false,
    allowsRandomModifier: false,
    randomWeight: 0,
    minParticipants: 2,
    maxParticipants: null,
    estimatedDurationMinutes: 0,
    isActive: true,
  },
  {
    id: 'best_single_player',
    name: 'Best Single Player',
    description: 'The participant whose best individual starter scores the most wins.',
    category: 'fantasy_performance',
    participantType: 'individual',
    resultType: 'single_winner',
    supportedLeagueTypes: ALL_LEAGUES,
    supportedSports: ALL_SPORTS,
    scoringRules: [{ metric: 'best_starter', weight: 1, direction: 'highest', sourceType: 'player_stat' }],
    tiebreakers: [
      { order: 1, metric: 'total_points', direction: 'highest' },
      { order: 2, metric: 'second_best_starter', direction: 'highest' },
    ],
    rewards: ['immunity', 'bonus_points'],
    penalties: [],
    requiresManualInput: false,
    allowsRandomModifier: false,
    randomWeight: 0,
    minParticipants: 2,
    maxParticipants: null,
    estimatedDurationMinutes: 0,
    isActive: true,
  },
  {
    id: 'biggest_overperformance',
    name: 'Biggest Overperformance',
    description: 'Score the most above your projection to win.',
    category: 'fantasy_performance',
    participantType: 'individual',
    resultType: 'single_winner',
    supportedLeagueTypes: ALL_LEAGUES,
    supportedSports: ALL_SPORTS,
    scoringRules: [{ metric: 'overperformance', weight: 1, direction: 'highest', sourceType: 'projection' }],
    tiebreakers: [
      { order: 1, metric: 'total_points', direction: 'highest' },
    ],
    rewards: ['immunity', 'temporary_power'],
    penalties: [],
    requiresManualInput: false,
    allowsRandomModifier: false,
    randomWeight: 0,
    minParticipants: 2,
    maxParticipants: null,
    estimatedDurationMinutes: 0,
    isActive: true,
  },

  // ===== MULTI-FACTOR GAMES =====
  {
    id: 'triple_threat',
    name: 'Triple Threat',
    description: '50% total score + 25% best starter + 25% projection accuracy.',
    category: 'multi_factor',
    participantType: 'individual',
    resultType: 'single_winner',
    supportedLeagueTypes: ALL_LEAGUES,
    supportedSports: ALL_SPORTS,
    scoringRules: [
      { metric: 'total_points', weight: 0.5, direction: 'highest', sourceType: 'fantasy_score' },
      { metric: 'best_starter', weight: 0.25, direction: 'highest', sourceType: 'player_stat' },
      { metric: 'projection_accuracy', weight: 0.25, direction: 'closest_to', targetValue: 0, sourceType: 'projection' },
    ],
    tiebreakers: [
      { order: 1, metric: 'total_points', direction: 'highest' },
      { order: 2, metric: 'random', direction: 'random' },
    ],
    rewards: ['hoh_power', 'immunity'],
    penalties: [],
    requiresManualInput: false,
    allowsRandomModifier: true,
    randomWeight: 0.1,
    minParticipants: 3,
    maxParticipants: null,
    estimatedDurationMinutes: 0,
    isActive: true,
  },
  {
    id: 'survival_gauntlet',
    name: 'Survival Gauntlet',
    description: '40% score + 30% bench depth + 20% position balance + 10% random.',
    category: 'multi_factor',
    participantType: 'individual',
    resultType: 'safe_unsafe',
    supportedLeagueTypes: ['survivor', 'big_brother', 'guillotine', 'zombie'],
    supportedSports: ALL_SPORTS,
    scoringRules: [
      { metric: 'total_points', weight: 0.4, direction: 'highest', sourceType: 'fantasy_score' },
      { metric: 'bench_points', weight: 0.3, direction: 'highest', sourceType: 'bench' },
      { metric: 'position_balance', weight: 0.2, direction: 'highest', sourceType: 'position_group' },
      { metric: 'random_bonus', weight: 0.1, direction: 'highest', sourceType: 'random' },
    ],
    tiebreakers: [
      { order: 1, metric: 'total_points', direction: 'highest' },
      { order: 2, metric: 'bench_points', direction: 'highest' },
      { order: 3, metric: 'random', direction: 'random' },
    ],
    rewards: ['safe_status'],
    penalties: ['tribal_council', 'nomination_risk'],
    requiresManualInput: false,
    allowsRandomModifier: true,
    randomWeight: 0.1,
    minParticipants: 3,
    maxParticipants: null,
    estimatedDurationMinutes: 0,
    isActive: true,
  },

  // ===== TRIBE / TEAM GAMES =====
  {
    id: 'tribe_total',
    name: 'Tribe Total',
    description: 'Tribe with the highest combined score wins immunity.',
    category: 'fantasy_performance',
    participantType: 'tribe',
    resultType: 'safe_unsafe',
    supportedLeagueTypes: ['survivor'],
    supportedSports: ALL_SPORTS,
    scoringRules: [{ metric: 'tribe_total_points', weight: 1, direction: 'highest', sourceType: 'fantasy_score' }],
    tiebreakers: [
      { order: 1, metric: 'tribe_avg_points', direction: 'highest' },
      { order: 2, metric: 'tribe_best_player', direction: 'highest' },
    ],
    rewards: ['immunity', 'safe_status'],
    penalties: ['tribal_council'],
    requiresManualInput: false,
    allowsRandomModifier: false,
    randomWeight: 0,
    minParticipants: 2,
    maxParticipants: null,
    estimatedDurationMinutes: 0,
    isActive: true,
  },

  // ===== HEAD-TO-HEAD GAMES =====
  {
    id: 'captain_battle',
    name: 'Captain Battle',
    description: 'Each team picks a captain. Captains face off — highest score wins.',
    category: 'head_to_head',
    participantType: 'individual',
    resultType: 'single_winner',
    supportedLeagueTypes: ALL_LEAGUES,
    supportedSports: ALL_SPORTS,
    scoringRules: [{ metric: 'captain_score', weight: 1, direction: 'highest', sourceType: 'player_stat' }],
    tiebreakers: [
      { order: 1, metric: 'total_points', direction: 'highest' },
    ],
    rewards: ['temporary_power', 'bonus_points'],
    penalties: [],
    requiresManualInput: true,
    allowsRandomModifier: false,
    randomWeight: 0,
    minParticipants: 2,
    maxParticipants: 2,
    estimatedDurationMinutes: 5,
    isActive: true,
  },

  // ===== RANDOMIZED GAMES =====
  {
    id: 'wheel_of_fate',
    name: 'Wheel of Fate',
    description: 'Weighted random selection based on score. Higher score = better odds.',
    category: 'randomized',
    participantType: 'individual',
    resultType: 'single_winner',
    supportedLeagueTypes: ['survivor', 'big_brother', 'zombie'],
    supportedSports: ALL_SPORTS,
    scoringRules: [{ metric: 'total_points', weight: 0.7, direction: 'highest', sourceType: 'fantasy_score' }],
    tiebreakers: [],
    rewards: ['temporary_power'],
    penalties: [],
    requiresManualInput: false,
    allowsRandomModifier: true,
    randomWeight: 0.3,
    minParticipants: 2,
    maxParticipants: null,
    estimatedDurationMinutes: 0,
    isActive: true,
  },
]

/**
 * Get a mini-game definition by ID.
 */
export function getMiniGameDefinition(id: string): MiniGameDefinition | undefined {
  return MINI_GAME_REGISTRY.find((g) => g.id === id)
}

/**
 * Get all mini-games compatible with a league type and sport.
 */
export function getMiniGamesForLeague(leagueType: string, sport: string): MiniGameDefinition[] {
  return MINI_GAME_REGISTRY.filter(
    (g) =>
      g.isActive &&
      g.supportedLeagueTypes.includes(leagueType) &&
      g.supportedSports.includes(sport.toUpperCase()),
  )
}

/**
 * Get mini-games by category.
 */
export function getMiniGamesByCategory(category: string): MiniGameDefinition[] {
  return MINI_GAME_REGISTRY.filter((g) => g.isActive && g.category === category)
}

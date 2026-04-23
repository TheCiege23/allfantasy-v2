/**
 * Draft Strategy Definitions with Adaptive Rules
 * Each strategy maps to an archetype and includes adaptive modifiers that evolve based on draft state.
 */

export type StrategicTendencies = {
  heroRbWeight?: number
  zeroRbWeight?: number
  qbEarlyWeight?: number
  tePremiumWeight?: number
  rookieAppetite?: number
  devyWeight?: number
  chaosReach?: number
  floorVsUpside?: number
  [key: string]: number | undefined
}

export interface AdaptationContext {
  round: number
  pickInRound: number
  rosterCounts: Record<string, number>
  elitePositionsRemaining: Record<string, number>
  leaguePositionStatus?: Record<string, number>
}

export interface DraftStrategy {
  id: string
  name: string
  description: string
  archetypeId: string
  riskLevel: 'conservative' | 'moderate' | 'aggressive'
  primaryFocus: string[]
  baseTendencies: StrategicTendencies
  adaptiveRules: Array<{
    triggerRound: number
    condition?: (ctx: AdaptationContext) => boolean
    adaptation: (ctx: AdaptationContext) => Partial<StrategicTendencies>
  }>
}

export const DRAFT_STRATEGIES: Record<string, DraftStrategy> = {
  conservative_value_grabber: {
    id: 'conservative_value_grabber',
    name: 'Conservative Value Grabber',
    description: 'Prioritizes proven players at highest ADP ranks with emphasis on floor over ceiling',
    archetypeId: 'risk_averse_floor',
    riskLevel: 'conservative',
    primaryFocus: ['BPA', 'Proven Veterans', 'Floor'],
    baseTendencies: {
      floorVsUpside: 70,
      rookieAppetite: 10,
      chaosReach: 5,
    },
    adaptiveRules: [
      {
        triggerRound: 4,
        condition: (ctx) => {
          // If preferred positions dried up, become slightly more aggressive
          const missingPreferred = Object.entries(ctx.elitePositionsRemaining)
            .filter(([, count]) => count < 3)
            .length > 2
          return missingPreferred
        },
        adaptation: () => ({
          floorVsUpside: 55, // Slightly more willing to take upside
        }),
      },
    ],
  },

  aggressive_risk_taker: {
    id: 'aggressive_risk_taker',
    name: 'Aggressive Risk Taker',
    description: 'Reaches for high-upside young talent, ignores ADP in pursuit of ceiling',
    archetypeId: 'chaos_gambler',
    riskLevel: 'aggressive',
    primaryFocus: ['Upside', 'Youth', 'Volatility'],
    baseTendencies: {
      rookieAppetite: 80,
      chaosReach: 60,
      floorVsUpside: 20,
    },
    adaptiveRules: [
      {
        triggerRound: 5,
        condition: (ctx) => {
          // If young talent is running out, increase chaos to find value
          return ctx.elitePositionsRemaining.QB > 2 && ctx.elitePositionsRemaining.DEF > 5
        },
        adaptation: () => ({
          chaosReach: 80, // Wider net for upside plays
        }),
      },
    ],
  },

  win_now_specialist: {
    id: 'win_now_specialist',
    name: 'Win Now Specialist',
    description: 'Maximizes immediate talent, ignores youth and future assets',
    archetypeId: 'win_now_grinder',
    riskLevel: 'moderate',
    primaryFocus: ['Win-Now', 'Established Talent', 'Immediate Impact'],
    baseTendencies: {
      rookieAppetite: 5,
      devyWeight: 0,
      floorVsUpside: 60,
    },
    adaptiveRules: [
      {
        triggerRound: 6,
        condition: (ctx) => {
          // If elite vets running out, might grudgingly accept youth
          return ctx.elitePositionsRemaining.QB < 2 && ctx.elitePositionsRemaining.RB < 2
        },
        adaptation: () => ({
          rookieAppetite: 25, // Slightly more open to rookies
        }),
      },
    ],
  },

  balanced_builder: {
    id: 'balanced_builder',
    name: 'Balanced Builder',
    description: 'Classic snake draft approach balancing value and need',
    archetypeId: 'balanced_builder',
    riskLevel: 'moderate',
    primaryFocus: ['Value', 'Need', 'Tier-Based'],
    baseTendencies: {
      rookieAppetite: 40,
      floorVsUpside: 50,
      chaosReach: 10,
    },
    adaptiveRules: [
      {
        triggerRound: 3,
        condition: (ctx) => {
          // Adjust to league trends as they emerge
          const needyPositions = Object.entries(ctx.rosterCounts)
            .filter(([, count]) => count === 0)
            .length
          return needyPositions > 2
        },
        adaptation: (ctx) => ({
          // Shift weights based on which positions league is ignoring
          rookieAppetite: Math.max(50, Math.min(30, 40 + ctx.round)),
        }),
      },
    ],
  },

  elite_position_hoarder: {
    id: 'elite_position_hoarder',
    name: 'Elite Position Hoarder',
    description: 'Accumulates elite talent at 1-2 positions, controls scarcity',
    archetypeId: 'te_premium_exploiter',
    riskLevel: 'moderate',
    primaryFocus: ['Elite Talent', 'Depth', 'Position Scarcity'],
    baseTendencies: {
      tePremiumWeight: 60,
      chaosReach: 20,
      floorVsUpside: 55,
    },
    adaptiveRules: [
      {
        triggerRound: 4,
        condition: (ctx) => {
          // If target position elite taken, shift to next tier
          return ctx.elitePositionsRemaining.QB < 3
        },
        adaptation: () => ({
          tePremiumWeight: 20, // Pivot away from TE
          rookieAppetite: 45, // Look for different type of asset
        }),
      },
    ],
  },

  zero_rb_specialist: {
    id: 'zero_rb_specialist',
    name: 'Zero-RB Specialist',
    description: 'Skips elite RBs early, stacks WRs/TEs, hunts late-round RB gems',
    archetypeId: 'zero_rb_sharp',
    riskLevel: 'aggressive',
    primaryFocus: ['WR Stack', 'TE Priority', 'Late-Round Gems'],
    baseTendencies: {
      zeroRbWeight: 80,
      heroRbWeight: 0,
      chaosReach: 15,
    },
    adaptiveRules: [
      {
        triggerRound: 6,
        condition: (ctx) => {
          // If we have 0 RBs and most elite RBs taken, become flexible
          return ctx.rosterCounts.RB === 0 && ctx.elitePositionsRemaining.RB < 5
        },
        adaptation: () => ({
          zeroRbWeight: 30, // Shift from 80% to 30% zero-RB conviction
          heroRbWeight: 50, // Now willing to take mid-tier RBs
        }),
      },
    ],
  },

  hero_rb_early: {
    id: 'hero_rb_early',
    name: 'Hero RB Early',
    description: 'Pursues elite RBs early, builds balanced receiver corps later',
    archetypeId: 'hero_rb_drafter',
    riskLevel: 'moderate',
    primaryFocus: ['Elite RB', 'Traditional', 'Balanced'],
    baseTendencies: {
      heroRbWeight: 75,
      zeroRbWeight: 0,
      chaosReach: 5,
    },
    adaptiveRules: [
      {
        triggerRound: 3,
        condition: (ctx) => {
          // If zero-RB dominates league, double down or pivot
          return ctx.rosterCounts.RB === 0 && ctx.pickInRound === 1
        },
        adaptation: () => ({
          heroRbWeight: 85, // Commit harder to RB strategy
          chaosReach: 20, // But accept more variance
        }),
      },
    ],
  },

  chaos_player: {
    id: 'chaos_player',
    name: 'Chaos Player',
    description: 'Unpredictable, semi-random selections with maximum entropy',
    archetypeId: 'chaos_gambler',
    riskLevel: 'aggressive',
    primaryFocus: ['Unpredictable', 'Volatility', 'Chaos'],
    baseTendencies: {
      chaosReach: 90,
      rookieAppetite: 60,
      floorVsUpside: 15,
    },
    adaptiveRules: [
      {
        triggerRound: 5,
        condition: () => true,
        adaptation: (ctx) => ({
          // Drift slightly toward tier leaders but maintain chaos
          chaosReach: Math.max(70, 90 - ctx.round * 3),
        }),
      },
    ],
  },

  dynasty_stacker: {
    id: 'dynasty_stacker',
    name: 'Dynasty Stacker',
    description: 'Emphasizes young talent and future assets over immediate wins',
    archetypeId: 'devy_hoarder',
    riskLevel: 'moderate',
    primaryFocus: ['Youth', 'Future Assets', 'Upside'],
    baseTendencies: {
      rookieAppetite: 75,
      devyWeight: 70,
      floorVsUpside: 30,
    },
    adaptiveRules: [
      {
        triggerRound: 7,
        condition: (ctx) => {
          // Late rounds: balance youth vs win-now based on team needs
          const needsVets = ctx.rosterCounts.QB === 0 || ctx.rosterCounts.TE === 0
          return needsVets
        },
        adaptation: () => ({
          rookieAppetite: 50, // More willing to take proven vets late
          floorVsUpside: 50,
        }),
      },
    ],
  },

  floor_over_ceiling: {
    id: 'floor_over_ceiling',
    name: 'Floor Over Ceiling',
    description: 'Minimizes busts, prefers low-variance proven talent',
    archetypeId: 'risk_averse_floor',
    riskLevel: 'conservative',
    primaryFocus: ['Safety', 'Consistency', 'Minimize Busts'],
    baseTendencies: {
      floorVsUpside: 75,
      rookieAppetite: 15,
      chaosReach: 0,
    },
    adaptiveRules: [
      {
        triggerRound: 5,
        condition: (ctx) => {
          // Slightly flex on tier 2 targets to avoid reaching
          const hasFourPositions = Object.values(ctx.rosterCounts).filter((c) => c > 0).length >= 4
          return hasFourPositions
        },
        adaptation: () => ({
          floorVsUpside: 60, // Slightly more flexible on value
        }),
      },
    ],
  },
}

/**
 * Get random strategy for a new AI team
 */
export function getRandomStrategy(): DraftStrategy {
  const strategies = Object.values(DRAFT_STRATEGIES)
  return strategies[Math.floor(Math.random() * strategies.length)]
}

/**
 * Get strategy by ID
 */
export function getStrategy(strategyId: string): DraftStrategy | undefined {
  return DRAFT_STRATEGIES[strategyId]
}

/**
 * Get all available strategies
 */
export function getAllStrategies(): DraftStrategy[] {
  return Object.values(DRAFT_STRATEGIES)
}

/**
 * Calculate adaptive tendencies for current draft state
 */
export function getAdaptedTendencies(
  strategy: DraftStrategy,
  context: AdaptationContext
): Partial<StrategicTendencies> {
  let adaptedTendencies = { ...strategy.baseTendencies }

  // Apply adaptive rules
  for (const rule of strategy.adaptiveRules) {
    const shouldAdapt = !rule.condition || rule.condition(context)
    if (shouldAdapt && context.round >= rule.triggerRound) {
      const adaptation = rule.adaptation(context)
      adaptedTendencies = { ...adaptedTendencies, ...adaptation }
    }
  }

  return adaptedTendencies
}

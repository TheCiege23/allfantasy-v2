import type { AfPlanId } from '@/lib/tournament/af-premium-plans'
import {
  hasAfCommissionerTier,
  hasAfProTier,
  hasAfSupremeTier,
} from '@/lib/tournament/resolve-af-plan-from-subscription'

/** Premium Survivor Command Center tiles — gating per AF Pro / Commissioner / Supreme. */
export type SurvivorPremiumCommandTileId =
  | 'threat_map'
  | 'social_pulse'
  | 'challenge_outlook'
  | 'jury_projection'
  | 'exile_status'
  | 'minigame_planner'
  | 'risk_alerts'
  | 'host_fairness_radar'
  | 'story_mode_controls'

export type SurvivorPremiumTileGate = {
  tileId: SurvivorPremiumCommandTileId
  title: string
  subtitle: string
  /** Minimum AF tier for the primary lens (player vs commissioner vs full). */
  requiredPlan: 'af_pro' | 'af_commissioner' | 'af_supreme'
  /** If true, tile can consume AF Tokens on deep runs (see catalog). */
  tokenEligible: boolean
}

export const SURVIVOR_PREMIUM_COMMAND_TILES: readonly SurvivorPremiumTileGate[] = [
  {
    tileId: 'threat_map',
    title: 'Threat map',
    subtitle: 'Alliance pressure, public targets, and swing votes.',
    requiredPlan: 'af_pro',
    tokenEligible: true,
  },
  {
    tileId: 'social_pulse',
    title: 'Social pulse',
    subtitle: 'Chat cadence, sentiment hints, and activity health.',
    requiredPlan: 'af_pro',
    tokenEligible: true,
  },
  {
    tileId: 'challenge_outlook',
    title: 'Challenge outlook',
    subtitle: 'Mini-game slate, props, and confidence/parlay risk.',
    requiredPlan: 'af_pro',
    tokenEligible: true,
  },
  {
    tileId: 'jury_projection',
    title: 'Jury projection',
    subtitle: 'Narrative arcs and finale threat — player lens.',
    requiredPlan: 'af_pro',
    tokenEligible: true,
  },
  {
    tileId: 'exile_status',
    title: 'Exile status',
    subtitle: 'Redemption paths, tokens, and return triggers.',
    requiredPlan: 'af_pro',
    tokenEligible: false,
  },
  {
    tileId: 'minigame_planner',
    title: 'Mini-game planner',
    subtitle: 'Weighted randomizer + curated pool for the week.',
    requiredPlan: 'af_commissioner',
    tokenEligible: true,
  },
  {
    tileId: 'risk_alerts',
    title: 'Risk alerts',
    subtitle: 'Collusion, tanking, and inactivity signals (host).',
    requiredPlan: 'af_commissioner',
    tokenEligible: true,
  },
  {
    tileId: 'host_fairness_radar',
    title: 'Fairness radar',
    subtitle: 'Challenge fairness, vote anomalies, host overrides.',
    requiredPlan: 'af_commissioner',
    tokenEligible: true,
  },
  {
    tileId: 'story_mode_controls',
    title: 'Story mode controls',
    subtitle: 'Weekly recap engine + recap tone / spoilers.',
    requiredPlan: 'af_supreme',
    tokenEligible: true,
  },
]

export function canAccessSurvivorPremiumTile(plan: AfPlanId | null, tile: SurvivorPremiumTileGate): boolean {
  if (!plan) return false
  if (tile.requiredPlan === 'af_pro') return hasAfProTier(plan)
  if (tile.requiredPlan === 'af_commissioner') return hasAfCommissionerTier(plan)
  return hasAfSupremeTier(plan)
}

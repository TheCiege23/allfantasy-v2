/**
 * Survivor AI actions → AF Token spend rule codes (`lib/tokens/pricing-matrix.ts`).
 * Costs are 1, 2, or 3 tokens; subscription still required per action (Pro / Commissioner / Supreme).
 */

import type { TokenSpendRuleCode } from '@/lib/tokens/constants'

export type SurvivorAiActionId =
  | 'vote_risk_quick'
  | 'idol_advice_simple'
  | 'minigame_recommendation_one'
  | 'recap_short'
  | 'juror_sentiment_hint'
  | 'confessional_polish'
  | 'weekly_advice_package'
  | 'tribe_analysis_deep'
  | 'challenge_strategy_breakdown'
  | 'jury_management_advice'
  | 'blindside_risk_breakdown'
  | 'idol_timing_breakdown'
  | 'alliance_threat_scan'
  | 'full_episode_recap'
  | 'season_story_package'
  | 'host_vote_processing_assist'
  | 'host_idol_validation_assist'
  | 'host_minigame_grading_assist'
  | 'host_anti_collusion_scan'
  | 'host_fairness_report'
  | 'host_weekly_recap_generator'
  | 'host_story_mode_pack'

export type SurvivorAiActionMeta = {
  id: SurvivorAiActionId
  label: string
  tokenCost: 1 | 2 | 3
  ruleCode: TokenSpendRuleCode
  /** Player-facing vs host/commissioner automation */
  lane: 'player' | 'host'
}

export const SURVIVOR_AI_ACTIONS: readonly SurvivorAiActionMeta[] = [
  { id: 'vote_risk_quick', label: 'Quick vote-risk check', tokenCost: 1, ruleCode: 'survivor_ai_vote_risk_quick', lane: 'player' },
  { id: 'idol_advice_simple', label: 'Simple idol advice', tokenCost: 1, ruleCode: 'survivor_ai_idol_advice_simple', lane: 'player' },
  { id: 'minigame_recommendation_one', label: 'One mini-game recommendation', tokenCost: 1, ruleCode: 'survivor_ai_minigame_one', lane: 'player' },
  { id: 'recap_short', label: 'Short recap', tokenCost: 1, ruleCode: 'survivor_ai_recap_short', lane: 'player' },
  { id: 'juror_sentiment_hint', label: 'Juror sentiment hint', tokenCost: 1, ruleCode: 'survivor_ai_jury_sentiment_hint', lane: 'player' },
  { id: 'confessional_polish', label: 'Confessional polish', tokenCost: 1, ruleCode: 'survivor_ai_confessional_polish', lane: 'player' },
  { id: 'weekly_advice_package', label: 'Weekly Survivor advice package', tokenCost: 2, ruleCode: 'survivor_ai_weekly_advice_pack', lane: 'player' },
  { id: 'tribe_analysis_deep', label: 'Deeper tribe analysis', tokenCost: 2, ruleCode: 'survivor_ai_tribe_analysis_deep', lane: 'player' },
  { id: 'challenge_strategy_breakdown', label: 'Challenge strategy breakdown', tokenCost: 2, ruleCode: 'survivor_ai_challenge_strategy', lane: 'player' },
  { id: 'jury_management_advice', label: 'Jury management advice', tokenCost: 2, ruleCode: 'survivor_ai_jury_management', lane: 'player' },
  { id: 'blindside_risk_breakdown', label: 'Blindside risk breakdown', tokenCost: 2, ruleCode: 'survivor_ai_blindside_risk', lane: 'player' },
  { id: 'idol_timing_breakdown', label: 'Idol timing breakdown', tokenCost: 2, ruleCode: 'survivor_ai_idol_timing', lane: 'player' },
  { id: 'alliance_threat_scan', label: 'Full alliance / threat scan', tokenCost: 3, ruleCode: 'survivor_ai_alliance_threat_scan', lane: 'player' },
  { id: 'full_episode_recap', label: 'Full episode recap', tokenCost: 3, ruleCode: 'survivor_ai_episode_recap_full', lane: 'player' },
  { id: 'season_story_package', label: 'Season-wide story package', tokenCost: 3, ruleCode: 'survivor_ai_season_story_pack', lane: 'player' },
  { id: 'host_vote_processing_assist', label: 'Automated vote processing assist', tokenCost: 2, ruleCode: 'survivor_ai_host_vote_processing', lane: 'host' },
  { id: 'host_idol_validation_assist', label: 'Idol / advantage validation assist', tokenCost: 2, ruleCode: 'survivor_ai_host_idol_validation', lane: 'host' },
  { id: 'host_minigame_grading_assist', label: 'Mini-game grading assist', tokenCost: 2, ruleCode: 'survivor_ai_host_minigame_grade', lane: 'host' },
  { id: 'host_anti_collusion_scan', label: 'Anti-collusion investigation', tokenCost: 3, ruleCode: 'survivor_ai_host_anti_collusion', lane: 'host' },
  { id: 'host_fairness_report', label: 'Commissioner fairness report', tokenCost: 3, ruleCode: 'survivor_ai_host_fairness_report', lane: 'host' },
  { id: 'host_weekly_recap_generator', label: 'Weekly recap generator', tokenCost: 2, ruleCode: 'survivor_ai_host_weekly_recap', lane: 'host' },
  { id: 'host_story_mode_pack', label: 'Story mode control pack', tokenCost: 3, ruleCode: 'survivor_ai_host_story_mode', lane: 'host' },
] as const

const BY_ID = new Map<SurvivorAiActionId, SurvivorAiActionMeta>(
  SURVIVOR_AI_ACTIONS.map((a) => [a.id, a]),
)

export function getSurvivorAiAction(id: SurvivorAiActionId): SurvivorAiActionMeta | undefined {
  return BY_ID.get(id)
}

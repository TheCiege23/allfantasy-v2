/**
 * Resolves full waiver config for a league (processing + FAAB + sport/variant).
 * Used by app waiver/config API and WaiverSettingsPanel.
 */
import { getWaiverProcessingConfigForLeague } from './WaiverProcessingConfigResolver'
import { getFAABConfigForLeague } from './FAABConfigResolver'
import { getEffectiveLeagueWaiverSettings } from '@/lib/waiver-wire'

export interface WaiverConfigForLeague {
  waiver_type: string
  processing_days: number[]
  processing_time_utc: string | null
  claim_limit_per_period: number | null
  game_lock_behavior: string | null
  free_agent_unlock_behavior: string
  continuous_waivers: boolean
  faab_enabled: boolean
  faab_budget: number | null
  faab_reset_rules: string | null
  sport: string
  variant: string | null
  tiebreak_rule: string | null
  instant_fa_after_clear: boolean
}

export async function getWaiverConfigForLeague(leagueId: string): Promise<WaiverConfigForLeague | null> {
  const [processing, faab, effective] = await Promise.all([
    getWaiverProcessingConfigForLeague(leagueId),
    getFAABConfigForLeague(leagueId),
    getEffectiveLeagueWaiverSettings(leagueId),
  ])
  if (!processing) return null
  return {
    waiver_type: processing.waiver_type,
    processing_days: processing.processing_days ?? [],
    processing_time_utc: processing.processing_time_utc,
    claim_limit_per_period: processing.claim_limit_per_period,
    game_lock_behavior: processing.game_lock_behavior,
    free_agent_unlock_behavior: processing.free_agent_unlock_behavior,
    continuous_waivers: processing.continuous_waivers,
    faab_enabled: faab?.faab_enabled ?? false,
    faab_budget: faab?.faab_budget ?? null,
    faab_reset_rules: faab?.faab_reset_rules ?? null,
    sport: processing.sport,
    variant: processing.variant,
    tiebreak_rule: effective?.tiebreakRule ?? null,
    instant_fa_after_clear: effective?.instantFaAfterClear ?? processing.free_agent_unlock_behavior === 'instant',
  }
}

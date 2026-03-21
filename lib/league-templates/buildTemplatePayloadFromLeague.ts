/**
 * Build LeagueTemplatePayload from an existing League (for "Save as template" from league settings).
 */

import type { LeagueTemplatePayload } from './types'
import {
  DEFAULT_DRAFT_SETTINGS,
  DEFAULT_WAIVER_SETTINGS,
  DEFAULT_PLAYOFF_SETTINGS,
  DEFAULT_SCHEDULE_SETTINGS,
  DEFAULT_AI_SETTINGS,
  DEFAULT_AUTOMATION_SETTINGS,
  DEFAULT_PRIVACY_SETTINGS,
} from '@/lib/league-creation-wizard/types'

interface LeagueRow {
  id: string
  name: string | null
  sport: string
  leagueSize: number | null
  leagueVariant: string | null
  scoring: string | null
  isDynasty: boolean
  rosterSize: number | null
  settings: unknown
}

export function buildTemplatePayloadFromLeague(league: LeagueRow): LeagueTemplatePayload {
  const s = (league.settings ?? {}) as Record<string, unknown>
  const playoffStructure =
    s.playoff_structure && typeof s.playoff_structure === 'object'
      ? (s.playoff_structure as Record<string, unknown>)
      : {}
  const leagueType = (s.league_type as string) ?? (league.isDynasty ? 'dynasty' : 'redraft')
  const draftType = (s.draft_type as string) ?? 'snake'

  return {
    sport: league.sport ?? 'NFL',
    leagueType: leagueType as LeagueTemplatePayload['leagueType'],
    draftType: draftType as LeagueTemplatePayload['draftType'],
    name: league.name?.trim() || 'My League',
    teamCount: league.leagueSize ?? 12,
    rosterSize: league.rosterSize ?? null,
    scoringPreset: league.leagueVariant ?? league.scoring ?? null,
    leagueVariant: league.leagueVariant ?? null,
    draftSettings: {
      rounds: (s.draft_rounds as number) ?? DEFAULT_DRAFT_SETTINGS.rounds,
      timerSeconds: (s.draft_timer_seconds as number | null) ?? DEFAULT_DRAFT_SETTINGS.timerSeconds,
      thirdRoundReversal: (s.third_round_reversal as boolean) ?? DEFAULT_DRAFT_SETTINGS.thirdRoundReversal,
      auctionBudgetPerTeam: (s.auction_budget_per_team as number | null) ?? DEFAULT_DRAFT_SETTINGS.auctionBudgetPerTeam,
      keeperMaxKeepers: (s.keeper_max_keepers as number | null) ?? DEFAULT_DRAFT_SETTINGS.keeperMaxKeepers,
      devyRounds: Array.isArray(s.devy_rounds) ? (s.devy_rounds as number[]) : DEFAULT_DRAFT_SETTINGS.devyRounds,
      c2cCollegeRounds: Array.isArray(s.c2c_college_rounds) ? (s.c2c_college_rounds as number[]) : DEFAULT_DRAFT_SETTINGS.c2cCollegeRounds,
    },
    waiverSettings: {
      waiverType: (s.waiver_type as 'faab' | 'rolling' | 'reverse_standings' | 'fcfs' | 'standard') ?? DEFAULT_WAIVER_SETTINGS.waiverType,
      processingDays: Array.isArray(s.waiver_processing_days) ? (s.waiver_processing_days as number[]) : DEFAULT_WAIVER_SETTINGS.processingDays,
      processingTimeUtc: (s.waiver_processing_time_utc as string | null) ?? DEFAULT_WAIVER_SETTINGS.processingTimeUtc,
      faabEnabled: (s.faab_enabled as boolean) ?? DEFAULT_WAIVER_SETTINGS.faabEnabled,
      faabBudget: (s.faab_budget as number | null) ?? DEFAULT_WAIVER_SETTINGS.faabBudget,
      faabResetRules: (s.faab_reset_rules as string | null) ?? DEFAULT_WAIVER_SETTINGS.faabResetRules,
      claimPriorityBehavior: (s.waiver_claim_priority_behavior as string | null) ?? DEFAULT_WAIVER_SETTINGS.claimPriorityBehavior,
      continuousWaiversBehavior: (s.waiver_continuous_waivers_behavior as boolean) ?? DEFAULT_WAIVER_SETTINGS.continuousWaiversBehavior,
      freeAgentUnlockBehavior: (s.waiver_free_agent_unlock_behavior as string | null) ?? DEFAULT_WAIVER_SETTINGS.freeAgentUnlockBehavior,
      gameLockBehavior: (s.waiver_game_lock_behavior as string | null) ?? DEFAULT_WAIVER_SETTINGS.gameLockBehavior,
      dropLockBehavior: (s.waiver_drop_lock_behavior as string | null) ?? DEFAULT_WAIVER_SETTINGS.dropLockBehavior,
      sameDayAddDropRules: (s.waiver_same_day_add_drop_rules as string | null) ?? DEFAULT_WAIVER_SETTINGS.sameDayAddDropRules,
      maxClaimsPerPeriod: (s.waiver_max_claims_per_period as number | null) ?? DEFAULT_WAIVER_SETTINGS.maxClaimsPerPeriod,
    },
    playoffSettings: {
      playoffTeamCount: (s.playoff_team_count as number) ?? (playoffStructure.playoff_team_count as number) ?? DEFAULT_PLAYOFF_SETTINGS.playoffTeamCount,
      playoffWeeks: (playoffStructure.playoff_weeks as number) ?? DEFAULT_PLAYOFF_SETTINGS.playoffWeeks,
      playoffStartWeek: (playoffStructure.playoff_start_week as number | null) ?? DEFAULT_PLAYOFF_SETTINGS.playoffStartWeek,
      seedingRules: (playoffStructure.seeding_rules as string) ?? DEFAULT_PLAYOFF_SETTINGS.seedingRules,
      tiebreakerRules: Array.isArray(playoffStructure.tiebreaker_rules)
        ? (playoffStructure.tiebreaker_rules as string[])
        : DEFAULT_PLAYOFF_SETTINGS.tiebreakerRules,
      byeRules: (playoffStructure.bye_rules as string | null) ?? DEFAULT_PLAYOFF_SETTINGS.byeRules,
      firstRoundByes: (playoffStructure.first_round_byes as number) ?? DEFAULT_PLAYOFF_SETTINGS.firstRoundByes,
      matchupLength: (playoffStructure.matchup_length as number) ?? DEFAULT_PLAYOFF_SETTINGS.matchupLength,
      totalRounds: (playoffStructure.total_rounds as number | null) ?? DEFAULT_PLAYOFF_SETTINGS.totalRounds,
      consolationBracketEnabled:
        (playoffStructure.consolation_bracket_enabled as boolean) ?? DEFAULT_PLAYOFF_SETTINGS.consolationBracketEnabled,
      thirdPlaceGameEnabled:
        (playoffStructure.third_place_game_enabled as boolean) ?? DEFAULT_PLAYOFF_SETTINGS.thirdPlaceGameEnabled,
      toiletBowlEnabled:
        (playoffStructure.toilet_bowl_enabled as boolean) ?? DEFAULT_PLAYOFF_SETTINGS.toiletBowlEnabled,
      championshipLength:
        (playoffStructure.championship_length as number) ?? DEFAULT_PLAYOFF_SETTINGS.championshipLength,
      consolationPlaysFor:
        (playoffStructure.consolation_plays_for as 'pick' | 'none' | 'cash') ?? DEFAULT_PLAYOFF_SETTINGS.consolationPlaysFor,
      reseedBehavior:
        (playoffStructure.reseed_behavior as string) ?? DEFAULT_PLAYOFF_SETTINGS.reseedBehavior,
    },
    scheduleSettings: {
      scheduleUnit:
        (s.schedule_unit as 'week' | 'round' | 'series' | 'slate' | 'scoring_period') ??
        DEFAULT_SCHEDULE_SETTINGS.scheduleUnit,
      regularSeasonLength:
        (s.regular_season_length as number) ?? DEFAULT_SCHEDULE_SETTINGS.regularSeasonLength,
      matchupFrequency:
        (s.matchup_frequency as 'weekly' | 'daily' | 'round' | 'slate') ??
        DEFAULT_SCHEDULE_SETTINGS.matchupFrequency,
      matchupCadence:
        (s.schedule_cadence as 'weekly' | 'daily' | 'round' | 'slate') ??
        DEFAULT_SCHEDULE_SETTINGS.matchupCadence,
      headToHeadOrPointsBehavior:
        (s.schedule_head_to_head_behavior as string) ??
        DEFAULT_SCHEDULE_SETTINGS.headToHeadOrPointsBehavior,
      lockTimeBehavior:
        (s.lock_time_behavior as 'game_time' | 'first_game' | 'slate_lock' | 'manual') ??
        DEFAULT_SCHEDULE_SETTINGS.lockTimeBehavior,
      lockWindowBehavior:
        (s.schedule_lock_window_behavior as string) ?? DEFAULT_SCHEDULE_SETTINGS.lockWindowBehavior,
      scoringPeriodBehavior:
        (s.schedule_scoring_period_behavior as string) ??
        DEFAULT_SCHEDULE_SETTINGS.scoringPeriodBehavior,
      rescheduleHandling:
        (s.schedule_reschedule_handling as string) ?? DEFAULT_SCHEDULE_SETTINGS.rescheduleHandling,
      doubleheaderOrMultiGameHandling:
        (s.schedule_doubleheader_handling as string) ??
        DEFAULT_SCHEDULE_SETTINGS.doubleheaderOrMultiGameHandling,
      playoffTransitionPoint:
        (s.schedule_playoff_transition_point as number | null) ??
        DEFAULT_SCHEDULE_SETTINGS.playoffTransitionPoint,
      scheduleGenerationStrategy:
        (s.schedule_generation_strategy as string) ??
        DEFAULT_SCHEDULE_SETTINGS.scheduleGenerationStrategy,
    },
    aiSettings: {
      aiAdpEnabled: (s.ai_adp_enabled as boolean) ?? DEFAULT_AI_SETTINGS.aiAdpEnabled,
      orphanTeamAiManagerEnabled: (s.orphan_team_ai_manager_enabled as boolean) ?? DEFAULT_AI_SETTINGS.orphanTeamAiManagerEnabled,
      draftHelperEnabled: (s.draft_helper_enabled as boolean) ?? DEFAULT_AI_SETTINGS.draftHelperEnabled,
    },
    automationSettings: {
      draftNotificationsEnabled: (s.draft_notifications_enabled as boolean) ?? DEFAULT_AUTOMATION_SETTINGS.draftNotificationsEnabled,
      autopickFromQueueEnabled: (s.autopick_from_queue_enabled as boolean) ?? DEFAULT_AUTOMATION_SETTINGS.autopickFromQueueEnabled,
      slowDraftRemindersEnabled: (s.slow_draft_reminders_enabled as boolean) ?? DEFAULT_AUTOMATION_SETTINGS.slowDraftRemindersEnabled,
    },
    privacySettings: {
      visibility: (s.visibility as 'private' | 'unlisted' | 'public') ?? DEFAULT_PRIVACY_SETTINGS.visibility,
      allowInviteLink: (s.allow_invite_link as boolean) ?? DEFAULT_PRIVACY_SETTINGS.allowInviteLink,
    },
  }
}

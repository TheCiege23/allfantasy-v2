/**
 * Build LeagueTemplatePayload from an existing League (for "Save as template" from league settings).
 */

import type { LeagueTemplatePayload } from './types'
import {
  DEFAULT_DRAFT_SETTINGS,
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

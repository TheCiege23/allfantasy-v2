/**
 * PROMPT 149 — Onboarding and retention types.
 */

export type OnboardingChecklistTaskId =
  | "select_sports"
  | "choose_tools"
  | "join_or_create_league"
  | "first_ai_action"
  | "referral_share"

export interface OnboardingChecklistTask {
  id: OnboardingChecklistTaskId
  label: string
  description: string
  href: string
  completed: boolean
  ctaLabel: string
}

export interface OnboardingChecklistState {
  tasks: OnboardingChecklistTask[]
  completedCount: number
  totalCount: number
  isFullyComplete: boolean
}

export type OnboardingMilestoneEventType =
  | "onboarding_sport_selection"
  | "onboarding_tool_visit"
  | "onboarding_first_league"
  | "onboarding_first_ai"
  | "onboarding_referral_share"

export interface RetentionNudge {
  id: string
  type: "recap" | "return_nudge" | "unfinished_reminder" | "weekly_summary" | "creator_recommendation" | "sport_season_prompt" | "ai_check_in"
  title: string
  body: string
  href: string
  ctaLabel: string
  sport?: string | null
  meta?: Record<string, unknown>
}

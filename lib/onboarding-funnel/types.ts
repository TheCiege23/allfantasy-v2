/**
 * Onboarding funnel step identifiers.
 * Order: welcome → sport_selection → tool_suggestions → league_prompt → completed
 */
export type OnboardingStepId =
  | "welcome"
  | "sport_selection"
  | "tool_suggestions"
  | "league_prompt"
  | "completed"

export const ONBOARDING_STEPS: OnboardingStepId[] = [
  "welcome",
  "sport_selection",
  "tool_suggestions",
  "league_prompt",
  "completed",
]

export interface OnboardingFunnelState {
  currentStep: OnboardingStepId
  completedAt: Date | null
  isComplete: boolean
}

export interface OnboardingStepProgressPayload {
  step: OnboardingStepId
  /** If true, mark funnel as fully completed (skip or finish). */
  completeFunnel?: boolean
}

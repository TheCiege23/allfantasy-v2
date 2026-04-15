export type ChimmyExplanationStyle =
  | 'concise'
  | 'balanced'
  | 'detailed'
  | 'data-heavy'
  | 'beginner-friendly'
  | 'commissioner-focused'

export type ChimmyRiskPreference = 'floor' | 'balanced' | 'upside'

export type ChimmyLeagueStylePreference =
  | 'redraft-first'
  | 'dynasty-first'
  | 'specialty-league-first'
  | 'c2c-devy-heavy'

export type ChimmyActionPreference =
  | 'quick-one-move'
  | 'top-3-options'
  | 'full-breakdown'

export type ChimmyAlertPreference = 'minimal-alerts' | 'balanced-alerts' | 'aggressive-proactive-alerts'

export type ChimmyStoryContentPreference =
  | 'likes-recaps'
  | 'likes-power-rankings'
  | 'likes-humor'
  | 'likes-serious-analysis'
  | 'no-story-content'

export interface ChimmyPersonalizationExplicitSettings {
  explanationStyle?: ChimmyExplanationStyle
  riskPreference?: ChimmyRiskPreference
  leagueStylePreference?: ChimmyLeagueStylePreference
  actionPreference?: ChimmyActionPreference
  alertPreference?: ChimmyAlertPreference
  storyContentPreferences?: ChimmyStoryContentPreference[]
}

export interface ChimmyPersonalizationInferenceSignals {
  preferredSports: string[]
  preferredLeagueTypes: string[]
  recommendationAcceptRate: number | null
  recommendationRejectRate: number | null
  alertDismissRate: number | null
  alertClickRate: number | null
}

export interface ChimmyPersonalizationInference {
  explanationStyle?: ChimmyExplanationStyle
  riskPreference?: ChimmyRiskPreference
  leagueStylePreference?: ChimmyLeagueStylePreference
  actionPreference?: ChimmyActionPreference
  alertPreference?: ChimmyAlertPreference
  storyContentPreferences?: ChimmyStoryContentPreference[]
  confidence: number
  evidence: string[]
  signals: ChimmyPersonalizationInferenceSignals
}

export interface ChimmyPersonalizationEffectiveProfile {
  explanationStyle: ChimmyExplanationStyle
  riskPreference: ChimmyRiskPreference
  leagueStylePreference: ChimmyLeagueStylePreference
  actionPreference: ChimmyActionPreference
  alertPreference: ChimmyAlertPreference
  storyContentPreferences: ChimmyStoryContentPreference[]
}

export interface ChimmyPersonalizationProfile {
  userId: string
  explicit: ChimmyPersonalizationExplicitSettings
  inferred: ChimmyPersonalizationInference
  effective: ChimmyPersonalizationEffectiveProfile
  sources: {
    explanationStyle: 'explicit' | 'inferred' | 'default'
    riskPreference: 'explicit' | 'inferred' | 'default'
    leagueStylePreference: 'explicit' | 'inferred' | 'default'
    actionPreference: 'explicit' | 'inferred' | 'default'
    alertPreference: 'explicit' | 'inferred' | 'default'
    storyContentPreferences: 'explicit' | 'inferred' | 'default'
  }
  transparency: {
    note: string
    editable: true
    generatedAt: string
  }
}

export interface ChimmyPersonalizationEventInput {
  type:
    | 'recommendation_accepted'
    | 'recommendation_rejected'
    | 'recommendation_saved'
    | 'recommendation_dismissed'
    | 'alert_clicked'
    | 'alert_dismissed'
    | 'story_opened'
    | 'story_hidden'
    | 'surface_opened'
    | 'action_executed'
    | 'recommendation_reopened'
    | 'memory_item_corrected'
    | 'memory_item_ignored'
  metadata?: Record<string, unknown>
}

export const CHIMMY_PERSONALIZATION_DEFAULTS: ChimmyPersonalizationEffectiveProfile = {
  explanationStyle: 'balanced',
  riskPreference: 'balanced',
  leagueStylePreference: 'redraft-first',
  actionPreference: 'top-3-options',
  alertPreference: 'balanced-alerts',
  storyContentPreferences: ['likes-serious-analysis'],
}

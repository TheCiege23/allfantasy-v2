import type { ChimmyPersonalizationProfile } from './types'

export function buildChimmyPromptPersonalizationDirectives(profile: ChimmyPersonalizationProfile): string {
  const p = profile.effective
  const story = p.storyContentPreferences.join(', ')
  return [
    '## CHIMMY PERSONALIZATION (effective profile)',
    `- Explanation style: ${p.explanationStyle}`,
    `- Risk preference: ${p.riskPreference}`,
    `- League style preference: ${p.leagueStylePreference}`,
    `- Action preference: ${p.actionPreference}`,
    `- Alert preference: ${p.alertPreference}`,
    `- Story/content preference: ${story}`,
    '',
    'Apply these as ranking and presentation preferences, not hard constraints.',
    'Always show the strongest recommendation by objective evidence first, then adapt framing and default detail depth.',
  ].join('\n')
}

export function mapAlertPreferenceToSensitivity(
  alertPreference: ChimmyPersonalizationProfile['effective']['alertPreference'],
): 'low' | 'normal' | 'high' {
  if (alertPreference === 'minimal-alerts') return 'low'
  if (alertPreference === 'aggressive-proactive-alerts') return 'high'
  return 'normal'
}

export function normalizeAlertPreferenceForClient(
  alertPreference: ChimmyPersonalizationProfile['effective']['alertPreference'],
): 'minimal' | 'balanced' | 'aggressive' {
  if (alertPreference === 'minimal-alerts') return 'minimal'
  if (alertPreference === 'aggressive-proactive-alerts') return 'aggressive'
  return 'balanced'
}

export function prioritizeDashboardSections(profile: ChimmyPersonalizationProfile): Array<'recommendations' | 'alerts' | 'insights' | 'saved'> {
  const order: Array<'recommendations' | 'alerts' | 'insights' | 'saved'> = ['recommendations', 'alerts', 'insights', 'saved']
  if (profile.effective.alertPreference === 'aggressive-proactive-alerts') {
    return ['alerts', 'recommendations', 'insights', 'saved']
  }
  if (profile.effective.actionPreference === 'quick-one-move') {
    return ['recommendations', 'alerts', 'saved', 'insights']
  }
  return order
}

export function recommendationLimitByActionPreference(profile: ChimmyPersonalizationProfile): number {
  if (profile.effective.actionPreference === 'quick-one-move') return 1
  if (profile.effective.actionPreference === 'top-3-options') return 3
  return 12
}

export function shouldShowStoryContent(profile: ChimmyPersonalizationProfile): boolean {
  return !profile.effective.storyContentPreferences.includes('no-story-content')
}

export function rankRecommendationForProfile(input: {
  confidencePct?: number
  priority?: 'high' | 'medium' | 'low'
  actionType?: string
  profile: ChimmyPersonalizationProfile
}): number {
  const priorityWeight = input.priority === 'high' ? 18 : input.priority === 'medium' ? 11 : 6
  const confidenceWeight = typeof input.confidencePct === 'number' ? Math.max(0, Math.min(100, input.confidencePct)) : 50
  const actionType = (input.actionType ?? '').toLowerCase()

  let riskFit = 0
  if (input.profile.effective.riskPreference === 'upside') {
    if (actionType.includes('trade') || actionType.includes('lineup')) riskFit += 10
  } else if (input.profile.effective.riskPreference === 'floor') {
    if (actionType.includes('waiver') || actionType.includes('lineup')) riskFit += 10
  } else {
    riskFit += 6
  }

  return priorityWeight + confidenceWeight + riskFit
}

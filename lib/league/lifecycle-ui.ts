/**
 * Client-safe helpers for lifecycle-aware labels and disabled explanations (no server imports).
 */

import type { LeagueLifecycleSnapshot } from '@/components/league/types'

const STATE_LABELS: Record<string, string> = {
  setup: 'Setup',
  pre_draft: 'Pre-draft',
  drafting: 'Drafting',
  post_draft: 'Post-draft',
  in_season: 'In season',
  playoffs: 'Playoffs',
  completed: 'Completed',
  archived: 'Archived',
}

export function formatLifecycleStateLabel(state: string): string {
  return (
    STATE_LABELS[state] ??
    state
      .split('_')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ')
  )
}

/** Commissioner / system actions keyed like `LeagueLifecycleAction`. */
export function isLifecycleActionAllowedForUi(
  snapshot: LeagueLifecycleSnapshot | undefined,
  action: string,
  isElevated: boolean,
): boolean {
  if (!snapshot) return false
  if (snapshot.emergencyPaused && !isElevated && action !== 'standings_view') {
    return false
  }
  if (
    snapshot.locked &&
    !isElevated &&
    action !== 'standings_view' &&
    action !== 'settings_edit_commissioner'
  ) {
    return false
  }
  return snapshot.allowedActions.includes(action)
}

export function explainLifecycleUiBlock(
  snapshot: LeagueLifecycleSnapshot | undefined,
  action: string,
  isElevated: boolean,
): string | null {
  if (!snapshot) return 'League status unavailable.'
  if (snapshot.emergencyPaused && !isElevated && action !== 'standings_view') {
    return 'Emergency pause is active — only commissioners can perform this action.'
  }
  if (
    snapshot.locked &&
    !isElevated &&
    action !== 'standings_view' &&
    action !== 'settings_edit_commissioner'
  ) {
    return 'League is locked — use commissioner tools or unlock first.'
  }
  if (!snapshot.allowedActions.includes(action)) {
    return `Not available in ${formatLifecycleStateLabel(snapshot.state)} (${action.replace(/_/g, ' ')})`
  }
  return null
}

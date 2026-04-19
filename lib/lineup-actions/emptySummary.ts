import type { LineupActionSummaryPayload } from '@/lib/lineup-actions/types'

export function emptyLineupActionSummary(): LineupActionSummaryPayload {
  const lastUpdatedAt = new Date().toISOString()
  return {
    totalIssues: 0,
    totalUnresolvedSlotActions: 0,
    scanWarningLeagues: 0,
    leaguesNeedingAttention: 0,
    lineupsNeedingAttention: 0,
    urgentLineupActions: 0,
    lockedMissedActions: 0,
    displayMode: 'unresolved_slots',
    displayCount: 0,
    displayLabelKey: 'dashboard.today.lineupsGoodShort',
    displayLabelParams: {},
    displaySubtextKey: null,
    displaySubtextParams: null,
    urgentSubtextKey: null,
    urgentSubtextParams: null,
    actions: [],
    leagues: [],
    scannedLeagues: 0,
    scannedSleeperLeagues: 0,
    scannedNativeLeagues: 0,
    lastUpdatedAt,
  }
}

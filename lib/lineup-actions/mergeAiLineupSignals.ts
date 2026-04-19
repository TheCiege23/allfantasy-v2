import type { LineupActionItem } from '@/lib/lineup-actions/types'
import type { LineupsActionThresholds } from '@/lib/lineup-actions/thresholds'
import { fetchMatchupPrepLineupSignalsForUser } from '@/lib/lineup-actions/matchupPrepLineupSignals'
import { fetchAiStartSitLineupSignalsForUser } from '@/lib/lineup-actions/aiStartSitLineupSignals'

/**
 * Merges grounded AI tool outputs into Today Actions. Matchup Prep signals are
 * computed from live projections + opponent resolution (see `runMatchupPrepDashboard`).
 * Start/Sit signals emit only high-urgency same-slot close calls (gated by env flag).
 */
export async function mergeAiLineupSignals(
  userId: string,
  thresholds: LineupsActionThresholds,
): Promise<LineupActionItem[]> {
  const [matchup, startSit] = await Promise.all([
    fetchMatchupPrepLineupSignalsForUser(userId, thresholds),
    fetchAiStartSitLineupSignalsForUser(userId, thresholds),
  ])
  return [...matchup, ...startSit]
}

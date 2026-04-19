import type { LineupActionItem } from '@/lib/lineup-actions/types'
import type { LineupsActionThresholds } from '@/lib/lineup-actions/thresholds'
import { fetchMatchupPrepLineupSignalsForUser } from '@/lib/lineup-actions/matchupPrepLineupSignals'
import { fetchAiStartSitLineupSignalsForUser } from '@/lib/lineup-actions/aiStartSitLineupSignals'
import { fetchAiWaiverLineupSignalsForUser } from '@/lib/lineup-actions/aiWaiverLineupSignals'

/**
 * Merges grounded AI tool outputs into Today Actions. Matchup Prep signals are
 * computed from live projections + opponent resolution. Start/Sit signals emit
 * high-urgency same-slot close calls. Waiver signals emit must-add / strong-add
 * picks at critical/high urgency. All gated by env flags.
 */
export async function mergeAiLineupSignals(
  userId: string,
  thresholds: LineupsActionThresholds,
): Promise<LineupActionItem[]> {
  const [matchup, startSit, waiver] = await Promise.all([
    fetchMatchupPrepLineupSignalsForUser(userId, thresholds),
    fetchAiStartSitLineupSignalsForUser(userId, thresholds),
    fetchAiWaiverLineupSignalsForUser(userId, thresholds),
  ])
  return [...matchup, ...startSit, ...waiver]
}

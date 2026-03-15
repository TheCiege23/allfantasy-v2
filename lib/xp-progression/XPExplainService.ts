/**
 * XPExplainService — build "How did I earn this XP?" narrative from profile + events.
 */

import { getProfileByManagerId, getEventsByManagerId } from './ManagerXPQueryService'
import { XP_VALUES } from './types'

const EVENT_LABELS: Record<string, string> = {
  win_matchup: 'Matchup wins',
  make_playoffs: 'Playoff appearances',
  championship: 'Championships',
  successful_trade: 'Successful trades',
  season_completion: 'Seasons completed',
  draft_accuracy: 'Draft accuracy',
  league_participation: 'League participation',
  commissioner_service: 'Commissioner service',
}

export interface XPExplainResult {
  narrative: string
  totalXP: number
  currentTier: string
  eventSummary: { eventType: string; label: string; count: number; totalXP: number }[]
}

export async function explainXPForManager(managerId: string): Promise<XPExplainResult> {
  const [profile, events] = await Promise.all([
    getProfileByManagerId(managerId),
    getEventsByManagerId(managerId, { limit: 500 }),
  ])

  const totalXP = profile?.totalXP ?? 0
  const currentTier = profile?.currentTier ?? 'Bronze GM'

  const byType = new Map<string, { count: number; totalXP: number }>()
  for (const e of events) {
    const cur = byType.get(e.eventType) ?? { count: 0, totalXP: 0 }
    cur.count += 1
    cur.totalXP += e.xpValue
    byType.set(e.eventType, cur)
  }

  const eventSummary = Array.from(byType.entries())
    .map(([eventType, { count, totalXP: xp }]) => ({
      eventType,
      label: EVENT_LABELS[eventType] ?? eventType,
      count,
      totalXP: xp,
    }))
    .sort((a, b) => b.totalXP - a.totalXP)

  const parts: string[] = []
  parts.push(
    `Career XP: ${totalXP} total. Tier: ${currentTier}.`
  )
  if (eventSummary.length > 0) {
    parts.push(
      'Breakdown: ' +
        eventSummary
          .map((s) => `${s.label} (${s.count}×, +${s.totalXP} XP)`)
          .join('; ')
    )
  } else {
    parts.push(
      'No XP events yet. Run the XP engine from the Career tab to compute XP from matchup wins, playoffs, championships, and season completions.'
    )
  }

  return {
    narrative: parts.join(' '),
    totalXP,
    currentTier,
    eventSummary,
  }
}

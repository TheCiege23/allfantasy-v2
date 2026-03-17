import { prisma } from "@/lib/prisma"
import type { EngagementEventType, EngagementEventMeta } from "./types"

/**
 * Tracks app user engagement events for retention analytics and weekly recaps.
 */
export async function recordEngagementEvent(
  userId: string,
  eventType: EngagementEventType,
  meta?: EngagementEventMeta
): Promise<boolean> {
  try {
    await (prisma as any).engagementEvent.create({
      data: {
        userId,
        eventType,
        meta: meta ?? undefined,
      },
    })
    return true
  } catch (e) {
    console.error("[UserActivityTracker] recordEngagementEvent error:", e)
    return false
  }
}

export interface ActivitySummary {
  leagueViews: number
  bracketViews: number
  aiUses: number
  lastActiveAt: Date | null
}

/**
 * Aggregate activity for a user since a given date (e.g. last 7 days for weekly recap).
 */
export async function getActivitySummary(
  userId: string,
  since: Date
): Promise<ActivitySummary> {
  const events = await (prisma as any).engagementEvent.findMany({
    where: { userId, createdAt: { gte: since } },
    select: { eventType: true, createdAt: true },
  }).catch(() => [])

  let leagueViews = 0
  let bracketViews = 0
  let aiUses = 0
  let lastActiveAt: Date | null = null

  for (const e of events) {
    if (e.createdAt && (!lastActiveAt || new Date(e.createdAt) > lastActiveAt)) {
      lastActiveAt = new Date(e.createdAt)
    }
    switch (e.eventType) {
      case "league_view":
        leagueViews++
        break
      case "bracket_view":
        bracketViews++
        break
      case "ai_used":
      case "trade_analyzer":
      case "mock_draft":
      case "waiver_ai":
      case "chimmy_chat":
        aiUses++
        break
      default:
        break
    }
  }

  return { leagueViews, bracketViews, aiUses, lastActiveAt }
}

/**
 * Count distinct days with any activity in the last N days.
 */
export async function getActiveDaysCount(userId: string, lastDays: number): Promise<number> {
  const since = new Date()
  since.setDate(since.getDate() - lastDays)
  const events = await (prisma as any).engagementEvent.findMany({
    where: { userId, createdAt: { gte: since } },
    select: { createdAt: true },
  }).catch(() => [])

  const days = new Set<string>()
  for (const e of events) {
    if (e.createdAt) {
      const d = new Date(e.createdAt)
      days.add(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`)
    }
  }
  return days.size
}

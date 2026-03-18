/**
 * Hooks called after waiver processing: activity feed, league chat, player trend signals, and notifications.
 */

import { prisma } from "@/lib/prisma"
import { createSystemMessage } from "@/lib/platform/chat-service"
import { recordTrendSignalsAndUpdate } from "@/lib/player-trend"
import { getLeagueMemberAppUserIds } from "@/lib/draft-notifications/DraftNotificationService"
import { dispatchNotification } from "@/lib/notifications/NotificationDispatcher"
import { handleInvalidationTrigger } from "@/lib/trade-engine/caching"
import type { ProcessedClaimResult } from "./types"

/** Called after processWaiverClaimsForLeague; posts to activity feed and league chat when configured. */
export async function onWaiverRunComplete(
  leagueId: string,
  results: ProcessedClaimResult[]
): Promise<void> {
  handleInvalidationTrigger("waiver_processed", leagueId)

  const awarded = results.filter((r) => r.success).length
  const message =
    awarded === 0
      ? "Waivers processed. No claims awarded."
      : `Waivers processed. ${awarded} claim${awarded === 1 ? "" : "s"} awarded.`

  try {
    const memberIds = await getLeagueMemberAppUserIds(leagueId)
    if (memberIds.length > 0) {
      const league = await (prisma as any).league.findUnique({
        where: { id: leagueId },
        select: { name: true },
      })
      const leagueName = league?.name ? ` — ${league.name}` : ""
      dispatchNotification({
        userIds: memberIds,
        category: "waiver_processing",
        productType: "app",
        type: "waiver_processed",
        title: `Waivers processed${leagueName}`,
        body: message,
        actionHref: `/app/league/${leagueId}`,
        actionLabel: "Open league",
        meta: { leagueId, awarded, total: results.length },
        severity: "medium",
      }).catch((e) => console.error("[waiver run] notify", e))
    }
  } catch {
    // non-fatal
  }

  try {
    await (prisma as any).activityEvent.create({
      data: {
        leagueId,
        type: "waiver",
        message,
        metadata: { awarded, total: results.length },
      },
    })
  } catch {
    // non-fatal
  }

  try {
    const league = await (prisma as any).league.findUnique({
      where: { id: leagueId },
      select: { settings: true, sport: true },
    })
    const settings = (league?.settings as Record<string, unknown>) || {}
    const threadId = settings.leagueChatThreadId as string | undefined
    if (threadId && typeof threadId === "string") {
      await createSystemMessage(threadId, "waiver_bot", message).catch(() => {})
    }

    // Player Trend Detection: record waiver_add / waiver_drop for processed claims
    const sport = league?.sport != null ? String(league.sport) : "NFL"
    const events: Array<{ playerId: string; sport: string; signalType: string; leagueId?: string }> = []
    for (const r of results) {
      if (r.success && r.addPlayerId) {
        events.push({ playerId: r.addPlayerId, sport, signalType: "waiver_add", leagueId: leagueId })
      }
      if (r.success && r.dropPlayerId) {
        events.push({ playerId: r.dropPlayerId, sport, signalType: "waiver_drop", leagueId: leagueId })
      }
    }
    if (events.length > 0) {
      recordTrendSignalsAndUpdate(events).catch(() => {})
    }
  } catch {
    // non-fatal
  }
}

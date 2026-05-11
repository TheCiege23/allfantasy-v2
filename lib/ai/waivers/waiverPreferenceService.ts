/**
 * Waiver Preference Service — lightweight preference learning foundation.
 *
 * Records:
 * - user viewed recommendations (viewed event)
 * - accepted / ignored recommendation (if UI/event exists)
 * - reads prior user add/drop behavior from WaiverClaim history
 *
 * Returns preference hints for the recommendation service.
 *
 * Phase 1 — view/accept/ignore tracking only. Does NOT submit claims automatically.
 */

import { prisma } from "@/lib/prisma"

export type WaiverPreferenceEvent =
  | { type: "viewed"; userId: string; leagueId: string; addPlayerId: string }
  | { type: "accepted"; userId: string; leagueId: string; addPlayerId: string; claimId?: string }
  | { type: "ignored"; userId: string; leagueId: string; addPlayerId: string }

/**
 * Records a waiver preference event (view/accept/ignore).
 * Stored in NotificationOutbox metadata as a lightweight event log until a dedicated table is added.
 * No-throws — preference recording should never break a recommendation request.
 */
export async function recordWaiverPreferenceEvent(
  event: WaiverPreferenceEvent
): Promise<void> {
  try {
    await prisma.notificationOutbox.create({
      data: {
        userId: event.userId,
        leagueId: event.leagueId,
        channel: "in_app",
        eventType: "WAIVER_PREFERENCE_EVENT",
        title: `Waiver preference: ${event.type}`,
        body: `User ${event.type} add of player ${event.addPlayerId}`,
        status: "pending",
        metadata: {
          type: event.type,
          addPlayerId: event.addPlayerId,
          claimId: event.type === "accepted" ? (event.claimId ?? null) : null,
          recordedAt: new Date().toISOString(),
        },
      },
    })
  } catch {
    // Silent — preference recording is best-effort
  }
}

/**
 * Returns player IDs the user has previously added via waiver claims (accepted / historical preferences).
 * Used by the recommendation service to tag "matches_preference" on suggestions.
 * No-throws — returns [] on failure.
 */
export async function getWaiverPreferenceHints(
  userId: string,
  leagueId: string
): Promise<string[]> {
  try {
    // Look up roster for this user
    const roster = await prisma.roster.findFirst({
      where: { leagueId, platformUserId: userId },
      select: { id: true },
    })
    if (!roster) return []

    // Historical successful claims
    const priorClaims = await prisma.waiverClaim.findMany({
      where: {
        leagueId,
        rosterId: roster.id,
        status: "processed",
      },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: { addPlayerId: true },
    })

    return [...new Set(priorClaims.map((c) => c.addPlayerId))]
  } catch {
    return []
  }
}

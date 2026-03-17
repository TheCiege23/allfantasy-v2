/**
 * Server-side discovery analytics: orphan team adoption.
 */

import { prisma } from "@/lib/prisma"
import { DISCOVERY_EVENTS } from "./index"
import type { DiscoveryOrphanAdoptionMeta } from "./index"

/**
 * Track when a user adopts an orphan team (takes over a roster that was orphan).
 * Call after updating Roster.platformUserId from orphan-* to the user's id.
 */
export async function trackDiscoveryOrphanAdoption(
  meta: DiscoveryOrphanAdoptionMeta,
  options?: { commissionerId?: string }
): Promise<void> {
  try {
    await prisma.analyticsEvent.create({
      data: {
        event: DISCOVERY_EVENTS.ORPHAN_ADOPTION,
        path: null,
        referrer: null,
        userAgent: null,
        sessionId: null,
        userId: meta.userId, // adopter (new roster owner)
        toolKey: null,
        meta: {
          leagueId: meta.leagueId,
          rosterId: meta.rosterId,
          userId: meta.userId,
          commissionerId: options?.commissionerId ?? null,
        },
      },
    })
  } catch {
    // non-fatal
  }
}

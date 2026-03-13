/**
 * Hooks called after waiver processing: activity feed and league chat.
 */

import { prisma } from "@/lib/prisma"
import { createSystemMessage } from "@/lib/platform/chat-service"
import type { ProcessedClaimResult } from "./types"

/** Called after processWaiverClaimsForLeague; posts to activity feed and league chat when configured. */
export async function onWaiverRunComplete(
  leagueId: string,
  results: ProcessedClaimResult[]
): Promise<void> {
  const awarded = results.filter((r) => r.success).length
  const message =
    awarded === 0
      ? "Waivers processed. No claims awarded."
      : `Waivers processed. ${awarded} claim${awarded === 1 ? "" : "s"} awarded.`

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
      select: { settings: true },
    })
    const settings = (league?.settings as Record<string, unknown>) || {}
    const threadId = settings.leagueChatThreadId as string | undefined
    if (threadId && typeof threadId === "string") {
      await createSystemMessage(threadId, "waiver_bot", message).catch(() => {})
    }
  } catch {
    // non-fatal
  }
}

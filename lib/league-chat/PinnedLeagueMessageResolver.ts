/**
 * PinnedLeagueMessageResolver — display text and referenced message for pinned items.
 * Pinned items are messages with messageType "pin" and body JSON { messageId, snippet? }.
 */

import type { PlatformChatMessage } from "@/types/platform-shared"
import { getPinReferencedMessageId } from "./LeagueSystemNoticeRenderer"

export function getPinnedDisplayBody(msg: PlatformChatMessage): string {
  const body = msg.body || ""
  try {
    const parsed = JSON.parse(body)
    if (parsed.snippet && typeof parsed.snippet === "string") return parsed.snippet
    if (parsed.messageId) return "Pinned message"
  } catch {
    // use body as-is
  }
  return body || "Pinned message"
}

export function getReferencedMessageIdFromPin(pinMessage: PlatformChatMessage): string | null {
  return getPinReferencedMessageId(pinMessage.body || "")
}

/**
 * Server-only: fetch bracket league messages and map to platform message shape.
 * Used by shared chat API when threadId is "league:leagueId".
 */

import type { PlatformChatMessage } from "@/types/platform-shared"

interface BracketMessageRow {
  id: string
  message: string
  type?: string
  createdAt: Date | string
  user?: {
    id: string
    displayName?: string | null
    email?: string | null
    avatarUrl?: string | null
    profile?: { avatarPreset?: string | null } | null
  }
}

export function bracketMessagesToPlatform(
  rows: BracketMessageRow[],
  threadId: string
): PlatformChatMessage[] {
  return rows.map((m) => ({
    id: m.id,
    threadId,
    senderUserId: m.user?.id ?? null,
    senderName: m.user?.displayName || m.user?.email || "User",
    senderAvatarUrl: m.user?.avatarUrl ?? null,
    senderAvatarPreset: m.user?.profile?.avatarPreset ?? null,
    messageType: m.type || "text",
    body: m.message || "",
    createdAt: typeof m.createdAt === "string" ? m.createdAt : new Date(m.createdAt).toISOString(),
  }))
}

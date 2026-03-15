/**
 * LeagueSystemNoticeRenderer — detect and label system/commissioner message types.
 * Used by message list to render broadcast, stats_bot, pin distinctly from normal messages.
 */

export const LEAGUE_SYSTEM_MESSAGE_TYPES = ["broadcast", "stats_bot", "pin", "system"] as const
export type LeagueSystemMessageType = (typeof LEAGUE_SYSTEM_MESSAGE_TYPES)[number]

export function isLeagueSystemNotice(messageType: string): messageType is LeagueSystemMessageType {
  return LEAGUE_SYSTEM_MESSAGE_TYPES.includes(messageType as LeagueSystemMessageType)
}

export function getLeagueSystemNoticeLabel(messageType: string): string {
  switch (messageType) {
    case "broadcast":
      return "Commissioner"
    case "stats_bot":
      return "Chat Stats Bot"
    case "pin":
      return "Pinned"
    case "system":
      return "System"
    default:
      return "Notice"
  }
}

/** Parse broadcast message body (JSON { announcement } or plain text). */
export function getBroadcastBody(body: string): string {
  try {
    const parsed = JSON.parse(body || "{}")
    if (typeof parsed.announcement === "string") return parsed.announcement
  } catch {
    // fallback
  }
  return body || ""
}

/** Parse stats_bot message body (JSON with weekLabel, bestTeam, etc.). */
export function getStatsBotPayload(body: string): {
  weekLabel?: string
  bestTeam?: string
  worstTeam?: string
  bestPlayer?: string
  winStreak?: string
  lossStreak?: string
} | null {
  try {
    const parsed = JSON.parse(body || "{}")
    if (parsed && typeof parsed === "object") return parsed
  } catch {
    // ignore
  }
  return null
}

/** Parse pin message body (JSON { messageId } or { messageId, snippet }). */
export function getPinReferencedMessageId(body: string): string | null {
  try {
    const parsed = JSON.parse(body || "{}")
    if (typeof parsed.messageId === "string") return parsed.messageId
  } catch {
    // ignore
  }
  return null
}

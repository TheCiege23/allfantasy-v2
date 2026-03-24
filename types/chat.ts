import type { PlatformChatMessage, PlatformChatThread } from "./platform-shared"

export type ChatTabId = "league" | "dm" | "ai"

export type ChatMessageType =
  | "text"
  | "gif"
  | "image"
  | "video"
  | "meme"
  | "poll"
  | "broadcast"
  | "stats_bot"
  | "pin"
  | "system"
  | "waiver_bot"
  | "commissioner_notice"
  | "trade_notice"
  | "waiver_notice"
  | "trade_accepted"

export type ChatAttachment = {
  type: "gif" | "image" | "video" | "meme"
  url: string
  thumbnailUrl?: string
  width?: number
  height?: number
}

export type ChatReaction = {
  emoji: string
  count: number
  reactedByMe?: boolean
  userIds?: string[]
}

export type ChatMessageMetadata = {
  attachments?: ChatAttachment[]
  reactions?: ChatReaction[]
  pinned?: boolean
  pinnedAt?: string
  pinnedByUserId?: string
  mentionedUserIds?: string[]
  mentionedUsernames?: string[]
  poll?: {
    question: string
    options: { id: string; label: string; votes: number }[]
    expiresAt?: string
  }
  lastSeenAt?: string
  systemMeta?: string
}

export type ChatMessageWithMeta = PlatformChatMessage & {
  metadata?: ChatMessageMetadata
}

export type LeagueChatThread = PlatformChatThread & {
  context?: { leagueId?: string }
}

export type ChatStatsBotUpdate = {
  id: string
  type: "stats_bot"
  leagueId: string
  weekLabel: string
  bestTeam: string
  worstTeam: string
  bestPlayer: string
  winStreak: string
  lossStreak: string
  createdAt: string
}

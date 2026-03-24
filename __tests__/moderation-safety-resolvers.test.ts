import { describe, expect, it } from "vitest"
import type { PlatformChatThread } from "@/types/platform-shared"
import {
  isBlockedDirectConversation,
  getBlockedConversationNotice,
  getBlockedVisibilityNotice,
} from "@/lib/moderation"

describe("moderation safety resolvers", () => {
  it("detects blocked direct conversation by DM participant", () => {
    const thread: PlatformChatThread = {
      id: "thread-1",
      threadType: "dm",
      productType: "shared",
      title: "DM",
      lastMessageAt: new Date().toISOString(),
      unreadCount: 0,
      memberCount: 2,
      context: { otherUserId: "user-2" },
    }
    expect(isBlockedDirectConversation(thread, new Set(["user-2"]))).toBe(true)
    expect(isBlockedDirectConversation(thread, new Set(["user-3"]))).toBe(false)
  })

  it("does not mark group conversation as blocked direct conversation", () => {
    const thread: PlatformChatThread = {
      id: "group-1",
      threadType: "group",
      productType: "shared",
      title: "Group",
      lastMessageAt: new Date().toISOString(),
      unreadCount: 0,
      memberCount: 4,
      context: { otherUserId: "user-2" },
    }
    expect(isBlockedDirectConversation(thread, new Set(["user-2"]))).toBe(false)
  })

  it("builds blocked and hidden visibility notices", () => {
    expect(getBlockedConversationNotice("Jordan")).toContain("Jordan")
    expect(getBlockedVisibilityNotice(0)).toBe("")
    expect(getBlockedVisibilityNotice(1)).toContain("one blocked user")
    expect(getBlockedVisibilityNotice(3)).toContain("3 blocked users")
  })
})

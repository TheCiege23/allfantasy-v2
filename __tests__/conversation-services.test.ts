import { describe, expect, it } from "vitest"
import {
  getConversationDisplayTitle,
  getConversationPreview,
  getUnreadBadgeLabel,
  getUnreadCount,
  hasUnread,
  parseParticipantUsernames,
} from "@/lib/conversations"
import type { PlatformChatThread } from "@/types/platform-shared"

function makeThread(partial: Partial<PlatformChatThread>): PlatformChatThread {
  return {
    id: "t1",
    threadType: "dm",
    productType: "shared",
    title: "",
    lastMessageAt: new Date().toISOString(),
    unreadCount: 0,
    memberCount: 2,
    context: {},
    ...partial,
  }
}

describe("conversation services", () => {
  it("parses participant usernames safely", () => {
    expect(parseParticipantUsernames(" @alex, @jordan  taylor ")).toEqual(["alex", "jordan", "taylor"])
    expect(parseParticipantUsernames("")).toEqual([])
  })

  it("resolves DM title and preview from context", () => {
    const thread = makeThread({
      threadType: "dm",
      title: "",
      context: { otherDisplayName: "Alex", lastMessagePreview: "See you at waivers" },
    })
    expect(getConversationDisplayTitle(thread)).toBe("Alex")
    expect(getConversationPreview(thread)).toBe("See you at waivers")
  })

  it("computes unread badge labels", () => {
    const thread = makeThread({ unreadCount: 103 })
    expect(getUnreadCount(thread)).toBe(103)
    expect(hasUnread(thread)).toBe(true)
    expect(getUnreadBadgeLabel(getUnreadCount(thread))).toBe("99+")
    expect(getUnreadBadgeLabel(0)).toBe("")
  })
})

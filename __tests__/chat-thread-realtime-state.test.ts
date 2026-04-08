import { describe, expect, it } from "vitest"
import {
  getThreadTypingState,
  getVirtualThreadReadReceipts,
  markVirtualThreadRead,
  setThreadTypingState,
} from "../lib/chat-core/ThreadRealtimeState"

describe("chat thread realtime state", () => {
  it("tracks typing users and excludes caller", () => {
    const threadId = `thread-${Date.now()}`
    setThreadTypingState({
      threadId,
      userId: "u1",
      username: "alpha",
      displayName: "Alpha",
      isTyping: true,
      ttlMs: 5_000,
    })
    setThreadTypingState({
      threadId,
      userId: "u2",
      username: "beta",
      displayName: "Beta",
      isTyping: true,
      ttlMs: 5_000,
    })

    const list = getThreadTypingState(threadId)
    expect(list.map((entry: { userId: string }) => entry.userId).sort()).toEqual(["u1", "u2"])

    const excludingU1 = getThreadTypingState(threadId, "u1")
    expect(excludingU1.map((entry: { userId: string }) => entry.userId)).toEqual(["u2"])
  })

  it("records virtual read receipts per thread", () => {
    const threadId = `league:${Date.now()}`
    markVirtualThreadRead(threadId, "u1", new Date("2026-04-08T00:00:00.000Z"))
    markVirtualThreadRead(threadId, "u2", new Date("2026-04-08T00:00:01.000Z"))

    const receipts = getVirtualThreadReadReceipts(threadId)
    expect(receipts).toHaveLength(2)
    expect(receipts.find((entry: { userId: string }) => entry.userId === "u1")?.lastReadAt).toBe(
      "2026-04-08T00:00:00.000Z"
    )
  })
})

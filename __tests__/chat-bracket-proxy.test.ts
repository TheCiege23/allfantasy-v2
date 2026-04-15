import { describe, expect, it } from "vitest"
import { bracketMessagesToPlatform } from "@/lib/chat-core/league-message-proxy"

describe("chat bracket proxy", () => {
  it("maps reply and attachment metadata for bracket messages", () => {
    const messages = bracketMessagesToPlatform(
      [
        {
          id: "m1",
          message: "hello",
          type: "image",
          imageUrl: "https://cdn.example/image.png",
          replyToId: "parent-1",
          createdAt: new Date("2026-04-08T00:00:00.000Z"),
          metadata: { foo: "bar" },
          user: { id: "u1", displayName: "Alpha" },
        },
      ],
      "league:123"
    )

    expect(messages).toHaveLength(1)
    expect(messages[0].parentMessageId).toBe("parent-1")
    expect(messages[0].messageType).toBe("image")
    expect((messages[0].metadata as Record<string, unknown>).imageUrl).toBe("https://cdn.example/image.png")
  })

  it("renders deleted placeholder when deletedAt exists", () => {
    const messages = bracketMessagesToPlatform(
      [
        {
          id: "m2",
          message: "original text",
          type: "text",
          createdAt: new Date("2026-04-08T00:00:00.000Z"),
          metadata: { deletedAt: "2026-04-08T00:01:00.000Z" },
          user: { id: "u2", displayName: "Beta" },
        },
      ],
      "league:123"
    )

    expect(messages[0].body).toBe("[message deleted]")
  })
})

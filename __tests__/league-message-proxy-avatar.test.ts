import { describe, expect, it } from "vitest"
import { bracketMessagesToPlatform } from "@/lib/chat-core/league-message-proxy"

describe("league message proxy avatar mapping", () => {
  it("maps sender avatar url and preset into platform messages", () => {
    const out = bracketMessagesToPlatform(
      [
        {
          id: "m1",
          message: "hello",
          type: "text",
          createdAt: new Date("2026-03-22T10:00:00.000Z"),
          user: {
            id: "u1",
            displayName: "Alex",
            email: "alex@example.com",
            avatarUrl: "/uploads/avatars/a.png",
            profile: { avatarPreset: "trophy" },
          },
        },
      ],
      "league:l1"
    )

    expect(out).toHaveLength(1)
    expect(out[0]).toMatchObject({
      senderName: "Alex",
      senderAvatarUrl: "/uploads/avatars/a.png",
      senderAvatarPreset: "trophy",
    })
  })

  it("maps bracket reactions into unified metadata shape", () => {
    const out = bracketMessagesToPlatform(
      [
        {
          id: "m2",
          message: "react to this",
          type: "text",
          createdAt: new Date("2026-03-22T10:01:00.000Z"),
          metadata: { custom: "value" },
          reactions: [
            { emoji: "🔥", userId: "u1" },
            { emoji: "🔥", userId: "u2" },
            { emoji: "😂", userId: "u1" },
          ],
          user: {
            id: "u3",
            displayName: "Casey",
          },
        },
      ],
      "league:l1"
    )

    expect(out).toHaveLength(1)
    expect(out[0]?.metadata).toMatchObject({
      custom: "value",
      reactions: [
        { emoji: "🔥", count: 2, userIds: ["u1", "u2"] },
        { emoji: "😂", count: 1, userIds: ["u1"] },
      ],
    })
  })
})
